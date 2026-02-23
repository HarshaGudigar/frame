const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateSecret, verifySync, generateURI } = require('otplib');
const QRCode = require('qrcode');
const router = express.Router();
const GlobalUser = require('../models/GlobalUser');
const RefreshToken = require('../models/RefreshToken');
const VerificationToken = require('../models/VerificationToken');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    acceptInviteSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    twoFactorVerifyLoginSchema,
    twoFactorSetupVerifySchema,
    twoFactorDisableSchema,
} = require('../schemas/auth');
const emailService = require('../services/email');
const logger = require('../utils/logger');
const {
    loginLimiter,
    registerLimiter,
    forgotPasswordLimiter,
    twoFactorLimiter,
} = require('../middleware/rateLimiters');

// Helper: Generate Access & Refresh Token Pair
const generateTokens = async (user, ipAddress) => {
    // 1. Access Token (JWT) - Short lived
    const accessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, tenants: user.tenants },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY },
    );

    // 2. Refresh Token (Random String) - Long lived
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Hardcoded 7 days matching config default

    const refreshToken = new RefreshToken({
        user: user._id,
        token: refreshTokenString,
        expiresAt,
        createdByIp: ipAddress,
    });
    await refreshToken.save();

    return { accessToken, refreshToken: refreshTokenString };
};

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates account, sends verification email, and returns access + refresh tokens.
 */
router.post('/register', registerLimiter, validate({ body: registerSchema }), async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    const ipAddress = req.ip;

    try {
        const existingUser = await GlobalUser.findOne({ email });
        if (existingUser) {
            return errorResponse(res, 'Email already registered', 409);
        }

        const user = new GlobalUser({
            email,
            password,
            firstName,
            lastName,
            isEmailVerified: false,
        });
        await user.save();

        // Generate verification token and send email
        try {
            const verificationToken = await VerificationToken.createToken(
                user._id,
                'email_verification',
                24,
            );
            await emailService.sendVerificationEmail(email, firstName, verificationToken.token);
        } catch (emailErr) {
            logger.error(
                { err: emailErr, userId: user._id },
                'Failed to send verification email during registration',
            );
        }

        const { accessToken, refreshToken } = await generateTokens(user, ipAddress);

        return successResponse(
            res,
            {
                accessToken,
                refreshToken,
                user: {
                    _id: user._id,
                    email: user.email,
                    firstName,
                    lastName,
                    role: user.role,
                    isEmailVerified: false,
                    isTwoFactorEnabled: false,
                },
            },
            'User registered successfully',
            201,
        );
    } catch (err) {
        return errorResponse(res, 'Registration failed', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     description: Authenticates user and returns access + refresh tokens.
 */
router.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    try {
        const user = await GlobalUser.findOne({ email })
            .select('+password')
            .populate('tenants.tenant');

        if (!user || !user.isActive) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        if (!user.password) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        // Check if 2FA is enabled
        if (user.isTwoFactorEnabled) {
            const twoFactorToken = jwt.sign(
                { userId: user._id, purpose: '2fa_pending' },
                JWT_SECRET,
                { expiresIn: '5m' },
            );
            return successResponse(
                res,
                { requiresTwoFactor: true, twoFactorToken },
                'Two-factor authentication required',
            );
        }

        const { accessToken, refreshToken } = await generateTokens(user, ipAddress);

        return successResponse(
            res,
            {
                accessToken,
                refreshToken,
                user: {
                    _id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    isTwoFactorEnabled: user.isTwoFactorEnabled,
                    tenants: user.tenants,
                },
            },
            'Login successful',
        );
    } catch (err) {
        return errorResponse(res, 'Login failed', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/accept-invite:
 *   post:
 *     summary: Accept an invitation
 *     description: Sets password for invited user, activates account, and returns tokens.
 */
router.post('/accept-invite', validate({ body: acceptInviteSchema }), async (req, res) => {
    const { token, password } = req.body;
    const ipAddress = req.ip;

    try {
        const tokenDoc = await VerificationToken.findValidToken(token, 'invite');
        if (!tokenDoc) {
            return errorResponse(res, 'Invalid or expired invitation token', 400);
        }

        const user = await GlobalUser.findById(tokenDoc.user);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Set password, activate, and mark email as verified
        user.password = password;
        user.isActive = true;
        user.isEmailVerified = true;
        await user.save();

        // Consume the token
        await tokenDoc.consume();

        const { accessToken, refreshToken } = await generateTokens(user, ipAddress);

        return successResponse(
            res,
            {
                accessToken,
                refreshToken,
                user: {
                    _id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isEmailVerified: true,
                    isTwoFactorEnabled: user.isTwoFactorEnabled,
                },
            },
            'Invitation accepted successfully',
        );
    } catch (err) {
        return errorResponse(res, 'Failed to accept invitation', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     description: Validates verification token and marks user email as verified.
 */
router.post('/verify-email', validate({ body: verifyEmailSchema }), async (req, res) => {
    const { token } = req.body;

    try {
        const tokenDoc = await VerificationToken.findValidToken(token, 'email_verification');
        if (!tokenDoc) {
            return errorResponse(res, 'Invalid or expired verification token', 400);
        }

        const user = await GlobalUser.findById(tokenDoc.user);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        user.isEmailVerified = true;
        await user.save();

        await tokenDoc.consume();

        return successResponse(res, null, 'Email verified successfully');
    } catch (err) {
        return errorResponse(res, 'Email verification failed', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Generates a new verification token and sends email. Requires authentication.
 */
router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        if (user.isEmailVerified) {
            return errorResponse(res, 'Email is already verified', 400);
        }

        const verificationToken = await VerificationToken.createToken(
            user._id,
            'email_verification',
            24,
        );

        try {
            await emailService.sendVerificationEmail(
                user.email,
                user.firstName,
                verificationToken.token,
            );
        } catch (emailErr) {
            logger.error({ err: emailErr, userId: user._id }, 'Failed to send verification email');
        }

        return successResponse(res, null, 'Verification email sent');
    } catch (err) {
        return errorResponse(res, 'Failed to resend verification email', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Sends password reset email. Always returns success to prevent email enumeration.
 */
router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    validate({ body: forgotPasswordSchema }),
    async (req, res) => {
        const { email } = req.body;

        try {
            // Always return success to prevent email enumeration
            const user = await GlobalUser.findOne({ email });

            if (user && user.isActive) {
                const resetToken = await VerificationToken.createToken(
                    user._id,
                    'password_reset',
                    1,
                ); // 1 hour expiry
                try {
                    await emailService.sendPasswordResetEmail(
                        user.email,
                        user.firstName,
                        resetToken.token,
                    );
                } catch (emailErr) {
                    logger.error(
                        { err: emailErr, userId: user._id },
                        'Failed to send password reset email',
                    );
                }
            }

            return successResponse(
                res,
                null,
                'If an account with that email exists, a password reset link has been sent.',
            );
        } catch (err) {
            return errorResponse(res, 'Failed to process password reset request', 500, err);
        }
    },
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Validates reset token, sets new password, and revokes all refresh tokens.
 */
router.post('/reset-password', validate({ body: resetPasswordSchema }), async (req, res) => {
    const { token, password } = req.body;

    try {
        const tokenDoc = await VerificationToken.findValidToken(token, 'password_reset');
        if (!tokenDoc) {
            return errorResponse(res, 'Invalid or expired reset token', 400);
        }

        const user = await GlobalUser.findById(tokenDoc.user);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Set new password
        user.password = password;
        await user.save();

        // Consume the reset token
        await tokenDoc.consume();

        // Revoke all existing refresh tokens for security
        await RefreshToken.updateMany({ user: user._id, revoked: null }, { revoked: new Date() });

        return successResponse(
            res,
            null,
            'Password reset successfully. Please log in with your new password.',
        );
    } catch (err) {
        return errorResponse(res, 'Password reset failed', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh Access Token
 *     description: Rotates refresh token and issues new access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 */
router.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;
    const ipAddress = req.ip;

    if (!refreshToken) {
        return errorResponse(res, 'Refresh token required', 400);
    }

    try {
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

        if (!tokenDoc) {
            return errorResponse(res, 'Invalid refresh token', 401);
        }

        // Reuse Detection: If token is already revoked, it might be a theft attempt.
        if (tokenDoc.revoked) {
            return errorResponse(res, 'Invalid refresh token', 401);
        }

        if (tokenDoc.expiresAt < new Date()) {
            return errorResponse(res, 'Refresh token expired', 401);
        }

        // Token Rotation: Revoke old token, issue new one
        const user = await GlobalUser.findById(tokenDoc.user);
        if (!user) {
            return errorResponse(res, 'User not found', 401);
        }

        // Revoke current
        tokenDoc.revoked = new Date();
        tokenDoc.replacedByToken = 'ROTATED';

        // Generate new pair
        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
            user,
            ipAddress,
        );

        // Update the replacedBy link for audit trail
        tokenDoc.replacedByToken = newRefreshToken;
        await tokenDoc.save();

        return successResponse(
            res,
            { accessToken, refreshToken: newRefreshToken },
            'Token refreshed',
        );
    } catch (err) {
        return errorResponse(res, 'Refresh failed', 500, err);
    }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the currently authenticated user along with their resolved permissions matrix.
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authMiddleware, async (req, res) => {
    return successResponse(
        res,
        {
            user: {
                _id: req.user._id,
                email: req.user.email,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                role: req.user.role,
                permissions: req.user.permissions, // Injected by authMiddleware
                isEmailVerified: req.user.isEmailVerified,
                isTwoFactorEnabled: req.user.isTwoFactorEnabled,
                tenants: req.user.tenants,
            },
        },
        'User profile retrieved',
    );
});

/**
 * @openapi
 * /api/auth/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Update name and/or password.
 *     security:
 *       - bearerAuth: []
 */
router.patch(
    '/profile',
    authMiddleware,
    validate({ body: updateProfileSchema }),
    async (req, res) => {
        const { firstName, lastName, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        try {
            const user = await GlobalUser.findById(userId).select('+password');
            if (!user) {
                return errorResponse(res, 'User not found', 404);
            }

            if (firstName) user.firstName = firstName;
            if (lastName) user.lastName = lastName;

            if (newPassword) {
                // verify current password
                const isMatch = await user.comparePassword(currentPassword);
                if (!isMatch) {
                    return errorResponse(res, 'Incorrect current password', 401);
                }
                user.password = newPassword;
            }

            await user.save();

            return successResponse(
                res,
                {
                    user: {
                        _id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                    },
                },
                'Profile updated successfully',
            );
        } catch (err) {
            return errorResponse(res, 'Profile update failed', 500, err);
        }
    },
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Revokes the provided refresh token.
 */
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        // If no token provided, just return success (client might have lost it)
        return successResponse(res, null, 'Logged out');
    }

    try {
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        if (tokenDoc) {
            tokenDoc.revoked = new Date();
            await tokenDoc.save();
        }
        return successResponse(res, null, 'Logged out successfully');
    } catch (err) {
        return errorResponse(res, 'Logout failed', 500, err);
    }
});

// ─── Two-Factor Authentication Endpoints ────────────────────────────────────

/**
 * POST /auth/2fa/verify-login
 * Completes login for users with 2FA enabled.
 */
router.post(
    '/2fa/verify-login',
    twoFactorLimiter,
    validate({ body: twoFactorVerifyLoginSchema }),
    async (req, res) => {
        const { twoFactorToken, code } = req.body;
        const ipAddress = req.ip;

        try {
            let decoded;
            try {
                decoded = jwt.verify(twoFactorToken, JWT_SECRET);
            } catch {
                return errorResponse(res, 'Invalid or expired two-factor token', 401);
            }

            if (decoded.purpose !== '2fa_pending') {
                return errorResponse(res, 'Invalid two-factor token', 401);
            }

            const user = await GlobalUser.findById(decoded.userId).select('+twoFactorSecret');
            if (!user || !user.isActive) {
                return errorResponse(res, 'User not found', 404);
            }

            if (!user.twoFactorSecret) {
                return errorResponse(res, 'Two-factor authentication not configured', 400);
            }

            const isValid = verifySync({ token: code, secret: user.twoFactorSecret }).valid;
            if (!isValid) {
                return errorResponse(res, 'Invalid two-factor code', 401);
            }

            const { accessToken, refreshToken } = await generateTokens(user, ipAddress);

            return successResponse(
                res,
                {
                    accessToken,
                    refreshToken,
                    user: {
                        _id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified,
                        isTwoFactorEnabled: user.isTwoFactorEnabled,
                    },
                },
                'Login successful',
            );
        } catch (err) {
            return errorResponse(res, 'Two-factor verification failed', 500, err);
        }
    },
);

/**
 * POST /auth/2fa/setup
 * Generates TOTP secret and QR code for 2FA setup.
 */
router.post('/2fa/setup', authMiddleware, async (req, res) => {
    try {
        const user = await GlobalUser.findById(req.user.id);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        if (user.isTwoFactorEnabled) {
            return errorResponse(res, 'Two-factor authentication is already enabled', 400);
        }

        const secret = generateSecret();

        // Save secret but don't enable 2FA yet
        user.twoFactorSecret = secret;
        await user.save();

        const otpauthUrl = generateURI({ issuer: 'Alyxnet Frame', label: user.email, secret });
        const qrCode = await QRCode.toDataURL(otpauthUrl);

        return successResponse(res, { qrCode, secret }, 'Two-factor setup initiated');
    } catch (err) {
        return errorResponse(res, 'Two-factor setup failed', 500, err);
    }
});

/**
 * POST /auth/2fa/setup/verify
 * Confirms 2FA setup by verifying the first TOTP code.
 */
router.post(
    '/2fa/setup/verify',
    authMiddleware,
    validate({ body: twoFactorSetupVerifySchema }),
    async (req, res) => {
        const { code } = req.body;

        try {
            const user = await GlobalUser.findById(req.user.id).select('+twoFactorSecret');
            if (!user) {
                return errorResponse(res, 'User not found', 404);
            }

            if (user.isTwoFactorEnabled) {
                return errorResponse(res, 'Two-factor authentication is already enabled', 400);
            }

            if (!user.twoFactorSecret) {
                return errorResponse(res, 'Two-factor setup not initiated', 400);
            }

            const isValid = verifySync({ token: code, secret: user.twoFactorSecret }).valid;
            if (!isValid) {
                return errorResponse(res, 'Invalid verification code', 400);
            }

            user.isTwoFactorEnabled = true;
            await user.save();

            return successResponse(res, null, 'Two-factor authentication enabled');
        } catch (err) {
            return errorResponse(res, 'Two-factor verification failed', 500, err);
        }
    },
);

/**
 * POST /auth/2fa/disable
 * Disables 2FA after verifying a current TOTP code.
 */
router.post(
    '/2fa/disable',
    authMiddleware,
    validate({ body: twoFactorDisableSchema }),
    async (req, res) => {
        const { code } = req.body;

        try {
            const user = await GlobalUser.findById(req.user.id).select('+twoFactorSecret');
            if (!user) {
                return errorResponse(res, 'User not found', 404);
            }

            if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
                return errorResponse(res, 'Two-factor authentication is not enabled', 400);
            }

            const isValid = verifySync({ token: code, secret: user.twoFactorSecret }).valid;
            if (!isValid) {
                return errorResponse(res, 'Invalid verification code', 401);
            }

            user.isTwoFactorEnabled = false;
            user.twoFactorSecret = undefined;
            await user.save();

            return successResponse(res, null, 'Two-factor authentication disabled');
        } catch (err) {
            return errorResponse(res, 'Failed to disable two-factor authentication', 500, err);
        }
    },
);

/**
 * GET /auth/2fa/status
 * Returns the current 2FA status for the authenticated user.
 */
router.get('/2fa/status', authMiddleware, async (req, res) => {
    try {
        const user = await GlobalUser.findById(req.user.id);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        return successResponse(
            res,
            { isTwoFactorEnabled: user.isTwoFactorEnabled },
            'Two-factor status retrieved',
        );
    } catch (err) {
        return errorResponse(res, 'Failed to retrieve two-factor status', 500, err);
    }
});

module.exports = router;

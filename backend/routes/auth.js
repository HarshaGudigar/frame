const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const GlobalUser = require('../models/GlobalUser');
const RefreshToken = require('../models/RefreshToken');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { JWT_SECRET, JWT_EXPIRY, REFRESH_TOKEN_EXPIRY } = require('../config');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, updateProfileSchema } = require('../schemas/auth');

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
 *     description: Creates account and returns access + refresh tokens.
 */
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    const ipAddress = req.ip;

    try {
        const existingUser = await GlobalUser.findOne({ email });
        if (existingUser) {
            return errorResponse(res, 'Email already registered', 409);
        }

        const user = new GlobalUser({ email, password, firstName, lastName });
        await user.save();

        const { accessToken, refreshToken } = await generateTokens(user, ipAddress);

        return successResponse(
            res,
            {
                accessToken,
                refreshToken,
                user: { _id: user._id, email: user.email, firstName, lastName, role: user.role },
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
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    try {
        const user = await GlobalUser.findOne({ email }).select('+password');

        if (!user || !user.isActive) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return errorResponse(res, 'Invalid credentials', 401);
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
            // Security: Revoke the token that replaced this one (and so on) to stop the chain
            // For MVP, we'll just log it. A strict implementation would proactively revoke all tokens for this user.
            // logger.warn({ userId: tokenDoc.user, ip: ipAddress }, 'Reuse of revoked refresh token detected!');
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
        tokenDoc.replacedByToken = 'ROTATED'; // We will set this to new token logic if strictly needed, but simple revoked is enough for now

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

module.exports = router;

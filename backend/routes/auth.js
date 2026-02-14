const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const GlobalUser = require('../models/GlobalUser');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/auth');

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a global user account. Password is hashed automatically.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "user@example.com" }
 *               password: { type: string, minLength: 6, example: "securepass123" }
 *               firstName: { type: string, example: "John" }
 *               lastName: { type: string, example: "Doe" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error (missing fields, invalid email, short password)
 *       409:
 *         description: Email already registered
 */
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    try {
        const existingUser = await GlobalUser.findOne({ email });
        if (existingUser) {
            return errorResponse(res, 'Email already registered', 409);
        }

        const user = new GlobalUser({ email, password, firstName, lastName });
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role, tenants: user.tenants },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY },
        );

        return successResponse(
            res,
            {
                token,
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
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticates a user and returns a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "user@example.com" }
 *               password: { type: string, example: "securepass123" }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limit exceeded (10 attempts per 15 minutes)
 */
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await GlobalUser.findOne({ email }).select('+password');

        if (!user || !user.isActive) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role, tenants: user.tenants },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY },
        );

        return successResponse(
            res,
            {
                token,
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

module.exports = router;

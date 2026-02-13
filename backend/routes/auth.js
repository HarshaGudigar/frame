const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const GlobalUser = require('../models/GlobalUser');
const { successResponse, errorResponse } = require('../utils/responseWrapper');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Auth Routes (Global / Control Plane)
 */

// Register a new global user
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    // Input validation
    if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
    }
    if (!EMAIL_REGEX.test(email)) {
        return errorResponse(res, 'Invalid email format', 400);
    }
    if (password.length < 6) {
        return errorResponse(res, 'Password must be at least 6 characters', 400);
    }

    try {
        const existingUser = await GlobalUser.findOne({ email });
        if (existingUser) {
            return errorResponse(res, 'Email already registered', 409);
        }

        const user = new GlobalUser({ email, password, firstName, lastName });
        await user.save(); // Password is hashed via the pre-save hook

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email, tenants: user.tenants },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return successResponse(res, { token, user: { _id: user._id, email: user.email, firstName, lastName } }, 'User registered successfully', 201);
    } catch (err) {
        return errorResponse(res, 'Registration failed', 500, err);
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
    }
    if (!EMAIL_REGEX.test(email)) {
        return errorResponse(res, 'Invalid email format', 400);
    }

    try {
        // Explicitly select password since it's excluded by default
        const user = await GlobalUser.findOne({ email }).select('+password');

        if (!user || !user.isActive) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, tenants: user.tenants },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return successResponse(res, { token, user: { _id: user._id, email: user.email, firstName: user.firstName } }, 'Login successful');
    } catch (err) {
        return errorResponse(res, 'Login failed', 500, err);
    }
});

module.exports = router;

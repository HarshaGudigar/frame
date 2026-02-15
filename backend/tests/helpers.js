/**
 * Test helper — creates a fresh app + in-memory MongoDB connection for each test suite.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../app');

let mongod;

/**
 * Set up an isolated test environment with its own MongoDB instance.
 * Returns { app, request } where request is a supertest agent.
 */
async function setupTestApp() {
    const supertest = require('supertest');

    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect(uri);

    const { app } = createApp();
    const request = supertest(app);

    return { app, request };
}

/**
 * Clean up after tests — drop DB, close connection, stop memory server.
 */
async function teardownTestApp() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
    if (mongod) {
        await mongod.stop();
    }
}

/**
 * Clear all collections between tests (without dropping the DB).
 */
async function clearCollections() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

/**
 * Register a user and return the token.
 * Supports passing a 'role' to override the default 'user' role.
 */
async function registerAndGetToken(request, userData = {}) {
    const GlobalUser = require('../models/GlobalUser');
    const defaults = {
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
    };

    const payload = { ...defaults, ...userData };
    const { role, ...registrationData } = payload;

    const res = await request.post('/api/auth/register').send(registrationData);

    if (res.body.data?.user?._id) {
        // Mark email as verified for test users so they pass requireVerifiedEmail middleware
        const updateFields = { isEmailVerified: true };
        if (role) {
            updateFields.role = role;
        }
        await GlobalUser.findByIdAndUpdate(res.body.data.user._id, updateFields);

        if (role) {
            // Re-calculate token with correct role for test requests
            const jwt = require('jsonwebtoken');
            const { JWT_SECRET, JWT_EXPIRY } = require('../config');
            const token = jwt.sign(
                { userId: res.body.data.user._id, email: payload.email, role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY },
            );
            return token;
        }
    }

    return res.body.data?.accessToken;
}

module.exports = {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
};

/**
 * Test helper — creates a fresh app + in-memory MongoDB connection for each test suite.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../server');

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
 */
async function registerAndGetToken(request, userData = {}) {
    const defaults = {
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
    };

    const res = await request.post('/api/auth/register').send({ ...defaults, ...userData });

    return res.body.data?.token;
}

module.exports = {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
};

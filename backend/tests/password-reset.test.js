const { setupTestApp, teardownTestApp, clearCollections } = require('./helpers');
const GlobalUser = require('../models/GlobalUser');
const RefreshToken = require('../models/RefreshToken');
const VerificationToken = require('../models/VerificationToken');

let request;

beforeAll(async () => {
    const ctx = await setupTestApp();
    request = ctx.request;
});

afterAll(async () => {
    await teardownTestApp();
});

afterEach(async () => {
    await clearCollections();
});

describe('Password Reset Flow', () => {
    const validUser = {
        email: 'reset@example.com',
        password: 'OldPassword123!',
        firstName: 'Reset',
        lastName: 'User',
    };

    beforeEach(async () => {
        await request.post('/api/auth/register').send(validUser);
    });

    describe('POST /api/auth/forgot-password', () => {
        it('should return success for existing email (anti-enumeration)', async () => {
            const res = await request
                .post('/api/auth/forgot-password')
                .send({ email: validUser.email });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should return success for non-existing email (anti-enumeration)', async () => {
            const res = await request
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should create a password_reset token for existing user', async () => {
            await request.post('/api/auth/forgot-password').send({ email: validUser.email });

            const user = await GlobalUser.findOne({ email: validUser.email });
            const token = await VerificationToken.findOne({
                user: user._id,
                type: 'password_reset',
            });

            expect(token).toBeDefined();
            expect(token.usedAt).toBeNull();
        });

        it('should not create a token for non-existing user', async () => {
            await request.post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });

            const tokens = await VerificationToken.find({ type: 'password_reset' });
            expect(tokens.length).toBe(0);
        });

        it('should invalidate previous reset tokens when requesting a new one', async () => {
            // Request first reset
            await request.post('/api/auth/forgot-password').send({ email: validUser.email });

            const user = await GlobalUser.findOne({ email: validUser.email });
            const firstToken = await VerificationToken.findOne({
                user: user._id,
                type: 'password_reset',
                usedAt: null,
            });

            // Request second reset
            await request.post('/api/auth/forgot-password').send({ email: validUser.email });

            // First token should be invalidated (usedAt set)
            const invalidated = await VerificationToken.findById(firstToken._id);
            expect(invalidated.usedAt).not.toBeNull();

            // Only one valid token should remain
            const validTokens = await VerificationToken.find({
                user: user._id,
                type: 'password_reset',
                usedAt: null,
            });
            expect(validTokens.length).toBe(1);
        });

        it('should reject invalid email format', async () => {
            const res = await request
                .post('/api/auth/forgot-password')
                .send({ email: 'not-an-email' });

            expect(res.status).toBe(400);
        });

        it('should reject missing email', async () => {
            const res = await request.post('/api/auth/forgot-password').send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/reset-password', () => {
        let resetToken;

        beforeEach(async () => {
            await request.post('/api/auth/forgot-password').send({ email: validUser.email });

            const user = await GlobalUser.findOne({ email: validUser.email });
            const tokenDoc = await VerificationToken.findOne({
                user: user._id,
                type: 'password_reset',
                usedAt: null,
            });
            resetToken = tokenDoc.token;
        });

        it('should reset password with valid token', async () => {
            const res = await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should allow login with new password after reset', async () => {
            await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            const loginRes = await request.post('/api/auth/login').send({
                email: validUser.email,
                password: 'NewPassword456!',
            });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.data.accessToken).toBeDefined();
        });

        it('should reject login with old password after reset', async () => {
            await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            const loginRes = await request.post('/api/auth/login').send({
                email: validUser.email,
                password: validUser.password,
            });

            expect(loginRes.status).toBe(401);
        });

        it('should revoke all existing refresh tokens', async () => {
            // Login to create a refresh token
            const loginRes = await request.post('/api/auth/login').send({
                email: validUser.email,
                password: validUser.password,
            });
            const oldRefreshToken = loginRes.body.data.refreshToken;

            // Reset password
            await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            // Old refresh token should be revoked
            const refreshRes = await request
                .post('/api/auth/refresh-token')
                .send({ refreshToken: oldRefreshToken });

            expect(refreshRes.status).toBe(401);
        });

        it('should consume the reset token', async () => {
            await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            const tokenDoc = await VerificationToken.findOne({ token: resetToken });
            expect(tokenDoc.usedAt).not.toBeNull();
        });

        it('should reject already-used reset token', async () => {
            // Use once
            await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            // Try again
            const res = await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'AnotherPassword!',
                confirmPassword: 'AnotherPassword!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject invalid token', async () => {
            const res = await request.post('/api/auth/reset-password').send({
                token: 'fake-token-string',
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject expired token', async () => {
            await VerificationToken.updateOne(
                { token: resetToken },
                { expiresAt: new Date(Date.now() - 1000) },
            );

            const res = await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject mismatched passwords', async () => {
            const res = await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: 'NewPassword456!',
                confirmPassword: 'DifferentPassword!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject password too short', async () => {
            const res = await request.post('/api/auth/reset-password').send({
                token: resetToken,
                password: '123',
                confirmPassword: '123',
            });

            expect(res.status).toBe(400);
        });

        it('should reject missing token', async () => {
            const res = await request.post('/api/auth/reset-password').send({
                password: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            });

            expect(res.status).toBe(400);
        });
    });
});

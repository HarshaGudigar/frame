const { setupTestApp, teardownTestApp, clearCollections } = require('./helpers');
const User = require('../models/User');
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

describe('Email Verification', () => {
    const validUser = {
        email: 'verify@example.com',
        password: 'Str0ngP@ss',
        firstName: 'Verify',
        lastName: 'User',
    };

    describe('POST /api/auth/register', () => {
        it('should return isEmailVerified: false on registration', async () => {
            const res = await request.post('/api/auth/register').send(validUser);

            expect(res.status).toBe(201);
            expect(res.body.data.user.isEmailVerified).toBe(false);
        });

        it('should create a verification token on registration', async () => {
            const res = await request.post('/api/auth/register').send(validUser);
            const userId = res.body.data.user._id;

            const token = await VerificationToken.findOne({
                user: userId,
                type: 'email_verification',
            });

            expect(token).toBeDefined();
            expect(token.usedAt).toBeNull();
            expect(token.expiresAt).toBeInstanceOf(Date);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should return isEmailVerified in login response', async () => {
            await request.post('/api/auth/register').send(validUser);

            const res = await request
                .post('/api/auth/login')
                .send({ email: validUser.email, password: validUser.password });

            expect(res.status).toBe(200);
            expect(res.body.data.user.isEmailVerified).toBe(false);
        });

        it('should return isEmailVerified: true after verification', async () => {
            await request.post('/api/auth/register').send(validUser);
            await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

            const res = await request
                .post('/api/auth/login')
                .send({ email: validUser.email, password: validUser.password });

            expect(res.status).toBe(200);
            expect(res.body.data.user.isEmailVerified).toBe(true);
        });
    });

    describe('POST /api/auth/verify-email', () => {
        it('should verify email with valid token', async () => {
            const regRes = await request.post('/api/auth/register').send(validUser);
            const userId = regRes.body.data.user._id;

            const tokenDoc = await VerificationToken.findOne({
                user: userId,
                type: 'email_verification',
            });

            const res = await request
                .post('/api/auth/verify-email')
                .send({ token: tokenDoc.token });

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/verified/i);

            // User should now be verified
            const user = await User.findById(userId);
            expect(user.isEmailVerified).toBe(true);

            // Token should be consumed
            const consumed = await VerificationToken.findById(tokenDoc._id);
            expect(consumed.usedAt).toBeDefined();
            expect(consumed.usedAt).not.toBeNull();
        });

        it('should reject invalid token', async () => {
            const res = await request
                .post('/api/auth/verify-email')
                .send({ token: 'invalid-token-string' });

            expect(res.status).toBe(400);
        });

        it('should reject already-used token', async () => {
            const regRes = await request.post('/api/auth/register').send(validUser);
            const userId = regRes.body.data.user._id;

            const tokenDoc = await VerificationToken.findOne({
                user: userId,
                type: 'email_verification',
            });

            // Use it once
            await request.post('/api/auth/verify-email').send({ token: tokenDoc.token });

            // Try to use it again
            const res = await request
                .post('/api/auth/verify-email')
                .send({ token: tokenDoc.token });

            expect(res.status).toBe(400);
        });

        it('should reject expired token', async () => {
            const regRes = await request.post('/api/auth/register').send(validUser);
            const userId = regRes.body.data.user._id;

            const tokenDoc = await VerificationToken.findOne({
                user: userId,
                type: 'email_verification',
            });

            // Manually expire the token
            await VerificationToken.updateOne(
                { _id: tokenDoc._id },
                { expiresAt: new Date(Date.now() - 1000) },
            );

            const res = await request
                .post('/api/auth/verify-email')
                .send({ token: tokenDoc.token });

            expect(res.status).toBe(400);
        });

        it('should reject empty token', async () => {
            const res = await request.post('/api/auth/verify-email').send({ token: '' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/resend-verification', () => {
        it('should resend verification email for unverified user', async () => {
            const regRes = await request.post('/api/auth/register').send(validUser);
            const accessToken = regRes.body.data.accessToken;

            const res = await request
                .post('/api/auth/resend-verification')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/verification email sent/i);

            // Should have a new token (old one invalidated)
            const userId = regRes.body.data.user._id;
            const tokens = await VerificationToken.find({
                user: userId,
                type: 'email_verification',
                usedAt: null,
            });
            expect(tokens.length).toBe(1);
        });

        it('should reject if email is already verified', async () => {
            const regRes = await request.post('/api/auth/register').send(validUser);
            const accessToken = regRes.body.data.accessToken;

            await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

            const res = await request
                .post('/api/auth/resend-verification')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(400);
        });

        it('should require authentication', async () => {
            const res = await request.post('/api/auth/resend-verification');

            expect(res.status).toBe(401);
        });
    });
});

describe('requireVerifiedEmail middleware', () => {
    it('should block unverified users from admin routes', async () => {
        // Register user (unverified) and manually set role to owner
        const regRes = await request.post('/api/auth/register').send({
            email: 'unverified-superuser@example.com',
            password: 'Password123!',
            firstName: 'Unverified',
            lastName: 'Owner',
        });
        const accessToken = regRes.body.data.accessToken;
        await User.updateOne({ email: 'unverified-superuser@example.com' }, { role: 'superuser' });

        const res = await request
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/email verification required/i);
    });

    it('should allow verified users to access admin routes', async () => {
        const regRes = await request.post('/api/auth/register').send({
            email: 'verified-superuser@example.com',
            password: 'Password123!',
            firstName: 'Verified',
            lastName: 'Owner',
        });
        const accessToken = regRes.body.data.accessToken;
        await User.updateOne(
            { email: 'verified-superuser@example.com' },
            { role: 'superuser', isEmailVerified: true },
        );

        const res = await request
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
    });
});

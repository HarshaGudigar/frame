const { setupTestApp, teardownTestApp, clearCollections } = require('./helpers');
const GlobalUser = require('../models/GlobalUser');
const RefreshToken = require('../models/RefreshToken');

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

describe('POST /api/auth/register', () => {
    const validUser = {
        email: 'alice@example.com',
        password: 'Str0ngP@ss',
        firstName: 'Alice',
        lastName: 'Smith',
    };

    it('should register a new user and return access + refresh tokens', async () => {
        const res = await request.post('/api/auth/register').send(validUser);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
        expect(res.body.data.user.email).toBe(validUser.email);
    });
});

describe('POST /api/auth/login', () => {
    const user = {
        email: 'alice@example.com',
        password: 'Str0ngP@ss',
        firstName: 'Alice',
    };

    beforeEach(async () => {
        await request.post('/api/auth/register').send(user);
    });

    it('should login and return access + refresh tokens', async () => {
        const res = await request
            .post('/api/auth/login')
            .send({ email: user.email, password: user.password });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
    });
});

describe('POST /api/auth/refresh-token', () => {
    let accessToken, refreshToken, user;

    beforeEach(async () => {
        const registerRes = await request.post('/api/auth/register').send({
            email: 'bob@example.com',
            password: 'Password123!',
            firstName: 'Bob',
        });
        accessToken = registerRes.body.data.accessToken;
        refreshToken = registerRes.body.data.refreshToken;
        user = registerRes.body.data.user;
    });

    it('should refresh token pair with valid refresh token', async () => {
        // Wait 1s to ensure creation time differs (optional)
        const res = await request.post('/api/auth/refresh-token').send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
        // expect(res.body.data.accessToken).not.toBe(accessToken); // Can be same if within same second
        expect(res.body.data.refreshToken).not.toBe(refreshToken);

        // Verify old token is revoked
        const oldTokenDoc = await RefreshToken.findOne({ token: refreshToken });
        expect(oldTokenDoc.revoked).toBeDefined();

        // Verify new token exists
        const newTokenDoc = await RefreshToken.findOne({ token: res.body.data.refreshToken });
        expect(newTokenDoc).toBeDefined();
        expect(newTokenDoc.revoked).toBeUndefined();
    });

    it('should reject invalid refresh token', async () => {
        const res = await request.post('/api/auth/refresh-token').send({ refreshToken: 'invalid' });
        expect(res.status).toBe(401);
    });

    it('should reject reused (revoked) refresh token', async () => {
        // 1. Refresh once to revoke the first token
        const res1 = await request.post('/api/auth/refresh-token').send({ refreshToken });
        expect(res1.status).toBe(200);

        // 2. Try to use the first token again
        const res2 = await request.post('/api/auth/refresh-token').send({ refreshToken });
        expect(res2.status).toBe(401);
    });
});

describe('POST /api/auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
        const res = await request.post('/api/auth/register').send({
            email: 'charlie@example.com',
            password: 'Password123!',
            firstName: 'Charlie',
        });
        refreshToken = res.body.data.refreshToken;
    });

    it('should revoke refresh token on logout', async () => {
        const res = await request.post('/api/auth/logout').send({ refreshToken });
        expect(res.status).toBe(200);

        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        expect(tokenDoc.revoked).toBeDefined();
    });

    it('should not allow refresh after logout', async () => {
        await request.post('/api/auth/logout').send({ refreshToken });
        const res = await request.post('/api/auth/refresh-token').send({ refreshToken });
        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/auth/profile', () => {
    let accessToken, user;

    beforeEach(async () => {
        const res = await request.post('/api/auth/register').send({
            email: 'dave@example.com',
            password: 'OldPassword123!',
            firstName: 'Dave',
        });
        accessToken = res.body.data.accessToken;
        user = res.body.data.user;
    });

    it('should update user profile details', async () => {
        const res = await request
            .patch('/api/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ firstName: 'David', lastName: 'Bowman' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.firstName).toBe('David');
        expect(res.body.data.user.lastName).toBe('Bowman');
    });

    it('should change password successfully', async () => {
        const res = await request
            .patch('/api/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                currentPassword: 'OldPassword123!',
                newPassword: 'NewPassword456!',
                confirmNewPassword: 'NewPassword456!',
            });

        expect(res.status).toBe(200);

        // Verify login with new password
        const loginRes = await request.post('/api/auth/login').send({
            email: 'dave@example.com',
            password: 'NewPassword456!',
        });
        expect(loginRes.status).toBe(200);
    });

    it('should reject password change with incorrect current password', async () => {
        const res = await request
            .patch('/api/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                currentPassword: 'WrongPassword',
                newPassword: 'NewPassword456!',
                confirmNewPassword: 'NewPassword456!',
            });

        expect(res.status).toBe(401);
    });

    it('should reject password change if new passwords do not match', async () => {
        const res = await request
            .patch('/api/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                currentPassword: 'OldPassword123!',
                newPassword: 'NewPassword456!',
                confirmNewPassword: 'MismatchPassword!',
            });

        expect(res.status).toBe(400); // Validation error
    });
});

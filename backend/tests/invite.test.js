const {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
} = require('./helpers');
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

describe('Email-Based Invite Flow', () => {
    let superuserToken;

    beforeEach(async () => {
        superuserToken = await registerAndGetToken(request, {
            email: 'superuser@example.com',
            role: 'superuser',
            firstName: 'Owner',
            lastName: 'Test',
        });
    });

    describe('POST /api/admin/users/invite', () => {
        it('should create an inactive user without a password', async () => {
            const res = await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'invited@example.com',
                    firstName: 'Invited',
                    lastName: 'User',
                    role: 'user',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe('invited@example.com');

            // User should be inactive
            const user = await User.findOne({ email: 'invited@example.com' }).select('+password');
            expect(user.isActive).toBe(false);
            expect(user.isEmailVerified).toBe(false);
            expect(user.password).toBeUndefined();
        });

        it('should create an invite token', async () => {
            const res = await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'invited2@example.com',
                    firstName: 'Invited',
                    lastName: 'Two',
                    role: 'staff',
                });

            const user = await User.findOne({ email: 'invited2@example.com' });
            const token = await VerificationToken.findOne({
                user: user._id,
                type: 'invite',
            });

            expect(token).toBeDefined();
            expect(token.usedAt).toBeNull();
        });

        it('should set invitedBy to the inviting user', async () => {
            await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'invited3@example.com',
                    firstName: 'Invited',
                    lastName: 'Three',
                    role: 'user',
                });

            const owner = await User.findOne({ email: 'superuser@example.com' });
            const invited = await User.findOne({ email: 'invited3@example.com' });

            expect(invited.invitedBy.toString()).toBe(owner._id.toString());
        });

        it('should not return a tempPassword in the response', async () => {
            const res = await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'invited4@example.com',
                    firstName: 'Invited',
                    lastName: 'Four',
                    role: 'user',
                });

            expect(res.body.data.tempPassword).toBeUndefined();
        });

        it('should reject duplicate email', async () => {
            await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'dup@example.com',
                    firstName: 'Dup',
                    lastName: 'User',
                    role: 'user',
                });

            const res = await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'dup@example.com',
                    firstName: 'Dup',
                    lastName: 'Again',
                    role: 'user',
                });

            expect(res.status).toBe(409);
        });
    });

    describe('POST /api/auth/accept-invite', () => {
        let inviteToken;

        beforeEach(async () => {
            // Invite a user
            await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'accept@example.com',
                    firstName: 'Accept',
                    lastName: 'User',
                    role: 'staff',
                });

            const user = await User.findOne({ email: 'accept@example.com' });
            const tokenDoc = await VerificationToken.findOne({
                user: user._id,
                type: 'invite',
            });
            inviteToken = tokenDoc.token;
        });

        it('should accept invite with valid token and password', async () => {
            const res = await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
            expect(res.body.data.user.email).toBe('accept@example.com');
            expect(res.body.data.user.isEmailVerified).toBe(true);
        });

        it('should activate the user account', async () => {
            await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            const user = await User.findOne({ email: 'accept@example.com' });
            expect(user.isActive).toBe(true);
            expect(user.isEmailVerified).toBe(true);
        });

        it('should allow login with the new password', async () => {
            await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            const loginRes = await request.post('/api/auth/login').send({
                email: 'accept@example.com',
                password: 'NewPassword123!',
            });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.data.accessToken).toBeDefined();
        });

        it('should consume the invite token', async () => {
            await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            const tokenDoc = await VerificationToken.findOne({ token: inviteToken });
            expect(tokenDoc.usedAt).not.toBeNull();
        });

        it('should reject already-used invite token', async () => {
            // Accept once
            await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            // Try again
            const res = await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'AnotherPassword!',
                confirmPassword: 'AnotherPassword!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject invalid token', async () => {
            const res = await request.post('/api/auth/accept-invite').send({
                token: 'bogus-token',
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject mismatched passwords', async () => {
            const res = await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'DifferentPassword!',
            });

            expect(res.status).toBe(400);
        });

        it('should reject password too short', async () => {
            const res = await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: '12345',
                confirmPassword: '12345',
            });

            expect(res.status).toBe(400);
        });

        it('should reject expired invite token', async () => {
            // Manually expire
            await VerificationToken.updateOne(
                { token: inviteToken },
                { expiresAt: new Date(Date.now() - 1000) },
            );

            const res = await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            expect(res.status).toBe(400);
        });

        it('should preserve the assigned role', async () => {
            const res = await request.post('/api/auth/accept-invite').send({
                token: inviteToken,
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            });

            expect(res.body.data.user.role).toBe('staff');
        });
    });

    describe('Invited user cannot login before accepting', () => {
        it('should reject login for user without password', async () => {
            await request
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${superuserToken}`)
                .send({
                    email: 'nologin@example.com',
                    firstName: 'No',
                    lastName: 'Login',
                    role: 'user',
                });

            const res = await request.post('/api/auth/login').send({
                email: 'nologin@example.com',
                password: 'anything',
            });

            expect(res.status).toBe(401);
        });
    });
});

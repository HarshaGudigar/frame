const { generateSync } = require('otplib');
const { setupTestApp, teardownTestApp, clearCollections } = require('./helpers');
const User = require('../models/User');

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

// Helper: register a user and return { accessToken, refreshToken, user }
async function registerUser(data = {}) {
    const defaults = {
        email: 'totp@example.com',
        password: 'Str0ngP@ss',
        firstName: 'TOTP',
        lastName: 'User',
    };
    const res = await request.post('/api/auth/register').send({ ...defaults, ...data });
    return res.body.data;
}

// Helper: full 2FA setup flow — returns the TOTP secret
async function setupTwoFactor(accessToken) {
    const setupRes = await request
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`);

    const { secret } = setupRes.body.data;
    const code = generateSync({ secret });

    await request
        .post('/api/auth/2fa/setup/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code });

    return secret;
}

describe('Two-Factor Authentication', () => {
    describe('GET /api/auth/2fa/status', () => {
        it('should return isTwoFactorEnabled: false by default', async () => {
            const { accessToken } = await registerUser();

            const res = await request
                .get('/api/auth/2fa/status')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.isTwoFactorEnabled).toBe(false);
        });

        it('should return isTwoFactorEnabled: true after setup', async () => {
            const { accessToken } = await registerUser();
            await setupTwoFactor(accessToken);

            const res = await request
                .get('/api/auth/2fa/status')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.isTwoFactorEnabled).toBe(true);
        });

        it('should require authentication', async () => {
            const res = await request.get('/api/auth/2fa/status');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/2fa/setup', () => {
        it('should return QR code and secret', async () => {
            const { accessToken } = await registerUser();

            const res = await request
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.qrCode).toBeDefined();
            expect(res.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
            expect(res.body.data.secret).toBeDefined();
            expect(typeof res.body.data.secret).toBe('string');
        });

        it('should save secret to user without enabling 2FA', async () => {
            const { accessToken, user } = await registerUser();

            await request.post('/api/auth/2fa/setup').set('Authorization', `Bearer ${accessToken}`);

            const dbUser = await User.findById(user._id).select('+twoFactorSecret');
            expect(dbUser.twoFactorSecret).toBeDefined();
            expect(dbUser.isTwoFactorEnabled).toBe(false);
        });

        it('should reject if 2FA is already enabled', async () => {
            const { accessToken } = await registerUser();
            await setupTwoFactor(accessToken);

            const res = await request
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already enabled/i);
        });

        it('should require authentication', async () => {
            const res = await request.post('/api/auth/2fa/setup');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/2fa/setup/verify', () => {
        it('should enable 2FA with valid code', async () => {
            const { accessToken, user } = await registerUser();

            const setupRes = await request
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${accessToken}`);

            const { secret } = setupRes.body.data;
            const code = generateSync({ secret });

            const res = await request
                .post('/api/auth/2fa/setup/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code });

            expect(res.status).toBe(200);

            const dbUser = await User.findById(user._id);
            expect(dbUser.isTwoFactorEnabled).toBe(true);
        });

        it('should reject invalid code', async () => {
            const { accessToken } = await registerUser();

            await request.post('/api/auth/2fa/setup').set('Authorization', `Bearer ${accessToken}`);

            const res = await request
                .post('/api/auth/2fa/setup/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: '000000' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid/i);
        });

        it('should reject if 2FA is already enabled', async () => {
            const { accessToken } = await registerUser();
            const secret = await setupTwoFactor(accessToken);

            const code = generateSync({ secret });
            const res = await request
                .post('/api/auth/2fa/setup/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already enabled/i);
        });

        it('should reject if setup was not initiated', async () => {
            const { accessToken } = await registerUser();

            const res = await request
                .post('/api/auth/2fa/setup/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: '123456' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not initiated/i);
        });

        it('should reject non-6-digit code', async () => {
            const { accessToken } = await registerUser();

            await request.post('/api/auth/2fa/setup').set('Authorization', `Bearer ${accessToken}`);

            const res = await request
                .post('/api/auth/2fa/setup/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: '12345' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login (with 2FA)', () => {
        it('should return requiresTwoFactor when 2FA is enabled', async () => {
            const { accessToken } = await registerUser();
            await setupTwoFactor(accessToken);

            const res = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            expect(res.status).toBe(200);
            expect(res.body.data.requiresTwoFactor).toBe(true);
            expect(res.body.data.twoFactorToken).toBeDefined();
            expect(res.body.data.accessToken).toBeUndefined();
            expect(res.body.data.refreshToken).toBeUndefined();
        });

        it('should return tokens normally when 2FA is not enabled', async () => {
            await registerUser();

            const res = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            expect(res.status).toBe(200);
            expect(res.body.data.requiresTwoFactor).toBeUndefined();
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
        });

        it('should include isTwoFactorEnabled in login response when 2FA is off', async () => {
            await registerUser();

            const res = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            expect(res.status).toBe(200);
            expect(res.body.data.user.isTwoFactorEnabled).toBe(false);
        });
    });

    describe('POST /api/auth/2fa/verify-login', () => {
        it('should complete login with valid 2FA code', async () => {
            const { accessToken } = await registerUser();
            const secret = await setupTwoFactor(accessToken);

            // Login to get the pending token
            const loginRes = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            const { twoFactorToken } = loginRes.body.data;
            const code = generateSync({ secret });

            const res = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken, code });

            expect(res.status).toBe(200);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
            expect(res.body.data.user.email).toBe('totp@example.com');
            expect(res.body.data.user.isTwoFactorEnabled).toBe(true);
        });

        it('should reject invalid 2FA code', async () => {
            const { accessToken } = await registerUser();
            await setupTwoFactor(accessToken);

            const loginRes = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            const { twoFactorToken } = loginRes.body.data;

            const res = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken, code: '000000' });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/invalid/i);
        });

        it('should reject expired two-factor token', async () => {
            // Create a token that has already expired
            const jwt = require('jsonwebtoken');
            const { JWT_SECRET } = require('../config');

            const { accessToken, user } = await registerUser();
            await setupTwoFactor(accessToken);

            const expiredToken = jwt.sign(
                { userId: user._id, purpose: '2fa_pending' },
                JWT_SECRET,
                { expiresIn: '0s' },
            );

            // Small delay to ensure expiry
            await new Promise((r) => setTimeout(r, 50));

            const secret = (await User.findById(user._id).select('+twoFactorSecret'))
                .twoFactorSecret;
            const code = generateSync({ secret });

            const res = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken: expiredToken, code });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/invalid or expired/i);
        });

        it('should reject token with wrong purpose', async () => {
            const jwt = require('jsonwebtoken');
            const { JWT_SECRET } = require('../config');

            const { accessToken, user } = await registerUser();
            const secret = await setupTwoFactor(accessToken);

            const wrongToken = jwt.sign({ userId: user._id, purpose: 'not_2fa' }, JWT_SECRET, {
                expiresIn: '5m',
            });

            const code = generateSync({ secret });

            const res = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken: wrongToken, code });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/invalid/i);
        });

        it('should reject completely invalid token', async () => {
            const res = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken: 'garbage', code: '123456' });

            expect(res.status).toBe(401);
        });

        it('should reject missing code', async () => {
            const res = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken: 'some-token' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/2fa/disable', () => {
        it('should disable 2FA with valid code', async () => {
            const { accessToken, user } = await registerUser();
            const secret = await setupTwoFactor(accessToken);

            const code = generateSync({ secret });

            const res = await request
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code });

            expect(res.status).toBe(200);

            const dbUser = await User.findById(user._id).select('+twoFactorSecret');
            expect(dbUser.isTwoFactorEnabled).toBe(false);
            expect(dbUser.twoFactorSecret).toBeUndefined();
        });

        it('should reject invalid code', async () => {
            const { accessToken } = await registerUser();
            await setupTwoFactor(accessToken);

            const res = await request
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: '000000' });

            expect(res.status).toBe(401);
        });

        it('should reject if 2FA is not enabled', async () => {
            const { accessToken } = await registerUser();

            const res = await request
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: '123456' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not enabled/i);
        });

        it('should allow normal login after disabling 2FA', async () => {
            const { accessToken } = await registerUser();
            const secret = await setupTwoFactor(accessToken);

            // Disable
            const code = generateSync({ secret });
            await request
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code });

            // Login should return tokens directly (no 2FA challenge)
            const loginRes = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.data.requiresTwoFactor).toBeUndefined();
            expect(loginRes.body.data.accessToken).toBeDefined();
            expect(loginRes.body.data.refreshToken).toBeDefined();
        });

        it('should require authentication', async () => {
            const res = await request.post('/api/auth/2fa/disable').send({ code: '123456' });

            expect(res.status).toBe(401);
        });
    });

    describe('Full 2FA lifecycle', () => {
        it('should support enable → login with 2FA → disable → login without 2FA', async () => {
            // 1. Register
            const { accessToken } = await registerUser();

            // 2. Enable 2FA
            const secret = await setupTwoFactor(accessToken);

            // 3. Login — should require 2FA
            const login1 = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            expect(login1.body.data.requiresTwoFactor).toBe(true);

            // 4. Complete 2FA login
            const code1 = generateSync({ secret });
            const verify1 = await request
                .post('/api/auth/2fa/verify-login')
                .send({ twoFactorToken: login1.body.data.twoFactorToken, code: code1 });

            expect(verify1.status).toBe(200);
            expect(verify1.body.data.accessToken).toBeDefined();

            // 5. Disable 2FA
            const code2 = generateSync({ secret });
            const disableRes = await request
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${verify1.body.data.accessToken}`)
                .send({ code: code2 });

            expect(disableRes.status).toBe(200);

            // 6. Login again — should NOT require 2FA
            const login2 = await request
                .post('/api/auth/login')
                .send({ email: 'totp@example.com', password: 'Str0ngP@ss' });

            expect(login2.status).toBe(200);
            expect(login2.body.data.requiresTwoFactor).toBeUndefined();
            expect(login2.body.data.accessToken).toBeDefined();
        });
    });
});

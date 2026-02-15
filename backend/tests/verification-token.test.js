const mongoose = require('mongoose');
const { setupTestApp, teardownTestApp, clearCollections } = require('./helpers');
const VerificationToken = require('../models/VerificationToken');
const GlobalUser = require('../models/GlobalUser');

let userId;

beforeAll(async () => {
    await setupTestApp();

    // Create a user to associate tokens with
    const user = await GlobalUser.create({
        email: 'token-test@example.com',
        password: 'Password123!',
        firstName: 'Token',
        lastName: 'Test',
    });
    userId = user._id;
});

afterAll(async () => {
    await teardownTestApp();
});

afterEach(async () => {
    await VerificationToken.deleteMany({});
});

describe('VerificationToken Model', () => {
    describe('createToken()', () => {
        it('should create a token with correct fields', async () => {
            const doc = await VerificationToken.createToken(userId, 'email_verification', 24);

            expect(doc.user.toString()).toBe(userId.toString());
            expect(doc.type).toBe('email_verification');
            expect(doc.token).toBeDefined();
            expect(doc.token.length).toBe(64); // 32 bytes = 64 hex chars
            expect(doc.expiresAt).toBeInstanceOf(Date);
            expect(doc.usedAt).toBeNull();
        });

        it('should set expiry correctly', async () => {
            const before = Date.now();
            const doc = await VerificationToken.createToken(userId, 'password_reset', 1);
            const after = Date.now();

            const expectedMin = before + 1 * 60 * 60 * 1000;
            const expectedMax = after + 1 * 60 * 60 * 1000;

            expect(doc.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
            expect(doc.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
        });

        it('should invalidate prior tokens of the same type', async () => {
            const first = await VerificationToken.createToken(userId, 'email_verification', 24);
            const second = await VerificationToken.createToken(userId, 'email_verification', 24);

            // First token should be invalidated (usedAt set)
            const firstRefreshed = await VerificationToken.findById(first._id);
            expect(firstRefreshed.usedAt).not.toBeNull();

            // Second token should be valid
            const secondRefreshed = await VerificationToken.findById(second._id);
            expect(secondRefreshed.usedAt).toBeNull();
        });

        it('should not invalidate tokens of different types', async () => {
            const emailToken = await VerificationToken.createToken(
                userId,
                'email_verification',
                24,
            );
            const resetToken = await VerificationToken.createToken(userId, 'password_reset', 1);

            // Email token should still be valid (usedAt still null after reset token created)
            // Actually, creating the email token first, then creating a password_reset should not affect it
            const emailRefreshed = await VerificationToken.findById(emailToken._id);
            expect(emailRefreshed.usedAt).toBeNull();

            const resetRefreshed = await VerificationToken.findById(resetToken._id);
            expect(resetRefreshed.usedAt).toBeNull();
        });

        it('should store metadata', async () => {
            const doc = await VerificationToken.createToken(userId, 'invite', 48, {
                invitedBy: 'admin-user-id',
            });

            expect(doc.metadata.invitedBy).toBe('admin-user-id');
        });
    });

    describe('findValidToken()', () => {
        it('should find a valid unexpired token', async () => {
            const created = await VerificationToken.createToken(userId, 'email_verification', 24);

            const found = await VerificationToken.findValidToken(
                created.token,
                'email_verification',
            );

            expect(found).toBeDefined();
            expect(found.token).toBe(created.token);
        });

        it('should not find an expired token', async () => {
            const created = await VerificationToken.createToken(userId, 'email_verification', 24);

            // Manually expire
            await VerificationToken.updateOne(
                { _id: created._id },
                { expiresAt: new Date(Date.now() - 1000) },
            );

            const found = await VerificationToken.findValidToken(
                created.token,
                'email_verification',
            );
            expect(found).toBeNull();
        });

        it('should not find a used token', async () => {
            const created = await VerificationToken.createToken(userId, 'email_verification', 24);
            await created.consume();

            const found = await VerificationToken.findValidToken(
                created.token,
                'email_verification',
            );
            expect(found).toBeNull();
        });

        it('should not find token with wrong type', async () => {
            const created = await VerificationToken.createToken(userId, 'email_verification', 24);

            const found = await VerificationToken.findValidToken(created.token, 'password_reset');
            expect(found).toBeNull();
        });

        it('should return null for non-existent token', async () => {
            const found = await VerificationToken.findValidToken(
                'nonexistent',
                'email_verification',
            );
            expect(found).toBeNull();
        });
    });

    describe('consume()', () => {
        it('should set usedAt to current date', async () => {
            const created = await VerificationToken.createToken(userId, 'email_verification', 24);

            const before = new Date();
            await created.consume();
            const after = new Date();

            const refreshed = await VerificationToken.findById(created._id);
            expect(refreshed.usedAt).toBeDefined();
            expect(refreshed.usedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(refreshed.usedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });
});

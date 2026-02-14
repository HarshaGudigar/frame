const request = require('supertest');
const { setupTestApp, teardownTestApp, registerAndGetToken } = require('./helpers');
const GlobalUser = require('../models/GlobalUser');

describe('RBAC & User Management', () => {
    let app, requestAgent;
    let ownerToken, adminToken, staffToken, userToken;

    beforeAll(async () => {
        ({ app, request: requestAgent } = await setupTestApp());

        // Create Users with different roles
        // We need to manually update roles in DB because register endpoint defaults to 'user'/

        // 1. Owner
        ownerToken = await registerAndGetToken(requestAgent, {
            email: 'owner@example.com',
            firstName: 'Owner',
            lastName: 'User',
        });
        await GlobalUser.updateOne({ email: 'owner@example.com' }, { role: 'owner' });

        // 2. Admin
        adminToken = await registerAndGetToken(requestAgent, {
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
        });
        await GlobalUser.updateOne({ email: 'admin@example.com' }, { role: 'admin' });

        // 3. Staff
        staffToken = await registerAndGetToken(requestAgent, {
            email: 'staff@example.com',
            firstName: 'Staff',
            lastName: 'User',
        });
        await GlobalUser.updateOne({ email: 'staff@example.com' }, { role: 'staff' });

        // 4. User (default)
        userToken = await registerAndGetToken(requestAgent, {
            email: 'user@example.com',
            firstName: 'Regular',
            lastName: 'User',
        });
    });

    afterAll(async () => {
        await teardownTestApp();
    });

    describe('GET /api/admin/users', () => {
        it('should allow owner to list users', async () => {
            const res = await requestAgent
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(4);
        });

        it('should deny access to admin (Owner only route)', async () => {
            const res = await requestAgent
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(403);
        });

        it('should deny access to staff', async () => {
            const res = await requestAgent
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/admin/users/invite', () => {
        it('should allow admin to invite new user', async () => {
            const res = await requestAgent
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'newbie@example.com',
                    firstName: 'New',
                    lastName: 'Bie',
                    role: 'user',
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.user.email).toBe('newbie@example.com');
        });

        it('should deny staff from inviting users', async () => {
            const res = await requestAgent
                .post('/api/admin/users/invite')
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    email: 'hacker@example.com',
                    firstName: 'Hacker',
                    lastName: 'Man',
                    role: 'admin',
                });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/admin/users/:id', () => {
        it('should allow owner to deactivate user', async () => {
            // Find a user to delete (the newbie created above)
            const user = await GlobalUser.findOne({ email: 'newbie@example.com' });

            const res = await requestAgent
                .delete(`/api/admin/users/${user._id}`)
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(res.statusCode).toBe(200);

            const deletedUser = await GlobalUser.findById(user._id);
            expect(deletedUser.isActive).toBe(false);
        });

        it('should prevent deleting yourself', async () => {
            const owner = await GlobalUser.findOne({ email: 'owner@example.com' });

            const res = await requestAgent
                .delete(`/api/admin/users/${owner._id}`)
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(res.statusCode).toBe(400);
        });
    });

    describe('PATCH /api/admin/users/:id/role', () => {
        it('should allow owner to update a user role', async () => {
            const user = await GlobalUser.findOne({ email: 'user@example.com' });

            const res = await requestAgent
                .patch(`/api/admin/users/${user._id}/role`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ role: 'admin' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.role).toBe('admin');

            const updatedUser = await GlobalUser.findById(user._id);
            expect(updatedUser.role).toBe('admin');
        });

        it('should deny role update by admin (Owner only)', async () => {
            const user = await GlobalUser.findOne({ email: 'staff@example.com' });

            const res = await requestAgent
                .patch(`/api/admin/users/${user._id}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'owner' });

            expect(res.statusCode).toBe(403);
        });

        it('should prevent changing your own role', async () => {
            const owner = await GlobalUser.findOne({ email: 'owner@example.com' });

            const res = await requestAgent
                .patch(`/api/admin/users/${owner._id}/role`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ role: 'user' });

            expect(res.statusCode).toBe(400);
        });
    });
});

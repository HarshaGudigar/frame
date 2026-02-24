const {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
} = require('./helpers');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

describe('Audit Logging Integration', () => {
    let request;
    let superuserToken;

    beforeAll(async () => {
        const ctx = await setupTestApp();
        request = ctx.request;
    });

    afterAll(async () => {
        await teardownTestApp();
    });

    beforeEach(async () => {
        await clearCollections();
        // Register and get token for owner
        superuserToken = await registerAndGetToken(request, {
            email: 'audit-superuser@example.com',
            role: 'superuser',
            firstName: 'Audit',
            lastName: 'Owner',
        });
    });

    it('should create an audit log when inviting a user', async () => {
        const res = await request
            .post('/api/admin/users/invite')
            .set('Authorization', `Bearer ${superuserToken}`)
            .send({
                email: 'audit-test-user@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'user',
            });

        expect(res.status).toBe(201);

        const log = await AuditLog.findOne({ action: 'USER_INVITED' });
        expect(log).toBeDefined();
        expect(log.target).toBe('audit-test-user@example.com');

        const owner = await User.findOne({ email: 'audit-superuser@example.com' });
        expect(log.user.toString()).toBe(owner._id.toString());
    });

    it('should return paginated audit logs', async () => {
        // Create multiple logs
        for (let i = 0; i < 15; i++) {
            await AuditLog.create({
                user: (await User.findOne({ email: 'audit-superuser@example.com' }))._id,
                action: 'PAGINATION_TEST',
                target: `Log ${i}`,
            });
        }

        const res = await request
            .get('/api/admin/audit-logs?page=1&limit=10')
            .set('Authorization', `Bearer ${superuserToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.logs.length).toBe(10);
        expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(15);
        expect(res.body.data.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should filter audit logs by action', async () => {
        // Create a specific log
        await AuditLog.create({
            user: (await User.findOne({ email: 'audit-superuser@example.com' }))._id,
            action: 'FILTER_TEST_ACTION',
            target: 'Filter Target',
        });

        const res = await request
            .get('/api/admin/audit-logs?action=FILTER_TEST_ACTION')
            .set('Authorization', `Bearer ${superuserToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.logs.length).toBe(1);
        expect(res.body.data.logs[0].action).toBe('FILTER_TEST_ACTION');
    });
});

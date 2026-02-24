const {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
} = require('./helpers');

let request;
let token;

beforeAll(async () => {
    const ctx = await setupTestApp();
    request = ctx.request;
});

afterAll(async () => {
    await teardownTestApp();
});

beforeEach(async () => {
    await clearCollections();
    token = await registerAndGetToken(request, { role: 'superuser' });
});

describe('GET /api/admin/app-config', () => {
    it('should retrieve instance configuration', async () => {
        const res = await request
            .get('/api/admin/app-config')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.instanceName).toBeDefined();
    });

    it('should require superuser or admin role', async () => {
        // Staff role should also have read access according to admin.js:54
        const staffToken = await registerAndGetToken(request, {
            email: 'staff-read@test.com',
            role: 'staff',
        });
        const res = await request
            .get('/api/admin/app-config')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
    });
});

describe('PATCH /api/admin/app-config', () => {
    it('should update instance configuration', async () => {
        const res = await request
            .patch('/api/admin/app-config')
            .set('Authorization', `Bearer ${token}`)
            .send({ instanceName: 'Updated Instance' });

        expect(res.status).toBe(200);
        expect(res.body.data.instanceName).toBe('Updated Instance');
    });

    it('should deny update for staff', async () => {
        const staffToken = await registerAndGetToken(request, {
            email: 'staff-write@test.com',
            role: 'staff',
        });
        const res = await request
            .patch('/api/admin/app-config')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ instanceName: 'Hacked' });

        expect(res.status).toBe(403);
    });
});

describe('GET /api/admin/users', () => {
    it('should list all users', async () => {
        const res = await request.get('/api/admin/users').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should deny staff from listing users', async () => {
        const staffToken = await registerAndGetToken(request, {
            email: 'staff-users@test.com',
            role: 'staff',
        });
        const res = await request
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(403);
    });
});

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
    token = await registerAndGetToken(request, { role: 'admin' });
});

describe('POST /api/admin/tenants', () => {
    const validTenant = {
        name: 'Acme Corp',
        slug: 'acme-corp',
    };

    it('should create a tenant', async () => {
        const res = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send(validTenant);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Acme Corp');
        expect(res.body.data.slug).toBe('acme-corp');
    });

    it('should reject duplicate slug with 409', async () => {
        await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send(validTenant);

        const res = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send(validTenant);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('should reject missing name (Zod)', async () => {
        const res = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ slug: 'test-slug' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
        );
    });

    it('should reject invalid slug format', async () => {
        const res = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Test', slug: 'Invalid Slug!' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'slug' })]),
        );
    });

    it('should require auth', async () => {
        const res = await request.post('/api/admin/tenants').send(validTenant);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/admin/tenants', () => {
    it('should list all tenants', async () => {
        await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tenant A', slug: 'tenant-a' });
        await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tenant B', slug: 'tenant-b' });

        const res = await request.get('/api/admin/tenants').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array when no tenants', async () => {
        const res = await request.get('/api/admin/tenants').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });
});

describe('GET /api/admin/tenants/:id', () => {
    it('should get a specific tenant', async () => {
        const createRes = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Acme', slug: 'acme' });

        const id = createRes.body.data._id;

        const res = await request
            .get(`/api/admin/tenants/${id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.slug).toBe('acme');
    });

    it('should return 404 for nonexistent ID', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const res = await request
            .get(`/api/admin/tenants/${fakeId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    it('should reject invalid ID format', async () => {
        const res = await request
            .get('/api/admin/tenants/not-a-valid-id')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });
});

describe('PUT /api/admin/tenants/:id', () => {
    it('should update a tenant', async () => {
        const createRes = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Original', slug: 'original' });

        const id = createRes.body.data._id;

        const res = await request
            .put(`/api/admin/tenants/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Updated Name' });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated Name');
    });
});

describe('DELETE /api/admin/tenants/:id', () => {
    it('should delete a tenant', async () => {
        const createRes = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'ToDelete', slug: 'to-delete' });

        const id = createRes.body.data._id;

        const res = await request
            .delete(`/api/admin/tenants/${id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);

        // Verify it's gone
        const getRes = await request
            .get(`/api/admin/tenants/${id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(getRes.status).toBe(404);
    });
});

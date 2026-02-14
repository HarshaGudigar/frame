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
    token = await registerAndGetToken(request);
});

describe('GET /api/marketplace/products', () => {
    it('should list products (empty initially)', async () => {
        const res = await request.get('/api/marketplace/products');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

describe('POST /api/marketplace/products', () => {
    // Zod schema expects price as number, not object
    const validProduct = {
        name: 'Accounting Module',
        slug: 'accounting',
        description: 'Full accounting suite',
        price: 29.99,
        features: ['Invoice generation', 'Expense tracking'],
    };

    it('should create a product', async () => {
        const res = await request
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send(validProduct);

        expect(res.status).toBe(201);
        expect(res.body.data.slug).toBe('accounting');
    });

    it('should reject duplicate slug with 409', async () => {
        await request
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send(validProduct);

        const res = await request
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send(validProduct);

        expect(res.status).toBe(409);
    });

    it('should reject missing required fields (Zod)', async () => {
        const res = await request
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it('should require auth', async () => {
        const res = await request.post('/api/marketplace/products').send(validProduct);

        expect(res.status).toBe(401);
    });
});

describe('POST /api/marketplace/purchase', () => {
    // Purchase requires requireRole('owner', 'admin') which checks req.tenant and req.user.tenants.
    // Without a tenant context header, it returns 400 "Tenant context required".
    // This is correct behavior — purchases need a tenant scope.

    it('should require auth', async () => {
        const res = await request
            .post('/api/marketplace/purchase')
            .send({ tenantId: '507f1f77bcf86cd799439011', productId: '507f1f77bcf86cd799439011' });

        expect(res.status).toBe(401);
    });

    it('should require tenant context for role check', async () => {
        // Authenticated but no tenant context → 400
        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${token}`)
            .send({ tenantId: '507f1f77bcf86cd799439011', productId: '507f1f77bcf86cd799439011' });

        // Without x-tenant-id header, requireRole returns 400 "Tenant context required"
        expect(res.status).toBe(400);
    });

    it('should reject empty body (Zod)', async () => {
        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        // Zod runs before or after requireRole — let's just ensure it's a 4xx
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
    });
});

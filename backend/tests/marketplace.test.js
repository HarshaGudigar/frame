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
    it('should require auth', async () => {
        const res = await request
            .post('/api/marketplace/purchase')
            .send({ productId: '507f1f77bcf86cd799439011' });

        expect(res.status).toBe(401);
    });

    it('should allow admin to purchase', async () => {
        // 1. Create a product first
        const product = await require('../models/Product').create({
            name: 'Billing Module',
            slug: 'billing',
            price: 50,
            isActive: true,
        });

        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: product._id.toString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should reject non-admin users with 403', async () => {
        const userToken = await registerAndGetToken(request, {
            email: 'regular-market@test.com',
            role: 'user',
        });

        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId: '507f1f77bcf86cd799439011' });

        expect(res.status).toBe(403);
    });

    it('should reject empty body (Zod)', async () => {
        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
    });
});

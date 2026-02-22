const {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
} = require('./helpers');
const Tenant = require('../models/Tenant');
const Product = require('../models/Product');
const Subscription = require('../models/Subscription');
const UsageMeter = require('../models/UsageMeter');

let request;
let app;
let adminToken;
let ownerToken;

beforeAll(async () => {
    const ctx = await setupTestApp();
    app = ctx.app;
    request = ctx.request;
});

afterAll(async () => {
    await teardownTestApp();
});

beforeEach(async () => {
    await clearCollections();
    adminToken = await registerAndGetToken(request, { email: 'admin@test.com', role: 'admin' });
    ownerToken = await registerAndGetToken(request, { email: 'owner@test.com', role: 'owner' });
});

describe('Phase 2 Completion Verification', () => {
    describe('Marketplace Hardening & Search', () => {
        it('should support search and category filtering in /products', async () => {
            await Product.create([
                { name: 'Hotel Module', slug: 'hotel', category: 'Operations', isActive: true },
                { name: 'Billing Module', slug: 'billing', category: 'Finance', isActive: true },
                { name: 'Archived Module', slug: 'archived', category: 'General', isActive: false },
            ]);

            // Test Search
            const resSearch = await request.get('/api/marketplace/products?search=Hotel');
            expect(resSearch.body.data.length).toBe(1);
            expect(resSearch.body.data[0].slug).toBe('hotel');

            // Test Category
            const resCat = await request.get('/api/marketplace/products?category=Finance');
            expect(resCat.body.data.length).toBe(1);
            expect(resCat.body.data[0].slug).toBe('billing');
        });

        it('should allow editing and soft-deleting products', async () => {
            const product = await Product.create({ name: 'Old Name', slug: 'old-slug' });

            // Edit
            const resEdit = await request
                .put(`/api/marketplace/products/${product._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'New Name' });
            expect(resEdit.body.data.name).toBe('New Name');

            // Delete (Soft)
            await request
                .delete(`/api/marketplace/products/${product._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            const deleted = await Product.findById(product._id);
            expect(deleted.isActive).toBe(false);
        });
    });

    describe('Dependency Validation', () => {
        it('should reject purchase if dependencies are missing', async () => {
            const tenant = await Tenant.create({ name: 'Test Tenant', slug: 'test-tenant' });
            const billing = await Product.create({
                name: 'Billing',
                slug: 'billing',
                dependencies: ['hotel'],
            });

            const res = await request
                .post('/api/marketplace/purchase')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-tenant-id', 'test-tenant')
                .send({ tenantId: tenant._id.toString(), productId: billing._id.toString() });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Missing required dependencies: hotel');
        });
    });

    describe('Tenant Lifecycle & Suspension', () => {
        it('should block API access for suspended tenants', async () => {
            const tenant = await Tenant.create({
                name: 'Suspended Tenant',
                slug: 'suspended-tenant',
                status: 'suspended',
            });

            const res = await request
                .get('/api/admin/tenants')
                .set('x-tenant-id', 'suspended-tenant');

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('suspended');
        });

        it('should export tenant data (Owner only)', async () => {
            const tenant = await Tenant.create({ name: 'Export Tenant', slug: 'export-tenant' });

            const res = await request
                .get(`/api/admin/tenants/${tenant._id}/export`)
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.tenant.slug).toBe('export-tenant');
            expect(res.body.exportedAt).toBeDefined();
        });
    });

    describe('Usage Tracking', () => {
        it('should meter API calls via usageMiddleware', async () => {
            const tenant = await Tenant.create({
                name: 'Usage Tenant',
                slug: 'usage-tenant',
                subscribedModules: ['billing'],
            });

            // Mock a billing request with the module header
            await request
                .get('/api/m/billing/dashboard') // The route doesn't have to exist, usage middleware applies first
                .set('x-tenant-id', 'usage-tenant')
                .set('x-module-id', 'billing');

            // Give it a moment to fire-and-forget
            await new Promise((r) => setTimeout(r, 100));

            const usage = await UsageMeter.findOne({ tenant: tenant._id, module: 'billing' });
            expect(usage).toBeDefined();
            expect(usage.callCount).toBe(1);
        });
    });
});

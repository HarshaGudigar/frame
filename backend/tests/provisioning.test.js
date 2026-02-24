const {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
} = require('./helpers');
const AppConfig = require('../models/AppConfig');
const Product = require('../models/Product');
const socketService = require('../utils/socket');

// Mock the socket service
jest.mock('../utils/socket', () => ({
    emitEvent: jest.fn(),
    getIO: jest.fn(),
}));

let request;
let app;
let token;

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
    token = await registerAndGetToken(request, { role: 'admin' });
    jest.clearAllMocks();
});

describe('Provisioning Engine', () => {
    it('should call onProvision hook and emit socket event on purchase', async () => {
        // 1. Ensure AppConfig exists
        const config = await AppConfig.getInstance();

        // 2. Create a product that matches a mocked module
        const product = await Product.create({
            name: 'Test Module',
            slug: 'test-module',
            price: 0,
            isActive: true,
        });

        // 3. Inject a dummy module manifest with an onProvision spy into app.locals.modules
        const onProvisionSpy = jest.fn().mockResolvedValue(true);
        app.locals.modules = [
            {
                name: 'Test Module',
                slug: 'test-module',
                onProvision: onProvisionSpy,
                routes: require('express').Router(),
            },
        ];

        // 4. Perform the purchase
        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${token}`)
            .send({
                productId: product._id.toString(),
            });

        // 5. Assertions
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify onProvision was called with the AppConfig object
        expect(onProvisionSpy).toHaveBeenCalled();
        const calledConfig = onProvisionSpy.mock.calls[0][0];
        expect(calledConfig.instanceName).toBe(config.instanceName);

        // Verify socket events were emitted
        expect(socketService.emitEvent).toHaveBeenCalledWith(
            'module:provisioned',
            expect.objectContaining({
                productSlug: 'test-module',
            }),
            'admin',
        );
    });

    it('should not fail purchase if onProvision hook fails', async () => {
        const product = await Product.create({
            name: 'Faulty Module',
            slug: 'faulty-module',
            price: 0,
            isActive: true,
        });

        const onProvisionSpy = jest.fn().mockRejectedValue(new Error('Provisioning failed!'));
        app.locals.modules = [
            {
                name: 'Faulty Module',
                slug: 'faulty-module',
                onProvision: onProvisionSpy,
                routes: require('express').Router(),
            },
        ];

        const res = await request
            .post('/api/marketplace/purchase')
            .set('Authorization', `Bearer ${token}`)
            .send({
                productId: product._id.toString(),
            });

        // Assertions: Purchase should still succeed
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(onProvisionSpy).toHaveBeenCalled();
    });
});

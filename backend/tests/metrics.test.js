const request = require('supertest');
const { setupTestApp, teardownTestApp } = require('./helpers');
const Tenant = require('../models/Tenant');
const Metric = require('../models/Metric');
const GlobalUser = require('../models/GlobalUser');
const { HEARTBEAT_SECRET } = require('../config');

describe('Analytics & Metrics', () => {
    let app, requestAgent;
    let adminToken;

    beforeAll(async () => {
        ({ app, request: requestAgent } = await setupTestApp());

        // Register admin for testing retrieval endpoints
        const res = await requestAgent.post('/api/auth/register').send({
            email: 'admin-metrics@example.com',
            password: 'password123',
            firstName: 'Admin',
            lastName: 'Metrics',
        });
        adminToken = res.body.data.accessToken;
        await GlobalUser.updateOne(
            { email: 'admin-metrics@example.com' },
            { role: 'admin', isEmailVerified: true },
        );

        // Create a test tenant
        await Tenant.create({
            name: 'Metrics Test',
            slug: 'metrics-test',
            owner: '507f1f77bcf86cd799439011',
        });
    });

    afterAll(async () => {
        await teardownTestApp();
    });

    it('should create a metric record on heartbeat', async () => {
        const payload = {
            tenantId: 'metrics-test',
            metrics: {
                cpu: 45,
                ram: 60,
                uptime: 3600,
                version: '1.0.0',
            },
        };

        const res = await requestAgent
            .post('/api/admin/heartbeat')
            .set('x-api-key', HEARTBEAT_SECRET)
            .send(payload);

        expect(res.statusCode).toBe(200);

        // Check if Metric record was created
        const metric = await Metric.findOne({ tenantId: 'metrics-test' });
        expect(metric).toBeDefined();
        expect(metric.metrics.cpu).toBe(45);

        // Check if Tenant was updated
        const tenant = await Tenant.findOne({ slug: 'metrics-test' });
        expect(tenant.status).toBe('online');
        expect(tenant.metrics.cpu).toBe(45);
    });

    it('should retrieve historical metrics', async () => {
        const res = await requestAgent
            .get('/api/admin/metrics/metrics-test')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].metrics.cpu).toBe(45);
    });

    it('should retrieve fleet statistics', async () => {
        const res = await requestAgent
            .get('/api/admin/fleet/stats')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.total).toBeGreaterThan(0);
        expect(res.body.data.averages.avgCpu).toBe(45);
    });
});

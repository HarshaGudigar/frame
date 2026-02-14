const { setupTestApp, teardownTestApp } = require('./helpers');

describe('Health Check', () => {
    let app, request;

    beforeAll(async () => {
        ({ app, request } = await setupTestApp());
    });

    afterAll(async () => {
        await teardownTestApp();
    });

    describe('GET /api/health', () => {
        it('should return 200 OK and health status', async () => {
            const res = await request.get('/api/health');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(
                expect.objectContaining({
                    success: true,
                    mode: expect.any(String),
                    database: expect.objectContaining({
                        status: 'connected',
                    }),
                    modules: expect.any(Array), // This might be the issue if modules is missing
                }),
            );
        });
    });
});

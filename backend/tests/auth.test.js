const { setupTestApp, teardownTestApp, clearCollections } = require('./helpers');

let request;

beforeAll(async () => {
    const ctx = await setupTestApp();
    request = ctx.request;
});

afterAll(async () => {
    await teardownTestApp();
});

afterEach(async () => {
    await clearCollections();
});

describe('POST /api/auth/register', () => {
    const validUser = {
        email: 'alice@example.com',
        password: 'Str0ngP@ss',
        firstName: 'Alice',
        lastName: 'Smith',
    };

    it('should register a new user and return a token', async () => {
        const res = await request.post('/api/auth/register').send(validUser);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('should reject duplicate email with 409', async () => {
        await request.post('/api/auth/register').send(validUser);
        const res = await request.post('/api/auth/register').send(validUser);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already registered/i);
    });

    it('should reject empty body (Zod validation)', async () => {
        const res = await request.post('/api/auth/register').send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject invalid email format', async () => {
        const res = await request
            .post('/api/auth/register')
            .send({ email: 'not-an-email', password: 'Test123!' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'email', source: 'body' })]),
        );
    });

    it('should reject password shorter than 6 characters', async () => {
        const res = await request
            .post('/api/auth/register')
            .send({ email: 'bob@example.com', password: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'password' })]),
        );
    });
});

describe('POST /api/auth/login', () => {
    const user = {
        email: 'alice@example.com',
        password: 'Str0ngP@ss',
        firstName: 'Alice',
    };

    beforeEach(async () => {
        await request.post('/api/auth/register').send(user);
    });

    it('should login with correct credentials', async () => {
        const res = await request
            .post('/api/auth/login')
            .send({ email: user.email, password: user.password });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
        const res = await request
            .post('/api/auth/login')
            .send({ email: user.email, password: 'WrongPassword!' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should reject nonexistent user', async () => {
        const res = await request
            .post('/api/auth/login')
            .send({ email: 'nobody@example.com', password: 'Test123!' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should reject empty body (Zod validation)', async () => {
        const res = await request.post('/api/auth/login').send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });
});

describe('Protected routes', () => {
    it('should reject requests without a token', async () => {
        const res = await request.get('/api/admin/tenants');

        expect(res.status).toBe(401);
    });

    it('should reject requests with an invalid token', async () => {
        const res = await request
            .get('/api/admin/tenants')
            .set('Authorization', 'Bearer invalid-token');

        expect(res.status).toBe(401);
    });

    it('should accept requests with a valid token', async () => {
        const { registerAndGetToken } = require('./helpers');
        const token = await registerAndGetToken(request, {
            email: 'admin@test.com',
            password: 'Test123!',
            role: 'admin',
        });

        const res = await request.get('/api/admin/tenants').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

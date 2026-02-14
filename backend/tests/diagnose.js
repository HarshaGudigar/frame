const { setupTestApp, teardownTestApp } = require('./helpers');

(async () => {
    const { request } = await setupTestApp();

    // 1. Login empty body
    const r1 = await request.post('/api/auth/login').send({});
    console.log('LOGIN_EMPTY status:', r1.status, 'errors:', r1.body.errors?.length);

    // 2. Login nonexistent user
    const r2 = await request
        .post('/api/auth/login')
        .send({ email: 'nobody@x.com', password: 'Test123!' });
    console.log('LOGIN_NONEX status:', r2.status, 'body:', JSON.stringify(r2.body));

    // 3. Register (check token path)
    const r3 = await request
        .post('/api/auth/register')
        .send({ email: 'tok@x.com', password: 'Test123!' });
    console.log('REG status:', r3.status, 'has_token:', !!r3.body.data?.token);
    console.log('REG body:', JSON.stringify(r3.body));

    await teardownTestApp();
    process.exit(0);
})();

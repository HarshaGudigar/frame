const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { deriveTenantDbUri } = require('../utils/tenantDBCache');

let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
    if (mongod) {
        await mongod.stop();
    }
});

describe('deriveTenantDbUri', () => {
    it('should replace the DB name in a standard mongodb:// URI', () => {
        const uri = deriveTenantDbUri('mongodb://localhost:27017/mern-app', 'acme-corp');
        expect(uri).toBe('mongodb://localhost:27017/frame_tenant_acme-corp');
    });

    it('should replace the DB name in a URI with auth credentials', () => {
        const uri = deriveTenantDbUri('mongodb://user:pass@host:27017/mydb', 'test-org');
        expect(uri).toBe('mongodb://user:pass@host:27017/frame_tenant_test-org');
    });

    it('should preserve query parameters', () => {
        const uri = deriveTenantDbUri(
            'mongodb://localhost:27017/mern-app?retryWrites=true&w=majority',
            'acme',
        );
        expect(uri).toBe('mongodb://localhost:27017/frame_tenant_acme?retryWrites=true&w=majority');
    });

    it('should handle mongodb+srv:// URIs', () => {
        const uri = deriveTenantDbUri(
            'mongodb+srv://user:pass@cluster0.abc.mongodb.net/mydb?retryWrites=true',
            'demo',
        );
        expect(uri).toBe(
            'mongodb+srv://user:pass@cluster0.abc.mongodb.net/frame_tenant_demo?retryWrites=true',
        );
    });

    it('should handle URIs with no database name', () => {
        const uri = deriveTenantDbUri('mongodb://localhost:27017/', 'slug');
        expect(uri).toBe('mongodb://localhost:27017/frame_tenant_slug');
    });

    it('should handle URIs with no trailing slash and no DB name', () => {
        const uri = deriveTenantDbUri('mongodb://localhost:27017', 'slug');
        expect(uri).toBe('mongodb://localhost:27017/frame_tenant_slug');
    });
});

describe('Tenant Database Provisioning (integration)', () => {
    const { provisionTenantDatabase, dropTenantDatabase } = require('../utils/tenantDBCache');

    it('should provision a tenant database and return a valid URI', async () => {
        const dbUri = await provisionTenantDatabase('integration-test');
        expect(dbUri).toContain('frame_tenant_integration-test');

        // Verify we can connect to the provisioned database
        const conn = mongoose.createConnection(dbUri);
        await conn.asPromise();
        expect(conn.readyState).toBe(1);
        await conn.close();
    });

    it('should drop a provisioned tenant database without error', async () => {
        const dbUri = await provisionTenantDatabase('drop-test');

        // Write something so the DB actually exists
        const conn = mongoose.createConnection(dbUri);
        await conn.asPromise();
        await conn.db.collection('test').insertOne({ ping: true });
        await conn.close();

        // Drop should not throw
        await expect(dropTenantDatabase(dbUri)).resolves.not.toThrow();
    });
});

describe('Tenant CRUD with provisioning', () => {
    const { setupTestApp, teardownTestApp, registerAndGetToken } = require('./helpers');
    let request, token;

    beforeAll(async () => {
        // Disconnect the connection from our outer beforeAll to avoid conflicts
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.dropDatabase();
            await mongoose.disconnect();
        }
        if (mongod) {
            await mongod.stop();
            mongod = null;
        }

        ({ request } = await setupTestApp());
        token = await registerAndGetToken(request, {
            email: 'admin@test.com',
            role: 'owner',
        });
    });

    afterAll(async () => {
        await teardownTestApp();
    });

    it('should populate dbUri when creating a tenant', async () => {
        const res = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Acme Corp', slug: 'acme-corp' });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.dbUri).toMatch(/frame_tenant_acme-corp/);
    });

    it('dbUri should follow frame_tenant_{slug} naming convention', async () => {
        const res = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Beta Inc', slug: 'beta-inc' });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.dbUri).toContain('frame_tenant_beta-inc');
    });

    it('should delete a tenant with a provisioned dbUri', async () => {
        const createRes = await request
            .post('/api/admin/tenants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Delete Me', slug: 'delete-me' });

        const tenantId = createRes.body.data._id;

        const deleteRes = await request
            .delete(`/api/admin/tenants/${tenantId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.statusCode).toBe(200);
    });
});

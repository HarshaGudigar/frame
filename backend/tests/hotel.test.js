const {
    setupTestApp,
    teardownTestApp,
    clearCollections,
    registerAndGetToken,
} = require('./helpers');
const Tenant = require('../models/Tenant');

let request;
let token;
let tenantSlug = 'hotel-test-tenant';

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

    // Create a tenant for the module context
    // In test environment, dbUri should point to the in-memory mongo
    const config = require('../config');
    await Tenant.create({
        name: 'Hotel Test Tenant',
        slug: tenantSlug,
        isActive: true,
        subscribedModules: ['hotel'],
        dbUri: config.MONGODB_URI,
    });
});

describe('Hotel Module API', () => {
    const authHeader = () => ({
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantSlug,
    });

    describe('Rooms API', () => {
        const validRoom = {
            number: '101',
            type: 'Single',
            pricePerNight: 100,
            floor: 1,
            amenities: ['TV', 'AC'],
            description: 'Standard single room',
        };

        it('should create a room', async () => {
            const res = await request.post('/api/m/hotel/rooms').set(authHeader()).send(validRoom);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.number).toBe('101');
        });

        it('should list rooms', async () => {
            await request.post('/api/m/hotel/rooms').set(authHeader()).send(validRoom);

            const res = await request.get('/api/m/hotel/rooms').set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('Customers API', () => {
        const validCustomer = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '1234567890',
            city: 'New York',
        };

        it('should create a customer', async () => {
            const res = await request
                .post('/api/m/hotel/customers')
                .set(authHeader())
                .send(validCustomer);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.firstName).toBe('John');
        });
    });

    describe('Bookings API', () => {
        it('should create a booking', async () => {
            // 1. Create a room first
            const roomRes = await request.post('/api/m/hotel/rooms').set(authHeader()).send({
                number: '201',
                type: 'Double',
                pricePerNight: 200,
                floor: 2,
            });

            const roomId = roomRes.body.data._id;

            // 2. Create a booking
            const bookingData = {
                customerData: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    phone: '9876543210',
                },
                roomId: roomId,
                checkInDate: new Date().toISOString(), // This produces something like 2023-10-27T10:00:00.000Z
                numberOfDays: 3,
                serviceType: '24 Hours',
                checkInType: 'Walk In',
            };

            const res = await request
                .post('/api/m/hotel/bookings')
                .set(authHeader())
                .send(bookingData);

            if (res.status !== 201) {
                console.log('Booking Creation Failed:', JSON.stringify(res.body, null, 2));
            }

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            // Since the route populates the room, we should check res.body.data.room._id
            expect(res.body.data.room._id.toString()).toBe(roomId.toString());
        });
    });
});

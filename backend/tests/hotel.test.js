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

describe('Hotel Module API', () => {
    const authHeader = () => ({
        Authorization: `Bearer ${token}`,
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
                roomIds: [roomId],
                checkInDate: new Date().toISOString(),
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

            const returnedRooms = res.body.data.rooms || [res.body.data.room];
            expect(returnedRooms[0]._id.toString()).toBe(roomId.toString());
        });
    });

    describe('New Features - Verification', () => {
        it('should update room status via status-only endpoint', async () => {
            const roomRes = await request.post('/api/m/hotel/rooms').set(authHeader()).send({
                number: '301',
                type: 'Suite',
                pricePerNight: 500,
                floor: 3,
            });
            const roomId = roomRes.body.data._id;

            const res = await request
                .patch(`/api/m/hotel/rooms/${roomId}/status`)
                .set(authHeader())
                .send({ status: 'Dirty' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('Dirty');
        });

        it('should allow uploading an ID proof (mocked file)', async () => {
            // Create a dummy file for testing
            const fs = require('fs');
            const path = require('path');
            const testFilePath = path.join(__dirname, 'test-image.jpg');
            fs.writeFileSync(testFilePath, 'dummy content');

            const res = await request
                .post('/api/m/hotel/uploads/id-proof')
                .set(authHeader())
                .attach('file', testFilePath);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('url');
            expect(res.body.data.url).toMatch(/^\/uploads\/hotel\/id-proofs\//);

            // Cleanup
            fs.unlinkSync(testFilePath);
        });

        it('should save idProofImageUrl in customer record', async () => {
            const customerData = {
                firstName: 'Alice',
                lastName: 'Smith',
                phone: '1112223333',
                idProofImageUrl: '/uploads/hotel/id-proofs/test.jpg',
            };

            const res = await request
                .post('/api/m/hotel/customers')
                .set(authHeader())
                .send(customerData);

            expect(res.status).toBe(201);
            expect(res.body.data.idProofImageUrl).toBe(customerData.idProofImageUrl);
        });
    });
});

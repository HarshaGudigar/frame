const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const BASE_URL_HOTEL = 'http://localhost:5000/api/m/hotel';
const TENANT_SLUG = 'hotel-test';

const test = async () => {
    try {
        console.log('--- Starting Hotel Feature Verification ---');

        // 1. Login
        console.log('1. Logging in as admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@alyxnet.com',
            password: 'password123',
        });
        const token = loginRes.data.data.accessToken;
        const config = {
            headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': TENANT_SLUG },
        };

        // 2. Clear/Setup Rooms
        console.log('2. Setting up test rooms...');

        // Clean up existing rooms if any
        const existingRooms = await axios.get(`${BASE_URL_HOTEL}/rooms`, config);
        for (const r of existingRooms.data.data) {
            if (['101', '102'].includes(r.number)) {
                await axios.delete(`${BASE_URL_HOTEL}/rooms/${String(r._id)}`, config);
            }
        }

        const r1 = await axios.post(
            `${BASE_URL_HOTEL}/rooms`,
            { number: '101', type: 'Single', pricePerNight: 100, floor: 1 },
            config,
        );
        const r2 = await axios.post(
            `${BASE_URL_HOTEL}/rooms`,
            { number: '102', type: 'Double', pricePerNight: 200, floor: 1 },
            config,
        );
        const r1Id = String(r1.data.data._id);
        const r2Id = String(r2.data.data._id);
        console.log(`- Created rooms: 101 (${r1Id}), 102 (${r2Id})`);

        // 3. Test Group Booking (Multi-room)
        console.log('3. Testing Group Booking creation...');
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + 1);

        const bookingRes = await axios.post(
            `${BASE_URL_HOTEL}/bookings`,
            {
                roomIds: [r1Id, r2Id],
                checkInDate: checkInDate.toISOString(),
                numberOfDays: 2,
                customerData: {
                    firstName: 'Test',
                    lastName: 'Guest',
                    email: `test${Date.now()}@test.com`,
                    phone: '1234567890',
                },
            },
            config,
        );
        const bookingId = String(bookingRes.data.data._id);
        const checkInNumber = bookingRes.data.data.checkInNumber;
        console.log(
            `- Created group booking ${bookingId} for rooms 101, 102. Check-in #: ${checkInNumber}`,
        );

        // 4. Test Check-in
        console.log('4. Testing Group Check-in...');
        const checkInRes = await axios.post(
            `${BASE_URL_HOTEL}/bookings/${bookingId}/check-in`,
            {},
            config,
        );
        console.log(`- Check-in result: ${checkInRes.data.message}`);

        const room1 = await axios.get(`${BASE_URL_HOTEL}/rooms/${r1Id}`, config);
        const room2 = await axios.get(`${BASE_URL_HOTEL}/rooms/${r2Id}`, config);
        console.log(`- Room 101 status: ${room1.data.data.status}`);
        console.log(`- Room 102 status: ${room2.data.data.status}`);

        // 5. Test Check-out & Housekeeping Auto-generation
        console.log('5. Testing Group Check-out & Housekeeping Trigger...');
        await axios.post(`${BASE_URL_HOTEL}/bookings/${bookingId}/check-out`, {}, config);

        const room1Dirty = await axios.get(`${BASE_URL_HOTEL}/rooms/${r1Id}`, config);
        console.log(`- Room 101 status after checkout: ${room1Dirty.data.data.status}`);

        const tasksRes = await axios.get(`${BASE_URL_HOTEL}/housekeeping`, config);
        const tasks = tasksRes.data.data;
        const bookingTasks = tasks.filter((t) => t.notes && t.notes.includes(checkInNumber));
        console.log(`- Housekeeping tasks generated: ${bookingTasks.length} (Expected 2)`);

        // 6. Test Housekeeping Task Completion
        if (bookingTasks.length > 0) {
            console.log('6. Testing Housekeeping Task Completion...');
            const taskId = String(bookingTasks[0]._id);
            console.log(`- Task ID to update: "${taskId}" (Length: ${taskId.length})`);
            await axios.patch(
                `${BASE_URL_HOTEL}/housekeeping/${taskId}/status`,
                { status: 'Completed' },
                config,
            );

            const cleanedRoomId = String(bookingTasks[0].room._id || bookingTasks[0].room);
            const roomCleaned = await axios.get(`${BASE_URL_HOTEL}/rooms/${cleanedRoomId}`, config);
            console.log(
                `- Room ${roomCleaned.data.data.number} status after cleaning: ${roomCleaned.data.data.status} (Expected Available)`,
            );
        }

        // 7. Test Inventory CRUD
        console.log('7. Testing Inventory Management...');
        const invRes = await axios.post(
            `${BASE_URL_HOTEL}/inventory`,
            {
                name: 'Soap',
                category: 'Toiletries',
                quantity: 5,
                minThreshold: 10,
            },
            config,
        );
        const itemId = String(invRes.data.data._id);
        console.log(`- Added inventory item: ${invRes.data.data.name}`);

        const lowStock = await axios.get(`${BASE_URL_HOTEL}/inventory?lowStock=true`, config);
        console.log(`- Low stock items count: ${lowStock.data.data.length} (Expected at least 1)`);

        // 8. Test Reporting
        console.log('8. Testing Management Reports...');
        const report = await axios.get(`${BASE_URL_HOTEL}/reports/summary`, config);
        console.log('- Metrics retrieved:', JSON.stringify(report.data.data.metrics, null, 2));

        console.log('--- Verification Successful ---');
    } catch (error) {
        console.error('!!! Verification Failed !!!');
        if (error.response) {
            console.error(
                'Response error:',
                error.response.status,
                JSON.stringify(error.response.data, null, 2),
            );
        } else {
            console.error('Error message:', error.message);
        }
        process.exit(1);
    }
};

test();

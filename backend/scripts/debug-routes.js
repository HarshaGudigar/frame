const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TENANT_ID = 'hotel-test';

const debug = async () => {
    try {
        console.log('--- System Health Check ---');
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('Health Output:', JSON.stringify(health.data, null, 2));

        if (health.data.modules) {
            console.log(
                'Found modules:',
                health.data.modules.map((m) => m.slug),
            );
            const hotelModule = health.data.modules.find((m) => m.slug === 'hotel');
            if (hotelModule) {
                console.log('Hotel Module API Base:', hotelModule.apiBase);
            } else {
                console.log('!!! Hotel module NOT FOUND in health check !!!');
            }
        }

        console.log('\n--- Testing Login ---');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@alyxnet.com',
            password: 'password123',
        });
        const token = loginRes.data.data.accessToken;
        console.log('Login successful');

        const config = { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': TENANT_ID } };

        console.log('\n--- Testing Hotel Rooms List ---');
        // Try both /api/m/hotel/rooms and /api/hotel/rooms just in case
        try {
            const res1 = await axios.get(`${BASE_URL}/m/hotel/rooms`, config);
            console.log('GET /api/m/hotel/rooms: SUCCESS', res1.status);
        } catch (e) {
            console.log(
                'GET /api/m/hotel/rooms: FAILED',
                e.response ? e.response.status : e.message,
            );
        }
    } catch (error) {
        console.error('!!! Debug Failed !!!');
        if (error.response) {
            console.error('Response error:', error.response.status, error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
    }
};

debug();

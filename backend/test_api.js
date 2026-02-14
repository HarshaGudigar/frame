const axios = require('axios');

async function test() {
    try {
        console.log('--- LOGGING IN AS OWNER ---');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'owner@example.com',
            password: 'password123',
        });
        const token = loginRes.data.data.token;
        console.log('Role from response:', loginRes.data.data.user.role);

        console.log('\n--- FETCHING FLEET STATS ---');
        const statsRes = await axios.get('http://localhost:5000/api/admin/fleet/stats', {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Stats status:', statsRes.status);
        console.log('Stats data:', JSON.stringify(statsRes.data.data, null, 2));

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
    } catch (err) {
        console.error('\n--- TEST FAILED ---');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Body:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

test();

/**
 * One-shot script to enable Hotel module on the deployed server via API.
 * Run with: node scripts/enable-hotel-deployed.js
 */
const https = require('https');
const http = require('http');
const DEPLOYED_API = 'http://13.232.95.78:5000';
const ADMIN_EMAIL = 'admin@frame.local';
const ADMIN_PASSWORD = 'Admin@123';

function post(url, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 80,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        };
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(options, (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(raw));
                } catch (e) {
                    reject(new Error(`Parse error: ${raw}`));
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 80,
            path: parsed.pathname,
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        };
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(options, (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(raw));
                } catch (e) {
                    reject(new Error(`Parse error: ${raw}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('1. Logging in to deployed server...');
    const loginRes = await post(`${DEPLOYED_API}/api/auth/login`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    });
    const token = loginRes?.data?.accessToken;
    if (!token) {
        console.error('Login failed:', JSON.stringify(loginRes));
        process.exit(1);
    }
    console.log(`   Logged in as ${loginRes.data.user?.role} successfully.`);

    console.log('\n2. Fetching marketplace products...');
    const productsRes = await get(`${DEPLOYED_API}/api/marketplace/products`, token);
    const products = productsRes?.data || [];
    console.log(`   Found ${products.length} products: ${products.map((p) => p.slug).join(', ')}`);

    const hotel = products.find((p) => p.slug && p.slug.toLowerCase().includes('hotel'));
    if (!hotel) {
        console.error('Hotel product not found in marketplace!');
        process.exit(1);
    }
    console.log(`   Hotel product: "${hotel.name}" (ID: ${hotel._id})`);

    console.log('\n3. Enabling Hotel module...');
    const purchaseRes = await post(
        `${DEPLOYED_API}/api/marketplace/purchase`,
        { productId: hotel._id },
        token,
    );
    if (purchaseRes.success) {
        console.log(`   SUCCESS: ${purchaseRes.message}`);
    } else if (purchaseRes.message && purchaseRes.message.includes('Already enabled')) {
        console.log(`   NOTE: Hotel module was already enabled.`);
    } else {
        console.error('   FAILED:', JSON.stringify(purchaseRes));
        process.exit(1);
    }

    console.log('\n4. Verifying Hotel module access...');
    const roomsRes = await get(`${DEPLOYED_API}/api/m/hotel/rooms`, token);
    if (roomsRes.success) {
        console.log(`   Hotel rooms API working! Found ${roomsRes.data?.length ?? 0} rooms.`);
    } else {
        console.error('   Hotel rooms API still failing:', JSON.stringify(roomsRes));
    }

    console.log('\nDone!');
}

main().catch(console.error);

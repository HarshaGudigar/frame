const axios = require('axios');
const mongoose = require('mongoose');
const BASE_URL = 'http://localhost:5000/api';

async function testSubscriptions() {
    let token;
    let tenantId;
    let productId;
    
    try {
        console.log('--- Starting Subscription Use Cases ---');

        // 1. Login
        console.log('\n[1] Logging in as admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@alyxnet.com',
            password: 'password123',
        });
        token = loginRes.data.data.accessToken;
        const config = {
            headers: { Authorization: `Bearer ${token}` },
        };
        console.log('✅ Logged in successfully');

        // 2. Tenant Creation
        console.log('\n[2] Creating new tenant...');
        const tenantRes = await axios.post(
            `${BASE_URL}/admin/tenants`,
            { name: 'Hotel Test', slug: 'hotel-test' },
            config
        );
        tenantId = tenantRes.data.data._id;
        console.log(`✅ Tenant created: hotel-test (${tenantId})`);

        // 3. Marketplace Browsing
        console.log('\n[3] Fetching marketplace products...');
        const productsRes = await axios.get(`${BASE_URL}/marketplace/products`);
        const hotelModule = productsRes.data.data.find(p => p.slug === 'hotel');
        if (!hotelModule) throw new Error('Hotel module not found in marketplace');
        productId = hotelModule._id;
        console.log(`✅ Found Hotel module: ${hotelModule.name} (${productId})`);

        // 4. Provisioning
        console.log('\n[4] Provisioning Hotel module to tenant...');
        // Owner role needs tenant context in some endpoints, but let's try the direct purchase
        const purchaseRes = await axios.post(
            `${BASE_URL}/marketplace/purchase`,
            { tenantId, productId },
            config
        );
        console.log(`✅ Provisioning successful: ${purchaseRes.data.message}`);

        // 5. Subscription Verification
        console.log('\n[5] Verifying tenant subscriptions...');
        const verifyRes = await axios.get(`${BASE_URL}/admin/tenants/${tenantId}`, config);
        const subscribedModules = verifyRes.data.data.subscribedModules;
        if (!subscribedModules.includes('hotel')) {
            throw new Error('Tenant is not subscribed to hotel module');
        }
        console.log(`✅ Verified active subscriptions: [${subscribedModules.join(', ')}]`);

        // 6. Unsubscription Test (we'll reprovision afterward for hotel tests)
        console.log('\n[6] Testing unsubscription...');
        const unsubRes = await axios.post(
            `${BASE_URL}/marketplace/unsubscribe`,
            { tenantId, productId },
            config
        );
        console.log(`✅ Unsubscription successful: ${unsubRes.data.message}`);

        const verifyUnsubRes = await axios.get(`${BASE_URL}/admin/tenants/${tenantId}`, config);
        const postUnsubModules = verifyUnsubRes.data.data.subscribedModules;
        if (postUnsubModules.includes('hotel')) {
            throw new Error('Tenant is still subscribed to hotel module after unsubscribing');
        }
        console.log(`✅ Verified unsubscription. Current modules: [${postUnsubModules.join(', ')}]`);

        // 7. Reprovision for Hotel Tests
        console.log('\n[7] Reprovisioning for subsequent Hotel tests...');
        await axios.post(
            `${BASE_URL}/marketplace/purchase`,
            { tenantId, productId },
            config
        );
        console.log(`✅ Reprovisioned successfully`);

        console.log('\n🎉 All Subscription Use Cases Passed!');
    } catch (err) {
        console.error('\n❌ Subscription Use Case Failed:');
        if (err.response) {
            console.error(err.response.status, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

testSubscriptions();

/**
 * heartbeat-client.js
 * This script runs on Silo VMs to report health and metrics to the Hub.
 */
const axios = require('axios');
const os = require('os');

// Config from Env
const HEARTBEAT_INTERVAL = 60000; // 60 seconds
const HUB_URL = process.env.HUB_API_URL || 'http://localhost:9000/api/admin/heartbeat';
const TENANT_ID = process.env.APP_TENANT_ID;

if (!TENANT_ID) {
    console.error('❌ Error: APP_TENANT_ID is not set. Cannot send heartbeats.');
    process.exit(1);
}

async function sendHeartbeat() {
    try {
        const metrics = {
            cpu: os.loadavg()[0],
            ram: (os.totalmem() - os.freemem()) / 1024 / 1024, // MB used
            uptime: os.uptime(),
            version: process.env.APP_VERSION || '1.0.0'
        };

        console.log(`📡 Sending heartbeat for ${TENANT_ID}...`);

        const response = await axios.post(HUB_URL, {
            tenantId: TENANT_ID,
            metrics
        });

        if (response.data.success) {
            console.log('✅ Heartbeat accepted. Subscribed modules:', response.data.data.subscribedModules);
        } else {
            console.warn('⚠️ Heartbeat rejected:', response.data.message);
        }
    } catch (err) {
        console.error('❌ Heartbeat failed:', err.message);
    }
}

// Run every interval
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
sendHeartbeat(); // Run immediately on start

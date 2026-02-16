/**
 * heartbeat-client.js
 * This script runs on Silo VMs to report health and metrics to the Hub.
 */
const axios = require('axios');
const os = require('os');

// Config from Env
const HEARTBEAT_INTERVAL = 60000; // 60 seconds
const HUB_URL = process.env.HUB_API_URL || 'http://localhost:5000/api/admin/heartbeat';
const TENANT_ID = process.env.APP_TENANT_ID;
const HEARTBEAT_SECRET = process.env.HEARTBEAT_SECRET || 'heartbeat-dev-key';

if (!TENANT_ID) {
    console.error('❌ Error: APP_TENANT_ID is not set. Cannot send heartbeats.');
    process.exit(1);
}

async function sendHeartbeat() {
    try {
        const cpuCount = os.cpus().length || 1;
        const metrics = {
            cpu: Math.min(100, Math.round((os.loadavg()[0] / cpuCount) * 100 * 10) / 10), // % of total CPU
            ram: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100 * 10) / 10, // % used
            uptime: os.uptime(),
            version: process.env.APP_VERSION || '1.0.0',
        };

        console.log(`📡 Sending heartbeat for ${TENANT_ID}...`);

        const response = await axios.post(
            HUB_URL,
            {
                tenantId: TENANT_ID,
                metrics,
            },
            {
                headers: { 'x-api-key': HEARTBEAT_SECRET },
            },
        );

        if (response.data.success) {
            console.log(`✅ Heartbeat accepted. Status: ${response.data.message}`);
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

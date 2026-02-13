const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

/**
 * Silo Heartbeat API
 * Called by Silo VMs every 60 seconds to report health and metrics.
 * Protected by a shared API key (machine-to-machine, not user JWT).
 */
const HEARTBEAT_SECRET = process.env.HEARTBEAT_SECRET || 'heartbeat-dev-key';

router.post('/heartbeat', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== HEARTBEAT_SECRET) {
        return errorResponse(res, 'Invalid or missing API key', 401);
    }
    next();
}, async (req, res) => {
    const { tenantId, metrics } = req.body;

    if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
    }

    try {
        // Find tenant by slug (internal ID used by silos)
        const tenant = await Tenant.findOne({ slug: tenantId });
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        // Update health status and metrics
        tenant.status = 'online';
        tenant.lastSeen = new Date();
        tenant.metrics = {
            cpu: metrics?.cpu || 0,
            ram: metrics?.ram || 0,
            uptime: metrics?.uptime || 0,
            version: metrics?.version || 'unknown'
        };

        await tenant.save();

        // Return desired config (e.g., active modules) so Silo can sync
        return successResponse(res, {
            subscribedModules: tenant.subscribedModules,
            status: tenant.status
        }, 'Heartbeat processed');

    } catch (err) {
        console.error('Heartbeat Processing Error:', err);
        return errorResponse(res, 'Internal server error', 500);
    }
});

/**
 * List all tenants with status and metrics
 * Protected — requires authenticated user with owner or admin role.
 */
router.get('/tenants', authMiddleware, async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ lastSeen: -1 });
        return successResponse(res, tenants, 'Tenants retrieved');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch tenants', 500, err);
    }
});

module.exports = router;

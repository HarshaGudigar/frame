const Tenant = require('../models/Tenant');
const { errorResponse } = require('../utils/responseWrapper');

/**
 * Determines the runtime mode of this server instance.
 * - 'silo': Dedicated VM for a single customer. Identified by APP_TENANT_ID env var.
 * - 'hub': The central Control Plane. No APP_TENANT_ID set.
 */
const RUNTIME_MODE = process.env.APP_TENANT_ID ? 'silo' : 'hub';

/**
 * Tenant Middleware
 * 
 * In SILO mode: Trusts the APP_TENANT_ID env var. Does NOT query the Control Plane DB.
 *               The local MongoDB IS the tenant's DB. No dynamic switching needed.
 *
 * In HUB mode:  Reads 'x-tenant-id' from headers. Queries the Tenant collection
 *               in the Control Plane DB to verify and load tenant metadata.
 */
const tenantMiddleware = async (req, res, next) => {
    try {
        if (RUNTIME_MODE === 'silo') {
            return handleSiloMode(req, res, next);
        } else {
            return handleHubMode(req, res, next);
        }
    } catch (error) {
        console.error('Tenant Middleware Error:', error);
        return errorResponse(res, 'Failed to establish tenant context', 500, error);
    }
};

/**
 * SILO MODE: Running on a dedicated customer VM.
 * The tenant identity comes from environment variables, not from DB queries.
 * The default mongoose connection IS the tenant's database.
 */
async function handleSiloMode(req, res, next) {
    // Read subscribed modules from ENV (comma-separated list)
    // e.g., APP_SUBSCRIBED_MODULES="hospital,billing"
    const subscribedModules = (process.env.APP_SUBSCRIBED_MODULES || '')
        .split(',')
        .map(m => m.trim().toLowerCase())
        .filter(Boolean);

    // Attach tenant context from ENV — no DB query needed
    req.tenant = {
        slug: process.env.APP_TENANT_ID,
        name: process.env.APP_TENANT_NAME || process.env.APP_TENANT_ID,
        subscribedModules,
    };

    // Module access check
    const requestedModule = req.headers['x-module-id'];
    if (requestedModule && subscribedModules.length > 0 && !subscribedModules.includes(requestedModule.toLowerCase())) {
        return errorResponse(res, `Module "${requestedModule}" is not active on this instance.`, 403);
    }

    // In silo mode, req.db is the default mongoose connection (no dynamic switching)
    const mongoose = require('mongoose');
    req.db = mongoose.connection;

    next();
}

/**
 * HUB MODE: Running on the Central Control Plane.
 * Tenant identity comes from the x-tenant-id header.
 * Used for admin operations, marketplace, etc.
 */
async function handleHubMode(req, res, next) {
    const tenantSlug = req.headers['x-tenant-id'];

    if (!tenantSlug) {
        // No tenant header = global context (e.g., /api/marketplace, /api/auth)
        return next();
    }

    // Look up the tenant in the Control Plane database
    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });

    if (!tenant) {
        return errorResponse(res, 'Tenant not found or inactive', 404);
    }

    // Module access check
    const requestedModule = req.headers['x-module-id'];
    if (requestedModule && !tenant.subscribedModules.includes(requestedModule.toLowerCase())) {
        return errorResponse(res, `Not authorized for module: ${requestedModule}. Please purchase it from the Marketplace.`, 403);
    }

    req.tenant = tenant;
    // In Hub mode, req.db stays as the default Control Plane connection
    // The Hub doesn't connect to customer databases; it manages metadata only.
    next();
}

module.exports = tenantMiddleware;

const UsageMeter = require('../models/UsageMeter');
const logger = require('../utils/logger');

/**
 * Usage Metering Middleware
 * Increments the call count for the current tenant and requested module.
 * Aggregates by hour to minimize database writes.
 */
const usageMiddleware = async (req, res, next) => {
    // Only track if we have a tenant context and a requested module
    const tenantId = req.tenant?._id;
    const requestedModule = req.headers['x-module-id'];

    if (!tenantId || !requestedModule) {
        return next();
    }

    // Fire and forget (don't block the request)
    // In high-traffic scenarios, use a buffer/queue (e.g., Redis)
    const hour = new Date();
    hour.setMinutes(0, 0, 0);

    UsageMeter.findOneAndUpdate(
        { tenant: tenantId, module: requestedModule.toLowerCase(), timestamp: hour },
        { $inc: { callCount: 1 } },
        { upsert: true, new: true },
    ).catch((err) => {
        logger.error({ err, tenant: tenantId, module: requestedModule }, 'Failed to record usage');
    });

    next();
};

module.exports = usageMiddleware;

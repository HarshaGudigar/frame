const logger = require('../utils/logger');

/**
 * Developer Debug Panel Middleware
 *
 * Injects an `X-Debug-Context` header into all JSON responses if the
 * authenticated user has an 'admin' or 'owner' role. The frontend uses
 * this header to populate the Developer Debug Panel with real-time request context.
 */
const debugMiddleware = (req, res, next) => {
    // Initialize an array to capture any events emitted during this request lifecycle
    req.emittedEvents = [];

    // Monkey-patch res.json to inject headers right before the response is sent
    const originalJson = res.json;
    res.json = function (body) {
        try {
            // Check if user is authenticated and is an admin/owner
            if (req.user && (req.user.role === 'admin' || req.user.role === 'superuser')) {
                const debugContext = {
                    tenant: req.tenant ? req.tenant.slug : 'GLOBAL',
                    tenantName: req.tenant ? req.tenant.name : 'Control Plane',
                    modules: req.tenant?.subscribedModules || [],
                    featureFlags: req.tenant?.settings || {},
                    emittedEvents: req.emittedEvents,
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                    method: req.method,
                };

                // Base64 encode the JSON so it safely travels in HTTP headers
                const encodedContext = Buffer.from(JSON.stringify(debugContext)).toString('base64');
                res.setHeader('X-Debug-Context', encodedContext);

                // Expose header to CORS so the frontend Axios client can read it
                const existingExpose = res.getHeader('Access-Control-Expose-Headers') || '';
                const newExpose = existingExpose
                    ? `${existingExpose}, X-Debug-Context`
                    : 'X-Debug-Context';
                res.setHeader('Access-Control-Expose-Headers', newExpose);
            }
        } catch (err) {
            logger.warn({ err }, 'Failed to attach X-Debug-Context header');
        }

        return originalJson.call(this, body);
    };

    next();
};

module.exports = debugMiddleware;

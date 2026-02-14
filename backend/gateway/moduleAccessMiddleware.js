/**
 * Module Access Middleware — Checks tenant subscription before routing to a module.
 * 
 * Returns 403 if the tenant has not subscribed to the requested module.
 * In HUB mode, requires the x-tenant-id header to identify the tenant.
 */

const { errorResponse } = require('../utils/responseWrapper');

/**
 * Creates a module access checker for a specific module slug.
 * 
 * @param {string} moduleSlug - The slug of the module to check access for
 * @returns {Function} Express middleware
 */
function createModuleAccessMiddleware(moduleSlug) {
    return (req, res, next) => {
        // No tenant context = can't check subscription
        if (!req.tenant) {
            return errorResponse(
                res,
                'Tenant context required to access modules. Provide x-tenant-id header.',
                400
            );
        }

        const subscribedModules = req.tenant.subscribedModules || [];
        const isSubscribed = subscribedModules.includes(moduleSlug);

        if (!isSubscribed) {
            return errorResponse(
                res,
                `Module "${moduleSlug}" is not active for tenant "${req.tenant.name || req.tenant.slug}". Purchase it from the Marketplace.`,
                403
            );
        }

        // Attach module context to request
        req.module = { slug: moduleSlug };
        next();
    };
}

module.exports = createModuleAccessMiddleware;

/**
 * Module Access Middleware — Checks instance subscription before routing to a module.
 * 
 * Returns 403 if the instance has not enabled the requested module.
 */

const { errorResponse } = require('../utils/responseWrapper');
const AppConfig = require('../models/AppConfig');
const config = require('../config');

/**
 * Creates a module access checker for a specific module slug.
 * 
 * @param {string} moduleSlug - The slug of the module to check access for
 * @returns {Function} Express middleware
 */
function createModuleAccessMiddleware(moduleSlug) {
    return async (req, res, next) => {
        try {
            // In SILO mode, all registered modules are inherently allowed
            if (config.RUNTIME_MODE === 'SILO') {
                req.module = { slug: moduleSlug };
                return next();
            }

            const appConfig = await AppConfig.getInstance();
            const subscribedModules = appConfig.enabledModules || [];
            const isSubscribed = subscribedModules.some(
                (m) => m === moduleSlug || (m && m.slug === moduleSlug)
            );

            if (!isSubscribed) {
                return errorResponse(
                    res,
                    `Module "${moduleSlug}" is not enabled for this instance. Enable it from the Marketplace.`,
                    403
                );
            }

            // Attach module context to request
            req.module = { slug: moduleSlug };
            next();
        } catch (err) {
            return errorResponse(res, 'Failed to check module access', 500, err);
        }
    };
}

module.exports = createModuleAccessMiddleware;

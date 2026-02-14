const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseWrapper');
const { JWT_SECRET } = require('../config');
const GlobalUser = require('../models/GlobalUser');

/**
 * Auth Middleware
 * Verifies the JWT token and attaches the full user object to req.user.
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 'Authentication required. Provide a Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch full user with role and tenant access
        // We select '+role' if it was set to select: false, but it's true by default.
        // We might need to populate references if we used them, but tenants structure is embedded.
        const user = await GlobalUser.findById(decoded.userId || decoded.id);

        if (!user) {
            return errorResponse(res, 'User not found', 401);
        }

        req.user = user;

        // Tenant Context Role Override
        // If x-tenant-id header is present, we check if user belongs to that tenant
        // and override req.user.role with the tenant-specific role for this request context.
        const tenantId = req.headers['x-tenant-id'];
        if (tenantId && user.tenants) {
            const tenantAccess = user.tenants.find((t) => t.tenant.toString() === tenantId);

            if (tenantAccess) {
                // We add a temporary property for the effective role in this context
                // Or we can just mutate role (but be careful if we save the user doc later)
                // Let's use a separate property 'effectiveRole' or just 'role' if we don't save.
                // Since Mongoose docs are objects, let's set a non-persisted property.
                req.user.role = tenantAccess.role;
            }
        }

        next();
    } catch (error) {
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

/**
 * Role Guard Factory
 * Checks if req.user.role matches allowed roles.
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return errorResponse(res, 'Unauthorized', 403);
        }

        const userRole = String(req.user.role);

        // Owner bypass — owner has superuser access to all admin routes
        if (userRole === 'owner') {
            return next();
        }

        if (!allowedRoles.includes(userRole)) {
            return errorResponse(res, `Forbidden. Requires: ${allowedRoles.join(', ')}`, 403);
        }

        next();
    };
};

module.exports = { authMiddleware, requireRole };

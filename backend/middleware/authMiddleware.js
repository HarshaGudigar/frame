const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseWrapper');
const { JWT_SECRET } = require('../config');
const GlobalUser = require('../models/GlobalUser');
const logger = require('../utils/logger');

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
        // req.tenant is resolved by tenantMiddleware (slug → full Tenant doc) before this runs.
        if (req.tenant?._id && user.tenants) {
            const tenantAccess = user.tenants.find(
                (t) => t.tenant.toString() === req.tenant._id.toString(),
            );

            if (tenantAccess) {
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
            logger.warn(
                { hasUser: !!req.user, role: req.user?.role },
                'Unauthorized: Missing user or role',
            );
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

/**
 * Verified Email Guard
 * Requires the authenticated user to have a verified email address.
 * Must be used after authMiddleware.
 */
const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, 'Authentication required', 401);
    }

    // Bypass for development
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        return next();
    }

    if (!req.user.isEmailVerified) {
        return errorResponse(
            res,
            'Email verification required. Please verify your email address.',
            403,
        );
    }

    next();
};

module.exports = { authMiddleware, requireRole, requireVerifiedEmail };

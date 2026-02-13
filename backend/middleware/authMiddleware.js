const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseWrapper');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';

/**
 * Auth Middleware
 * Verifies the JWT token from the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 'Authentication required. Provide a Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, tenants: [...] }
        next();
    } catch (error) {
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

/**
 * Role Guard Factory
 * Returns middleware that checks if the user has the required role
 * for the current tenant context.
 * 
 * Usage: router.post('/admin-action', requireRole('admin'), handler);
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 'Authentication required', 401);
        }

        if (!req.tenant) {
            return errorResponse(res, 'Tenant context required', 400);
        }

        // Find user's role for the current tenant
        const tenantAccess = req.user.tenants?.find(
            t => t.tenant === req.tenant._id?.toString() || t.tenant === req.tenant.slug
        );

        if (!tenantAccess || !allowedRoles.includes(tenantAccess.role)) {
            return errorResponse(res, `Requires one of: ${allowedRoles.join(', ')}`, 403);
        }

        next();
    };
};

module.exports = { authMiddleware, requireRole };

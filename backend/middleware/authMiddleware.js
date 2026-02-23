const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseWrapper');
const { JWT_SECRET } = require('../config');
const GlobalUser = require('../models/GlobalUser');
const Role = require('../models/Role');
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
        const user = await GlobalUser.findById(decoded.userId || decoded.id);

        if (!user) {
            return errorResponse(res, 'User not found', 401);
        }

        req.user = user;
        let queryContext = { tenantId: null };

        // Tenant Context Role Override
        if (req.tenant?._id && user.tenants) {
            const tenantAccess = user.tenants.find(
                (t) => t.tenant.toString() === req.tenant._id.toString(),
            );

            if (tenantAccess) {
                req.user.role = tenantAccess.role;
                queryContext.tenantId = req.tenant._id;
            }
        }

        // Fetch Granular Permissions from Role Matrix
        const roleDoc = await Role.findOne({ name: req.user.role, ...queryContext });

        if (roleDoc) {
            req.user.permissions = roleDoc.permissions;
        } else if (req.user.role === 'owner') {
            // Absolute bypass for system owners
            req.user.permissions = ['*'];
        } else {
            req.user.permissions = [];
            logger.warn(
                { role: req.user.role, tenantId: queryContext.tenantId },
                'Role document not found, defaulting to zero permissions',
            );
        }

        next();
    } catch (_error) {
        return errorResponse(res, 'Invalid or expired token', 401);
    }
};

/**
 * Role Guard Factory (Legacy - to be deprecated)
 * Checks if req.user.role matches allowed roles.
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return errorResponse(res, 'Unauthorized', 403);
        }

        const userRole = String(req.user.role);

        if (userRole === 'owner' || allowedRoles.includes(userRole)) {
            return next();
        }

        return errorResponse(
            res,
            `Forbidden. Requires legacy role: ${allowedRoles.join(', ')}`,
            403,
        );
    };
};

/**
 * Permission Guard Factory (New Matrix System)
 * Checks if req.user.permissions includes the required permission string.
 */
const requirePermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return errorResponse(res, 'Unauthorized', 403);
        }

        // Owner bypass
        if (req.user.role === 'owner' || req.user.permissions.includes('*')) {
            return next();
        }

        // Check if user has ANY of the required permissions (OR logic)
        const hasPermission = requiredPermissions.some((perm) =>
            req.user.permissions.includes(perm),
        );

        if (!hasPermission) {
            return errorResponse(
                res,
                `Forbidden. Requires permission: ${requiredPermissions.join(' or ')}`,
                403,
            );
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

module.exports = { authMiddleware, requireRole, requirePermission, requireVerifiedEmail };

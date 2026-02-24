const { errorResponse } = require('../utils/responseWrapper');
const logger = require('../utils/logger');

/**
 * Role-Based Access Control Middleware Factory
 * @param {string[]} allowedRoles - Array of roles allowed to access the route.
 * @returns {Function} Express middleware.
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('RBAC: No user found in request (Auth middleware missing?)');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const userRole = req.user.role || 'user';

        if (req.method === 'DELETE') {
            console.log(`RBAC DELETE: ${userRole} attempting DELETE on ${req.originalUrl}`);
        }

        if (userRole === 'superuser' || allowedRoles.includes(userRole)) {
            console.log(`RBAC: Access granted to ${userRole} for ${req.originalUrl}`);
            return next();
        }

        logger.warn(
            {
                userId: req.user.id,
                userRole,
                requiredRoles: allowedRoles,
                path: req.originalUrl,
            },
            'RBAC: Access denied',
        );

        return res.status(403).json({
            success: false,
            message: 'Forbidden: Insufficient permissions',
        });
    };
};

module.exports = authorize;

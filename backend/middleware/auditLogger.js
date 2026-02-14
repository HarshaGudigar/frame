const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Creates an audit log entry.
 * Use this directly in route handlers.
 *
 * @param {Object} req - Express request object
 * @param {string} action - Action name (e.g., 'TENANT_CREATED')
 * @param {string} target - Target identifier (e.g., tenantId)
 * @param {Object} details - Additional details
 */
const logAction = async (req, action, target, details = {}) => {
    try {
        if (!req.user || !req.user._id) {
            logger.warn({ action, target }, 'Audit log skipped: No user in request');
            return;
        }

        const entry = new AuditLog({
            user: req.user._id,
            action,
            target,
            details,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        await entry.save();
        logger.info({ action, target, user: req.user._id }, 'Audit log created');
    } catch (err) {
        console.error('AUDIT_LOG_ERROR:', err.message);
        logger.error({ err, action, target }, 'Failed to create audit log');
    }
};

module.exports = { logAction };

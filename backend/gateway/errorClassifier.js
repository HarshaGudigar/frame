/**
 * Error Classifier — Smart error handler for the API Gateway
 * 
 * Classifies known error types and logs at appropriate levels
 * instead of treating everything as a critical error.
 */

const config = require('../config');

/**
 * Known error types mapped to log levels and clean messages.
 * Prevents noisy stack traces for expected HTTP errors.
 */
const ERROR_MAP = {
    PayloadTooLargeError: {
        level: 'warn',
        status: 413,
        message: 'Request payload exceeds size limit',
    },
    SyntaxError: {
        level: 'warn',
        status: 400,
        message: 'Invalid JSON in request body',
    },
    ValidationError: {
        level: 'warn',
        status: 400,
        message: 'Validation failed',
    },
    UnauthorizedError: {
        level: 'info',
        status: 401,
        message: 'Authentication required',
    },
    CastError: {
        level: 'warn',
        status: 400,
        message: 'Invalid ID format',
    },
};

/**
 * Creates the error classifier middleware.
 * @param {Object} logger - Pino logger instance
 */
function createErrorClassifier(logger) {
    return (err, req, res, next) => {
        const errorType = err.constructor?.name || err.type || 'UnknownError';
        const classified = ERROR_MAP[errorType];

        if (classified) {
            // Known error — log at appropriate level, no stack trace
            logger[classified.level]({
                type: errorType,
                method: req.method,
                path: req.path,
                detail: err.message,
            }, classified.message);

            return res.status(err.statusCode || err.status || classified.status).json({
                success: false,
                message: config.NODE_ENV === 'production' ? classified.message : err.message,
            });
        }

        // Unknown error — log at error level with full stack
        logger.error({
            err,
            method: req.method,
            path: req.path,
        }, 'Unhandled server error');

        const statusCode = err.statusCode || err.status || 500;
        return res.status(statusCode).json({
            success: false,
            message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            ...(config.NODE_ENV !== 'production' && { stack: err.stack }),
        });
    };
}

module.exports = { createErrorClassifier };

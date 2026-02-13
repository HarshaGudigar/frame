/**
 * Unified response wrapper for the Alyxnet Frame.
 * Ensures consistent API responses across all modules.
 */

const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
    let errorData = error;
    if (error instanceof Error) {
        errorData = {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
    }

    return res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? errorData : undefined,
    });
};

module.exports = {
    successResponse,
    errorResponse,
};

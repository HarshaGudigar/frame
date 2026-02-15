const rateLimit = require('express-rate-limit');
const config = require('../config');

const loginLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_LOGIN_WINDOW_MS,
    max: config.RATE_LIMIT_LOGIN_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

const registerLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_REGISTER_WINDOW_MS,
    max: config.RATE_LIMIT_REGISTER_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many registration attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_FORGOT_PW_WINDOW_MS,
    max: config.RATE_LIMIT_FORGOT_PW_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many password reset requests. Please try again later.',
    },
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter };

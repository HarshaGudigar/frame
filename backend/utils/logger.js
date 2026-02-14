const pino = require('pino');
const config = require('../config');

const logger = pino({
    level: config.LOG_LEVEL,
    transport:
        config.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
            : undefined,
});

module.exports = logger;

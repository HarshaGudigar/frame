if (process.env.NODE_ENV !== 'test') {
    require('dotenv').config();
}

const http = require('http');
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
// Actually, looking at server.js line 145: module.exports = { createApp, logger };
// But logger is defined at line 12: const logger = require('./utils/logger');
// I should stick to consistent requiring.

const { createApp } = require('./app');

if (require.main === module) {
    const { app, modules } = createApp();
    const server = http.createServer(app); // Core server instance
    const socketService = require('./utils/socket');

    // Initialize SocketService
    socketService.init(server);

    // Start token cleanup cron job
    const { startTokenCleanup } = require('./jobs/tokenCleanup');
    startTokenCleanup();

    // Start backup cron job
    const { startBackupJob } = require('./jobs/backup');
    startBackupJob();

    // Start trial cleanup cron job
    const { startTrialCleanup } = require('./jobs/trialCleanup');
    startTrialCleanup();

    // Database — retry loop for Docker environments where MongoDB starts concurrently
    const connectWithRetry = async (retries = 10, delay = 3000) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await mongoose.connect(config.MONGODB_URI);
                logger.info(`[${config.RUNTIME_MODE}] MongoDB connected (attempt ${attempt})`);
                return;
            } catch (err) {
                logger.warn(
                    `[${config.RUNTIME_MODE}] MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`,
                );
                if (attempt === retries) {
                    logger.error(
                        { err },
                        `[${config.RUNTIME_MODE}] MongoDB connection failed after ${retries} attempts`,
                    );
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    connectWithRetry();

    // Start Server
    const httpServer = server.listen(config.PORT, () => {
        logger.info(
            `[${config.RUNTIME_MODE}] Server running on port ${config.PORT} (with WebSockets)`,
        );
        logger.info(`[${config.RUNTIME_MODE}] CORS origins: ${config.CORS_ORIGINS.join(', ')}`);
        logger.info(
            `[${config.RUNTIME_MODE}] Auth rate limit: ${config.RATE_LIMIT_MAX_AUTH} req / ${config.RATE_LIMIT_WINDOW_MS / 60000} min`,
        );
        logger.info(`[${config.RUNTIME_MODE}] ${modules.length} module(s) loaded`);
        logger.info(
            `[${config.RUNTIME_MODE}] API docs at http://localhost:${config.PORT}/api/docs`,
        );
    });

    const gracefulShutdown = () => {
        logger.info('Received kill signal, shutting down gracefully');

        httpServer.close(() => {
            logger.info('Closed out remaining HTTP connections');

            // Close Socket.io connections
            try {
                const io = socketService.getIO();
                if (io) {
                    io.close(() => {
                        logger.info('Socket.io connections closed');
                    });
                }
            } catch (e) {
                // Ignore if io not initialized
            }

            mongoose.connection.close(false, () => {
                logger.info('MongoDB connection closed');
                process.exit(0);
            });
        });

        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

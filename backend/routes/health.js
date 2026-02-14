const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const { getModuleSummary } = require('../gateway/moduleLoader');

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: System health check
 *     description: Returns the status of the API, database connection, and system metrics.
 *     responses:
 *       200:
 *         description: System healthy
 *       503:
 *         description: System unhealthy (e.g., DB disconnected)
 */
router.get('/', (req, res) => {
    // Determine overall health
    const dbState = mongoose.connection.readyState;
    const isHealthy = dbState === 1; // 1 = connected

    const dbStatusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    const status = isHealthy ? 200 : 503;

    // Optional: You might want to pass modules in req.app.locals or similar if needed,
    // but for now we'll assume basic health doesn't strictly need dynamic module list
    // OR we pass it in if we convert this to a factory function.
    // For simplicity, let's keep it static or use what we can access.
    // The previous implementation used `modules` variable from closure scope in `createApp`.
    // To keep it pure, we can attach modules to `req.app.locals.modules` in server.js.

    const response = {
        success: isHealthy,
        mode: config.RUNTIME_MODE,
        uptime: `${Math.floor(process.uptime())}s`,
        database: {
            status: dbStatusMap[dbState] || 'unknown',
            host: mongoose.connection.host,
        },
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
    };

    // If modules are available in app locals, include summary
    if (req.app.locals.modules) {
        response.modules = getModuleSummary(req.app.locals.modules);
    }

    res.status(status).json(response);
});

module.exports = router;

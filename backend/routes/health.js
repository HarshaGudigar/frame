const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const { getModuleSummary } = require('../gateway/moduleLoader');
const AppConfig = require('../models/AppConfig');

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
router.get('/', async (req, res) => {
    // Determine overall health
    const dbState = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    // During container startup MongoDB takes time to initialize — treat "connecting"
    // as healthy so Docker does not fail the start-period health checks.
    const isHealthy = dbState === 1 || dbState === 2;

    const dbStatusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    const status = isHealthy ? 200 : 503;

    try {
        const appConfig = await AppConfig.getInstance();

        const response = {
            success: isHealthy,
            mode: config.RUNTIME_MODE,
            instanceName: appConfig.instanceName,
            branding: appConfig.branding,
            enabledModules: appConfig.enabledModules,
            uptime: `${Math.floor(process.uptime())}s`,
            database: {
                status: dbStatusMap[dbState] || 'unknown',
            },
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
        };

        if (req.app.locals.modules) {
            response.modules = getModuleSummary(req.app.locals.modules);
        }

        res.status(status).json(response);
    } catch (err) {
        // Fallback if db is fundamentally broken
        res.status(status).json({
            success: isHealthy,
            mode: config.RUNTIME_MODE,
            uptime: `${Math.floor(process.uptime())}s`,
            database: {
                status: dbStatusMap[dbState] || 'unknown',
            },
            timestamp: new Date().toISOString(),
        });
    }
});

module.exports = router;

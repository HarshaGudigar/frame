if (process.env.NODE_ENV !== 'test') {
    require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');

// Register global Mongoose plugins
const tenantPlugin = require('./plugins/tenantPlugin');
mongoose.plugin(tenantPlugin);

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');

// Gateway
const { discoverModules, registerModules } = require('./gateway/moduleLoader');
const createModuleAccessMiddleware = require('./gateway/moduleAccessMiddleware');
const { createErrorClassifier } = require('./gateway/errorClassifier');
const { mountSwaggerDocs } = require('./gateway/swagger');
const healthRoutes = require('./routes/health');

/**
 * Creates and configures the Express app.
 * Separated from listen/connect so tests can import a clean app instance.
 */
const path = require('path');

function createApp() {
    const app = express();

    // Serve static files from uploads directory
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // ─── Security Middleware ─────────────────────────────────────────────────
    //
    // CSRF Protection Note:
    // This application stores JWTs in localStorage and sends them via the
    // Authorization: Bearer header. Because browsers do not automatically attach
    // localStorage values to cross-origin requests, this pattern is inherently
    // CSRF-safe — an attacker's page cannot forge a request that includes the
    // Bearer token. The tradeoff is XSS exposure: if an attacker injects script,
    // they can read localStorage. This risk is mitigated by Helmet's CSP headers
    // and strict input sanitization.
    //
    // If this application ever migrates to httpOnly cookie-based auth, add:
    //   1. SameSite=Strict on the auth cookie
    //   2. A CSRF token (double-submit cookie or synchronizer token pattern)
    //
    app.use(helmet());

    // CORS — only allow whitelisted origins
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (!origin || config.CORS_ORIGINS.includes(origin)) {
            return cors({ origin: true, credentials: true })(req, res, next);
        }
        logger.warn({ origin }, 'CORS blocked request');
        return res.status(403).json({ success: false, message: 'Origin not allowed' });
    });

    // ─── Razorpay Webhooks (Raw Body Required) ─────────────────────────────────
    app.use('/api/m/billing/webhooks', require('./modules/billing/webhooks'));

    // Parse JSON with size limit
    app.use(express.json({ limit: config.BODY_SIZE_LIMIT }));

    // Rate limiter for auth endpoints
    const authLimiter = rateLimit({
        windowMs: config.RATE_LIMIT_WINDOW_MS,
        max: config.RATE_LIMIT_MAX_AUTH,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many requests. Please try again later.' },
    });

    // ─── Request Logging ─────────────────────────────────────────────────────
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            logger.info({
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                duration: `${Date.now() - start}ms`,
            });
        });
        next();
    });

    // ─── Multi-Tenancy ───────────────────────────────────────────────────────
    const tenantMiddleware = require('./middleware/tenantMiddleware');
    app.use(tenantMiddleware);

    // ─── Developer Debug Panel ───────────────────────────────────────────────
    const debugMiddleware = require('./middleware/debugMiddleware');
    app.use(debugMiddleware);

    // ─── Usage Metering ──────────────────────────────────────────────────────
    const usageMiddleware = require('./middleware/usageMiddleware');
    app.use(usageMiddleware);

    // ─── Module Discovery ────────────────────────────────────────────────────
    const modules = discoverModules(logger);

    // Attach modules to app.locals for health check access
    app.locals.modules = modules;

    // ─── Centralized Event Bus ───────────────────────────────────────────────
    const eventBus = require('./events/EventBus');
    eventBus.setModuleRegistry(modules);
    app.use((req, res, next) => {
        req.eventBus = eventBus;
        next();
    });

    // ─── Core Routes ─────────────────────────────────────────────────────────
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authLimiter, authRoutes);

    const marketplaceRoutes = require('./routes/marketplace');
    app.use('/api/marketplace', marketplaceRoutes);

    const adminRoutes = require('./routes/admin');
    app.use('/api/admin', adminRoutes);

    // ─── Health Check ────────────────────────────────────────────────────────
    app.use('/api/health', healthRoutes);

    // ─── Module Routes (Auto-registered via gateway) ─────────────────────────
    registerModules(app, modules, createModuleAccessMiddleware, logger);

    // ─── Swagger Documentation ───────────────────────────────────────────────
    mountSwaggerDocs(app, modules, logger);

    app.get('/', (req, res) => {
        res.status(200).json({
            message: 'Alyxnet Frame API',
            mode: config.RUNTIME_MODE,
            tenant: req.tenant ? req.tenant.name : 'None (Global Context)',
            docs: '/api/docs',
        });
    });

    // ─── Error Handler (Smart Classifier) ────────────────────────────────────
    app.use(createErrorClassifier(logger));

    return { app, modules };
}

module.exports = { createApp };

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const config = require('./config');

// Gateway
const { discoverModules, registerModules, getModuleSummary } = require('./gateway/moduleLoader');
const createModuleAccessMiddleware = require('./gateway/moduleAccessMiddleware');
const { createErrorClassifier } = require('./gateway/errorClassifier');
const { mountSwaggerDocs } = require('./gateway/swagger');

// ─── Logger ──────────────────────────────────────────────────────────────────

const logger = pino({
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
});

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

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

// ─── Request Logging ─────────────────────────────────────────────────────────

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

// ─── Multi-Tenancy ───────────────────────────────────────────────────────────

const tenantMiddleware = require('./middleware/tenantMiddleware');
app.use(tenantMiddleware);

// ─── Module Discovery ────────────────────────────────────────────────────────

const modules = discoverModules(logger);

// ─── Core Routes ─────────────────────────────────────────────────────────────

const authRoutes = require('./routes/auth');
app.use('/api/auth', authLimiter, authRoutes);

const marketplaceRoutes = require('./routes/marketplace');
app.use('/api/marketplace', marketplaceRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// ─── Module Routes (Auto-registered via gateway) ─────────────────────────────

registerModules(app, modules, createModuleAccessMiddleware, logger);

// ─── Swagger Documentation ───────────────────────────────────────────────────

mountSwaggerDocs(app, modules, logger);

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    res.json({
        ok: dbState === 1,
        mode: config.RUNTIME_MODE,
        uptime: `${Math.floor(process.uptime())}s`,
        database: dbStatus[dbState] || 'unknown',
        timestamp: new Date().toISOString(),
        modules: getModuleSummary(modules),
        routes: ['/api/auth', '/api/marketplace', '/api/admin', '/api/docs'],
    });
});

// ─── Database ────────────────────────────────────────────────────────────────

mongoose.connect(config.MONGODB_URI)
    .then(() => logger.info(`[${config.RUNTIME_MODE}] MongoDB connected`))
    .catch(err => logger.error({ err }, `[${config.RUNTIME_MODE}] MongoDB connection failed`));

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Alyxnet Frame API',
        mode: config.RUNTIME_MODE,
        tenant: req.tenant ? req.tenant.name : 'None (Global Context)',
        docs: '/api/docs',
    });
});

// ─── Error Handler (Smart Classifier) ────────────────────────────────────────

app.use(createErrorClassifier(logger));

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(config.PORT, () => {
    logger.info(`[${config.RUNTIME_MODE}] Server running on port ${config.PORT}`);
    logger.info(`[${config.RUNTIME_MODE}] CORS origins: ${config.CORS_ORIGINS.join(', ')}`);
    logger.info(`[${config.RUNTIME_MODE}] Auth rate limit: ${config.RATE_LIMIT_MAX_AUTH} req / ${config.RATE_LIMIT_WINDOW_MS / 60000} min`);
    logger.info(`[${config.RUNTIME_MODE}] ${modules.length} module(s) loaded`);
    logger.info(`[${config.RUNTIME_MODE}] API docs at http://localhost:${config.PORT}/api/docs`);
});

module.exports = { app, logger };

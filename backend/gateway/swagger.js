/**
 * Swagger Documentation Setup — Serves OpenAPI specs and Swagger UI.
 *
 * - /api/docs          → Master Swagger UI (core platform APIs)
 * - /api/docs/modules  → List of available module docs
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('../config');

/**
 * Core platform OpenAPI spec — covers auth, admin, and marketplace routes.
 */
function createCoreSpec() {
    const options = {
        definition: {
            openapi: '3.0.3',
            info: {
                title: 'Alyxnet Frame API',
                version: '1.0.0',
                description:
                    'Multi-tenant SaaS platform API — Authentication, Admin, and Marketplace endpoints.',
                contact: { name: 'Alyxnet', url: 'https://github.com/HarshaGudigar/frame' },
            },
            servers: [{ url: `http://localhost:${config.PORT}`, description: 'Local development' }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                    apiKey: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'x-api-key',
                        description: 'Machine-to-machine API key for heartbeat',
                    },
                },
                parameters: {
                    tenantId: {
                        name: 'x-tenant-id',
                        in: 'header',
                        description: 'Tenant slug for multi-tenant context',
                        required: false,
                        schema: { type: 'string' },
                    },
                },
                schemas: {
                    SuccessResponse: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            message: { type: 'string' },
                            data: { type: 'object' },
                        },
                    },
                    ErrorResponse: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            message: { type: 'string' },
                        },
                    },
                    AuthToken: {
                        type: 'object',
                        properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                        },
                    },
                },
            },
            tags: [
                { name: 'Auth', description: 'Authentication (register, login)' },
                { name: 'Admin', description: 'Tenant management and fleet operations' },
                { name: 'Marketplace', description: 'Browse and purchase modules' },
                { name: 'System', description: 'Health check and system info' },
            ],
        },
        apis: [
            './routes/auth.js',
            './routes/admin.js',
            './routes/marketplace.js',
            './gateway/swagger.js', // for inline path definitions below
        ],
    };

    return swaggerJsdoc(options);
}

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns server status, database connectivity, uptime, and runtime mode.
 *     responses:
 *       200:
 *         description: Server health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 mode: { type: string, enum: [HUB, SILO] }
 *                 uptime: { type: string }
 *                 database: { type: string, enum: [connected, disconnected, connecting, disconnecting] }
 *                 timestamp: { type: string, format: date-time }
 *
 * /:
 *   get:
 *     tags: [System]
 *     summary: API root
 *     description: Returns basic API information and runtime mode.
 *     responses:
 *       200:
 *         description: API info
 */

/**
 * Mounts Swagger UI and JSON spec endpoints on the app.
 *
 * @param {Object} app - Express app instance
 * @param {Array} modules - Loaded module manifests
 * @param {Object} logger - Pino logger instance
 */
function mountSwaggerDocs(app, modules, logger) {
    const coreSpec = createCoreSpec();

    // Serve the raw OpenAPI JSON spec
    app.get('/api/docs/spec.json', (req, res) => {
        res.json(coreSpec);
    });

    // List available module docs
    app.get('/api/docs/modules', (req, res) => {
        const moduleDocs = modules
            .filter((m) => m.swaggerSpec)
            .map((m) => ({
                name: m.name,
                slug: m.slug,
                docs: `/api/docs/modules/${m.slug}`,
                spec: `/api/docs/modules/${m.slug}/spec.json`,
            }));

        res.json({
            core: { docs: '/api/docs', spec: '/api/docs/spec.json' },
            modules: moduleDocs,
        });
    });

    // Mount per-module Swagger UIs
    for (const mod of modules) {
        if (mod.swaggerSpec) {
            app.get(`/api/docs/modules/${mod.slug}/spec.json`, (req, res) => {
                res.json(mod.swaggerSpec);
            });

            app.use(
                `/api/docs/modules/${mod.slug}`,
                swaggerUi.serveFiles(mod.swaggerSpec),
                swaggerUi.setup(mod.swaggerSpec, {
                    customSiteTitle: `${mod.name} API Docs`,
                }),
            );

            logger.info(
                { module: mod.slug, path: `/api/docs/modules/${mod.slug}` },
                'Module docs mounted',
            );
        }
    }

    // Mount core Swagger UI LAST (catch-all under /api/docs)
    app.use(
        '/api/docs',
        swaggerUi.serveFiles(coreSpec),
        swaggerUi.setup(coreSpec, {
            customSiteTitle: 'Alyxnet Frame API Docs',
            customCss: '.swagger-ui .topbar { display: none }',
            swaggerOptions: {
                persistAuthorization: true,
                docExpansion: 'list',
                filter: true,
            },
        }),
    );

    logger.info('Swagger UI mounted at /api/docs');
}

module.exports = { mountSwaggerDocs };

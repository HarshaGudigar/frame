const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const AppConfig = require('../models/AppConfig');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
    createProductSchema,
    purchaseSchema,
    updateProductSchema,
} = require('../schemas/marketplace');
const logger = require('../utils/logger');
const socketService = require('../utils/socket');

/**
 * @openapi
 * /api/marketplace/products:
 *   get:
 *     tags: [Marketplace]
 *     summary: List all products
 *     description: Browse available modules/products in the marketplace. Public endpoint.
 */
router.get('/products', async (req, res) => {
    const { category, search } = req.query;
    try {
        const query = { isActive: true };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const products = await Product.find(query);
        return successResponse(res, products, 'Marketplace products retrieved');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch products', 500, err);
    }
});

router.post(
    '/products',
    authMiddleware,
    validate({ body: createProductSchema }),
    async (req, res) => {
        const { name, slug, description, price, features } = req.body;

        try {
            const existing = await Product.findOne({ slug });
            if (existing) {
                return errorResponse(res, `Product with slug "${slug}" already exists`, 409);
            }

            const product = await Product.create({ name, slug, description, price, features });
            return successResponse(res, product, 'Product created', 201);
        } catch (err) {
            return errorResponse(res, 'Failed to create product', 500, err);
        }
    },
);

router.put(
    '/products/:id',
    authMiddleware,
    requireRole('superuser', 'admin'),
    validate({ body: updateProductSchema }),
    async (req, res) => {
        try {
            const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!product) {
                return errorResponse(res, 'Product not found', 404);
            }
            return successResponse(res, product, 'Product updated');
        } catch (err) {
            return errorResponse(res, 'Update failed', 500, err);
        }
    },
);

router.delete(
    '/products/:id',
    authMiddleware,
    requireRole('superuser', 'admin'),
    async (req, res) => {
        try {
            // Soft delete
            const product = await Product.findByIdAndUpdate(
                req.params.id,
                { isActive: false },
                { new: true },
            );
            if (!product) {
                return errorResponse(res, 'Product not found', 404);
            }
            return successResponse(res, null, 'Product deleted (soft)');
        } catch (err) {
            return errorResponse(res, 'Deletion failed', 500, err);
        }
    },
);

/**
 * @openapi
 * /api/marketplace/purchase:
 *   post:
 *     tags: [Marketplace]
 *     summary: Enable a module
 *     description: Enable a marketplace product. Requires superuser or admin role.
 */
router.post(
    '/purchase',
    authMiddleware,
    requireRole('superuser', 'admin'),
    validate({ body: purchaseSchema }),
    async (req, res) => {
        const { productId } = req.body;

        try {
            const appConfig = await AppConfig.getInstance();
            const product = await Product.findById(productId);

            if (!product) {
                return errorResponse(res, 'Product not found', 404);
            }

            if (appConfig.enabledModules.some((m) => m.slug === product.slug)) {
                return errorResponse(res, `Already enabled ${product.name}`, 409);
            }

            // ─── Dependency Validation ──────────────────────────────────────
            if (product.dependencies && product.dependencies.length > 0) {
                const missing = product.dependencies.filter(
                    (dep) => !appConfig.enabledModules.some((m) => m.slug === dep.toLowerCase()),
                );
                if (missing.length > 0) {
                    return errorResponse(
                        res,
                        `Missing required dependencies: ${missing.join(', ')}`,
                        400,
                    );
                }
            }

            const activatedAt = new Date();
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 11); // Standard 11-month lease for demo

            appConfig.enabledModules.push({
                slug: product.slug,
                activatedAt,
                expiresAt,
            });
            await appConfig.save();

            // ─── Provisioning Engine Implementation ──────────────────────────
            const modules = req.app.locals.modules || [];
            const moduleManifest = modules.find((m) => m.slug === product.slug);

            if (moduleManifest && typeof moduleManifest.onProvision === 'function') {
                try {
                    logger.info({ module: product.slug }, 'Calling onProvision hook');
                    await moduleManifest.onProvision(appConfig, logger);
                } catch (provisionErr) {
                    logger.error(
                        { err: provisionErr, module: product.slug },
                        'Module onProvision hook failed',
                    );
                }
            }

            // 2. Notify via WebSockets
            const notificationData = {
                productId: product._id,
                productName: product.name,
                productSlug: product.slug,
                message: `${product.name} module has been enabled`,
            };

            socketService.emitEvent('module:provisioned', notificationData, 'admin');
            socketService.emitEvent('module:provisioned', notificationData, `user:${req.user._id}`);

            return successResponse(res, { appConfig }, `Successfully enabled ${product.name}!`);
        } catch (err) {
            return errorResponse(res, 'Purchase failed', 500, err);
        }
    },
);

/**
 * @openapi
 * /api/marketplace/unsubscribe:
 *   post:
 *     tags: [Marketplace]
 *     summary: Disable a module
 *     description: Disable a module on the instance.
 */
router.post(
    '/unsubscribe',
    authMiddleware,
    requireRole('superuser', 'admin'),
    validate({ body: purchaseSchema }),
    async (req, res) => {
        const { productId } = req.body;

        try {
            const appConfig = await AppConfig.getInstance();
            const product = await Product.findById(productId);

            if (!product) {
                return errorResponse(res, 'Product not found', 404);
            }

            if (!appConfig.enabledModules.some((m) => m.slug === product.slug)) {
                return errorResponse(res, 'Module is not enabled', 404);
            }

            // 1. Remove slug from config
            appConfig.enabledModules = appConfig.enabledModules.filter(
                (m) => m.slug !== product.slug,
            );
            await appConfig.save();

            // 2. Optional module-specific hook
            const modules = req.app.locals.modules || [];
            const moduleManifest = modules.find((m) => m.slug === product.slug);
            if (moduleManifest && typeof moduleManifest.onUnsubscribe === 'function') {
                try {
                    await moduleManifest.onUnsubscribe(appConfig, logger);
                } catch (hookErr) {
                    logger.error(
                        { err: hookErr, module: product.slug },
                        'Module onUnsubscribe hook failed',
                    );
                }
            }

            // 3. Notify
            const notificationData = {
                productId: product._id,
                productName: product.name,
                productSlug: product.slug,
                message: `${product.name} module has been disabled`,
            };
            socketService.emitEvent('module:unsubscribed', notificationData, 'admin');
            socketService.emitEvent(
                'module:unsubscribed',
                notificationData,
                `user:${req.user._id}`,
            );

            return successResponse(res, { appConfig }, `Successfully disabled ${product.name}`);
        } catch (err) {
            return errorResponse(res, 'Unsubscription failed', 500, err);
        }
    },
);

module.exports = router;

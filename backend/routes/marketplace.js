const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
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
 *     responses:
 *       200:
 *         description: List of active marketplace products
 *   post:
 *     tags: [Marketplace]
 *     summary: Create a product
 *     description: Add a new product/module to the marketplace.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string, example: "Accounting & Billing" }
 *               slug: { type: string, example: "accounting" }
 *               description: { type: string, example: "Full accounting suite with invoicing" }
 *               price: { type: number, example: 29.99 }
 *               features: { type: array, items: { type: string }, example: ["Invoicing", "Expense Tracking", "Reports"] }
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Product slug already exists
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
    requireRole('owner', 'admin'),
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

router.delete('/products/:id', authMiddleware, requireRole('owner', 'admin'), async (req, res) => {
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
});

/**
 * @openapi
 * /api/marketplace/purchase:
 *   post:
 *     tags: [Marketplace]
 *     summary: Purchase a module
 *     description: Subscribe a tenant to a marketplace product. Requires owner or admin role for the tenant.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/tenantId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, productId]
 *             properties:
 *               tenantId: { type: string, description: "MongoDB ObjectId of the tenant" }
 *               productId: { type: string, description: "MongoDB ObjectId of the product" }
 *     responses:
 *       200:
 *         description: Successfully subscribed
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Tenant or product not found
 *       409:
 *         description: Already subscribed to this product
 */
router.post(
    '/purchase',
    authMiddleware,
    requireRole('owner', 'admin'),
    validate({ body: purchaseSchema }),
    async (req, res) => {
        const { tenantId, productId } = req.body;

        try {
            const tenant = await Tenant.findById(tenantId);
            const product = await Product.findById(productId);

            if (!tenant || !product) {
                return errorResponse(res, 'Tenant or Product not found', 404);
            }

            const existingSub = await Subscription.findOne({
                tenant: tenantId,
                product: productId,
                status: 'active',
            });

            if (existingSub) {
                return errorResponse(res, `Already subscribed to ${product.name}`, 409);
            }

            // ─── Dependency Validation ──────────────────────────────────────
            if (product.dependencies && product.dependencies.length > 0) {
                const missing = product.dependencies.filter(
                    (dep) => !tenant.subscribedModules.includes(dep.toLowerCase()),
                );
                if (missing.length > 0) {
                    return errorResponse(
                        res,
                        `Missing required dependencies: ${missing.join(', ')}`,
                        400,
                    );
                }
            }

            const subscription = new Subscription({
                tenant: tenantId,
                product: productId,
            });

            // ─── Trial Period Support ───────────────────────────────────────
            if (product.price && product.price.amount === 0) {
                // If price is 0, it's effectively a free/trial module
                subscription.status = 'active';
            } else {
                // Future: check if product has trialDays
                // For now, let's assume a default 14-day trial if no paymentId is provided (manual admin purchase)
                const trialDays = 14;
                subscription.status = 'trialing';
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + trialDays);
                subscription.trialExpiry = expiry;
            }

            await subscription.save();

            if (!tenant.subscribedModules.includes(product.slug)) {
                tenant.subscribedModules.push(product.slug);
                await tenant.save();
            }

            // ─── Provisioning Engine Implementation ──────────────────────────
            //
            // 1. Find the module manifest in discovered modules
            const modules = req.app.locals.modules || [];
            const moduleManifest = modules.find((m) => m.slug === product.slug);

            if (moduleManifest && typeof moduleManifest.onProvision === 'function') {
                try {
                    logger.info(
                        { tenant: tenant.slug, module: product.slug },
                        'Calling onProvision hook',
                    );
                    await moduleManifest.onProvision(tenant, logger);
                } catch (provisionErr) {
                    logger.error(
                        { err: provisionErr, tenant: tenant.slug, module: product.slug },
                        'Module onProvision hook failed',
                    );
                    // We don't fail the whole purchase if the hook fails, but we log it.
                    // In a production app, you might want to mark the subscription as 'pending_setup'.
                }
            }

            // 2. Notify via WebSockets
            const notificationData = {
                tenantId: tenant._id,
                tenantSlug: tenant.slug,
                productId: product._id,
                productName: product.name,
                productSlug: product.slug,
                message: `${product.name} module has been provisioned for ${tenant.name}`,
            };

            // Notify admins and the purchasing user
            socketService.emitEvent('module:provisioned', notificationData, 'admin');
            socketService.emitEvent('module:provisioned', notificationData, `user:${req.user._id}`);

            return successResponse(
                res,
                { tenant, subscription },
                `Successfully subscribed to ${product.name}!`,
            );
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
 *     summary: Cancel a module subscription
 *     description: Unsubscribe a tenant from a module.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, productId]
 *             properties:
 *               tenantId: { type: string }
 *               productId: { type: string }
 *     responses:
 *       200:
 *         description: Unsubscribed
 */
router.post(
    '/unsubscribe',
    authMiddleware,
    requireRole('owner', 'admin'),
    validate({ body: purchaseSchema }),
    async (req, res) => {
        const { tenantId, productId } = req.body;

        try {
            const tenant = await Tenant.findById(tenantId);
            const product = await Product.findById(productId);

            if (!tenant || !product) {
                return errorResponse(res, 'Tenant or Product not found', 404);
            }

            // Find active or trialing subscription
            const subscription = await Subscription.findOne({
                tenant: tenantId,
                product: productId,
                status: { $in: ['active', 'trialing'] },
            });

            if (!subscription) {
                return errorResponse(res, 'No active subscription found to cancel', 404);
            }

            // 1. Update subscription status
            subscription.status = 'canceled';
            await subscription.save();

            // 2. Remove slug from tenant
            tenant.subscribedModules = tenant.subscribedModules.filter(
                (slug) => slug !== product.slug,
            );
            await tenant.save();

            // 3. Optional module-specific hook
            const modules = req.app.locals.modules || [];
            const moduleManifest = modules.find((m) => m.slug === product.slug);
            if (moduleManifest && typeof moduleManifest.onUnsubscribe === 'function') {
                try {
                    await moduleManifest.onUnsubscribe(tenant, logger);
                } catch (hookErr) {
                    logger.error(
                        { err: hookErr, tenant: tenant.slug, module: product.slug },
                        'Module onUnsubscribe hook failed',
                    );
                }
            }

            // 4. Notify
            const notificationData = {
                tenantId: tenant._id,
                tenantSlug: tenant.slug,
                productId: product._id,
                productName: product.name,
                productSlug: product.slug,
                message: `${product.name} module has been removed for ${tenant.name}`,
            };
            socketService.emitEvent('module:unsubscribed', notificationData, 'admin');
            socketService.emitEvent(
                'module:unsubscribed',
                notificationData,
                `user:${req.user._id}`,
            );

            return successResponse(
                res,
                { tenant },
                `Successfully unsubscribed from ${product.name}`,
            );
        } catch (err) {
            return errorResponse(res, 'Unsubscription failed', 500, err);
        }
    },
);

module.exports = router;

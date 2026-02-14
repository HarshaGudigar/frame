const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

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
    try {
        const products = await Product.find({ isActive: true });
        return successResponse(res, products, 'Marketplace products retrieved');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch products', 500, err);
    }
});

router.post('/products', authMiddleware, async (req, res) => {
    const { name, slug, description, price, features } = req.body;

    if (!name || !slug) {
        return errorResponse(res, 'Name and slug are required', 400);
    }

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
router.post('/purchase', authMiddleware, requireRole('owner', 'admin'), async (req, res) => {
    const { tenantId, productId } = req.body;

    if (!tenantId || !productId) {
        return errorResponse(res, 'tenantId and productId are required', 400);
    }

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

        const subscription = new Subscription({
            tenant: tenantId,
            product: productId,
        });
        await subscription.save();

        if (!tenant.subscribedModules.includes(product.slug)) {
            tenant.subscribedModules.push(product.slug);
            await tenant.save();
        }

        return successResponse(res, { tenant, subscription }, `Successfully subscribed to ${product.name}!`);
    } catch (err) {
        return errorResponse(res, 'Purchase failed', 500, err);
    }
});

module.exports = router;

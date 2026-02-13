const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

/**
 * Marketplace API
 */

// 1. List all available products/modules (Public — anyone can browse)
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        return successResponse(res, products, 'Marketplace products retrieved');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch products', 500, err);
    }
});

// 2. Purchase a module for a tenant (Protected — requires auth + owner/admin role)
router.post('/purchase', authMiddleware, async (req, res) => {
    const { tenantId, productId } = req.body;

    if (!tenantId || !productId) {
        return errorResponse(res, 'tenantId and productId are required', 400);
    }

    try {
        // Verify the authenticated user has owner/admin access to this tenant
        const userTenantAccess = req.user.tenants?.find(
            t => t.tenant === tenantId
        );

        if (!userTenantAccess || !['owner', 'admin'].includes(userTenantAccess.role)) {
            return errorResponse(res, 'Only tenant owners or admins can purchase modules', 403);
        }

        const tenant = await Tenant.findById(tenantId);
        const product = await Product.findById(productId);

        if (!tenant || !product) {
            return errorResponse(res, 'Tenant or Product not found', 404);
        }

        // Check for duplicate subscription
        const existingSub = await Subscription.findOne({
            tenant: tenantId,
            product: productId,
            status: 'active',
        });

        if (existingSub) {
            return errorResponse(res, `Already subscribed to ${product.name}`, 409);
        }

        // Create the subscription
        const subscription = new Subscription({
            tenant: tenantId,
            product: productId,
        });
        await subscription.save();

        // Add the module slug to the tenant's active list
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

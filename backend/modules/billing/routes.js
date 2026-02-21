const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../../config');
const Product = require('../../models/Product');
const { errorResponse, successResponse } = require('../../utils/responseWrapper');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: config.RAZORPAY_KEY_ID,
    key_secret: config.RAZORPAY_KEY_SECRET,
});

/**
 * Helper to get or create a Razorpay Customer for a given Tenant
 */
async function getOrCreateRazorpayCustomer(tenant) {
    if (tenant.razorpayCustomerId) {
        return tenant.razorpayCustomerId;
    }

    // Create a new Customer in Razorpay
    try {
        const customer = await razorpay.customers.create({
            name: tenant.name,
            notes: {
                tenantId: tenant._id.toString(),
                tenantSlug: tenant.slug,
            },
        });

        // Save it back to our DB
        tenant.razorpayCustomerId = customer.id;
        await tenant.save();

        return customer.id;
    } catch (err) {
        throw new Error('Razorpay Customer Creation failed', { cause: err });
    }
}

/**
 * @route   POST /api/m/billing/checkout
 * @desc    Create a Razorpay Subscription for a Product
 * @access  Admin/Owner
 */
router.post('/checkout', async (req, res) => {
    try {
        const { productId } = req.body;
        const tenant = req.tenant;

        if (!tenant) {
            return errorResponse(res, 'Tenant context not provided', 400);
        }

        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return errorResponse(res, 'Product not found or inactive', 404);
        }

        if (!product.razorpayPlanId) {
            return errorResponse(res, 'Product is not configured with a Razorpay Plan', 400);
        }

        // 1. Get/Create Customer
        const customerId = await getOrCreateRazorpayCustomer(tenant);

        // 2. Create Razorpay Subscription
        // Note: Razorpay subscriptions handle recurring payments.
        // For one-time payments, we would create an Order instead.
        const subscription = await razorpay.subscriptions.create({
            plan_id: product.razorpayPlanId,
            customer_id: customerId,
            total_count: 12, // example: bill for 12 cycles
            notes: {
                tenantId: tenant._id.toString(),
                productId: product._id.toString(),
            },
        });

        // Return the subscription ID. The frontend Razorpay SDK needs this.
        return successResponse(res, 'Subscription created', {
            subscription_id: subscription.id,
            key_id: config.RAZORPAY_KEY_ID, // Frontend needs the public key
        });
    } catch (error) {
        req.log.error({ err: error }, 'Razorpay checkout error');
        return errorResponse(res, 'Failed to create subscription', 500, error);
    }
});

/**
 * @route   POST /api/m/billing/verify
 * @desc    Verify Razorpay payment signature emitted by the frontend SDK
 * @access  Admin/Owner
 */
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

        // Generate expected signature
        const expectedSignature = crypto
            .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
            .update(razorpay_payment_id + '|' + razorpay_subscription_id)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return errorResponse(res, 'Invalid payment signature', 400);
        }

        // Signature is valid. We can trust the payment was successful.
        // We will do the actual provisioning in the Webhook to be safe against race conditions,
        // but we can return success here to UI.
        return successResponse(res, 'Payment verified successfully');
    } catch (error) {
        req.log.error({ err: error }, 'Razorpay verify error');
        return errorResponse(res, 'Failed to verify payment', 500, error);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../../config');
const Tenant = require('../../models/Tenant');
const Product = require('../../models/Product');
const Subscription = require('../../models/Subscription');
const eventBus = require('../../events/EventBus');
const logger = require('../../utils/logger');

// Razorpay sends webhooks as JSON but we need the raw body to verify the signature
// The signature is passed in the x-razorpay-signature header
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];

    // Verify Webhook Signature
    const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');

    if (expectedSignature !== signature) {
        logger.error(
            { signature, expectedSignature },
            'Razorpay webhook signature verification failed',
        );
        return res.status(400).send('Invalid signature');
    }

    // Parse verified payload
    let event;
    try {
        event = JSON.parse(req.body);
    } catch (_err) {
        return res.status(400).send('Invalid JSON payload');
    }

    try {
        switch (event.event) {
            case 'subscription.charged': {
                const subscriptionData = event.payload.subscription.entity;
                const paymentData = event.payload.payment.entity;

                const tenantId = subscriptionData.notes?.tenantId;
                const productId = subscriptionData.notes?.productId;

                if (tenantId && productId) {
                    const tenant = await Tenant.findById(tenantId);
                    const product = await Product.findById(productId);

                    if (tenant && product) {
                        // Check if subscription already exists locally
                        let localSub = await Subscription.findOne({
                            razorpaySubscriptionId: subscriptionData.id,
                        });

                        if (!localSub) {
                            localSub = new Subscription({
                                tenant: tenant._id,
                                product: product._id,
                                razorpaySubscriptionId: subscriptionData.id,
                                razorpayPaymentId: paymentData.id,
                                status: 'active',
                            });
                        } else {
                            localSub.status = 'active'; // In case it was halted/past_due and just paid
                        }

                        // Add module to tenant's allowed list
                        if (!tenant.subscribedModules.includes(product.slug)) {
                            tenant.subscribedModules.push(product.slug);
                        }

                        tenant.billingStatus = 'active';

                        await localSub.save();
                        await tenant.save();

                        // Fire the provision event
                        eventBus.publish('billing.subscription.created', {
                            tenantId: tenant._id.toString(),
                            tenantSlug: tenant.slug,
                            moduleSlug: product.slug,
                        });

                        logger.info(
                            `Provisioned module ${product.slug} for tenant ${tenant.slug} via Razorpay Checkout`,
                        );
                    }
                }
                break;
            }
            case 'subscription.halted':
            case 'payment.failed': {
                // Determine structure based on the exact event
                const entity = event.payload.subscription?.entity || event.payload.payment?.entity;
                const customerId = entity?.customer_id;

                if (customerId) {
                    const tenant = await Tenant.findOne({ razorpayCustomerId: customerId });
                    if (tenant) {
                        tenant.billingStatus = 'past_due';
                        await tenant.save();

                        eventBus.publish('billing.payment.failed', {
                            tenantId: tenant._id.toString(),
                            tenantSlug: tenant.slug,
                        });

                        logger.warn(
                            `Invoice payment failed or subscription halted for tenant ${tenant.slug}`,
                        );
                    }
                }
                break;
            }
            case 'subscription.cancelled': {
                const subEntity = event.payload.subscription.entity;

                // Find and cancel local subscription
                const subscription = await Subscription.findOne({
                    razorpaySubscriptionId: subEntity.id,
                }).populate('product tenant');
                if (subscription) {
                    subscription.status = 'canceled';
                    await subscription.save();

                    const tenant = subscription.tenant;
                    if (tenant) {
                        tenant.subscribedModules = tenant.subscribedModules.filter(
                            (m) => m !== subscription.product.slug,
                        );
                        await tenant.save();

                        eventBus.publish('billing.subscription.canceled', {
                            tenantId: tenant._id.toString(),
                            tenantSlug: tenant.slug,
                            moduleSlug: subscription.product.slug,
                        });

                        logger.info(
                            `Canceled module ${subscription.product.slug} for tenant ${tenant.slug}`,
                        );
                    }
                }
                break;
            }
            default:
                logger.info(`Unhandled Razorpay event type ${event.event}`);
        }
    } catch (err) {
        logger.error({ err }, `Error processing Razorpay event ${event.event}`);
        return res.status(500).send('Internal Server Error');
    }

    res.json({ status: 'ok' });
});

module.exports = router;

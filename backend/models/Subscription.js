const mongoose = require('mongoose');

/**
 * Subscription Schema
 * Tracks the relationship between a Tenant and a Marketplace Product.
 */
const subscriptionSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'canceled', 'trialing'],
            default: 'active',
        },
        paymentId: String, // Stripe Subscription ID or similar
    },
    {
        timestamps: true,
    },
);

// Prevent duplicate active subscriptions for same tenant+product
subscriptionSchema.index({ tenant: 1, product: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);

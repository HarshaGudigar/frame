const mongoose = require('mongoose');

/**
 * AppConfig Schema
 * Single-document model (singleton) that stores the configuration for this
 * specific deployment instance. Replaces the multi-tenant Tenant model.
 *
 * Use AppConfig.getInstance() to always get or create the one config document.
 */
const appConfigSchema = new mongoose.Schema(
    {
        instanceName: {
            type: String,
            required: true,
            trim: true,
            default: 'Alyxnet Frame',
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            default: 'default',
        },
        // List of module slugs that are enabled on this instance
        // e.g. ['hotel', 'billing']
        enabledModules: [
            {
                type: String,
                trim: true,
                lowercase: true,
            },
        ],
        branding: {
            logo: String,
            primaryColor: { type: String, default: '#3b82f6' },
            faviconUrl: String,
            loginDomain: String,
        },
        // For future payment integration
        billingStatus: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'unpaid', 'trialing'],
            default: 'active',
        },
        razorpayCustomerId: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

/**
 * Returns the singleton AppConfig document.
 * Creates it with defaults if it doesn't exist yet.
 */
appConfigSchema.statics.getInstance = async function () {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({
            instanceName: process.env.INSTANCE_NAME || 'Alyxnet Frame',
            slug: process.env.INSTANCE_SLUG || 'default',
            enabledModules: (process.env.ENABLED_MODULES || '')
                .split(',')
                .map((m) => m.trim().toLowerCase())
                .filter(Boolean),
        });
    }
    return config;
};

module.exports = mongoose.model('AppConfig', appConfigSchema);

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
        instanceDescription: {
            type: String,
            trim: true,
            default: 'Enterprise Control Plane',
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
                slug: {
                    type: String,
                    trim: true,
                    lowercase: true,
                },
                activatedAt: {
                    type: Date,
                    default: Date.now,
                },
                expiresAt: {
                    type: Date,
                },
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
            instanceDescription: process.env.INSTANCE_DESCRIPTION || 'Enterprise Control Plane',
            slug: process.env.INSTANCE_SLUG || 'default',
            enabledModules: (process.env.ENABLED_MODULES || '')
                .split(',')
                .map((m) => ({ slug: m.trim().toLowerCase(), activatedAt: new Date() }))
                .filter((m) => m.slug),
        });
    } else {
        // Migration: Ensure all enabledModules are objects
        let changed = false;
        config.enabledModules = config.enabledModules.map((m) => {
            if (typeof m === 'string') {
                changed = true;
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 11);
                return { slug: m, activatedAt: new Date(), expiresAt };
            }
            return m;
        });
        if (changed) {
            await config.save();
        }
    }
    return config;
};

module.exports = mongoose.model('AppConfig', appConfigSchema);

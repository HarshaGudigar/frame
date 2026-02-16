const mongoose = require('mongoose');

/**
 * UsageMeter Schema
 * Tracks API call volume per tenant and module for billing and insights.
 */
const usageMeterSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        module: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        callCount: {
            type: Number,
            default: 1,
        },
        // Resolution: hourly aggregates
        timestamp: {
            type: Date,
            default: () => {
                const d = new Date();
                d.setMinutes(0, 0, 0); // Round down to the hour
                return d;
            },
        },
    },
    {
        timestamps: true,
    },
);

// Ensure unique record per tenant/module per hour
usageMeterSchema.index({ tenant: 1, module: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('UsageMeter', usageMeterSchema);

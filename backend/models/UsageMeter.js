const mongoose = require('mongoose');

/**
 * UsageMeter Schema
 * Tracks API call volume per tenant and module for billing and insights.
 */
const usageMeterSchema = new mongoose.Schema(
    {
        instanceId: {
            type: String,
            required: true,
            default: 'global',
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

// Ensure unique record per instance/module per hour
usageMeterSchema.index({ instanceId: 1, module: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('UsageMeter', usageMeterSchema);

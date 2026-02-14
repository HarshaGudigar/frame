const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema(
    {
        tenantId: {
            type: String,
            required: true,
            index: true,
        },
        metrics: {
            cpu: Number,
            ram: Number,
            uptime: Number,
            version: String,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: false, // We use our own timestamp
    },
);

// Optional: Add a TTL index to automatically delete metrics older than 30 days
// metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Metric', metricSchema);

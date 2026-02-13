const mongoose = require('mongoose');

/**
 * Tenant Schema
 * Stores metadata for each customer instance.
 */
const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    dbUri: {
        type: String,
        required: false,
    },
    vmIpAddress: {
        type: String,
        trim: true,
    },
    sshKeyRef: {
        type: String,
        trim: true,
    },
    deploymentStatus: {
        type: String,
        enum: ['pending', 'deploying', 'active', 'failed'],
        default: 'pending',
    },
    lastDeploymentDuration: {
        type: Number,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    subscribedModules: [{
        type: String,
        trim: true,
        lowercase: true,
    }],
}, {
    timestamps: true,
});

module.exports = mongoose.model('Tenant', tenantSchema);

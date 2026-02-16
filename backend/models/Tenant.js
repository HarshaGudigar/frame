const mongoose = require('mongoose');

/**
 * Tenant Schema
 * Stores metadata for each customer instance.
 */
const tenantSchema = new mongoose.Schema(
    {
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
        status: {
            type: String,
            enum: ['online', 'offline', 'error', 'suspended'],
            default: 'offline',
        },
        lastSeen: {
            type: Date,
        },
        lastHeartbeat: {
            type: Date,
        },
        metrics: {
            cpu: Number,
            ram: Number,
            uptime: Number,
            version: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        subscribedModules: [
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
        onboardingProgress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('Tenant', tenantSchema);

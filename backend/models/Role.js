const mongoose = require('mongoose');

/**
 * Role Schema
 * Replaces static string roles with a dynamic matrix of granular permissions.
 */
const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        // If null, it's a global/Hub role. If set, it's a Tenant-specific role.
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            default: null,
            index: true,
        },
        isSystem: {
            type: Boolean,
            default: false, // System roles (like 'owner' or 'admin') cannot be deleted or modified
        },
        permissions: [
            {
                type: String,
                required: true,
                trim: true,
            },
        ],
    },
    {
        timestamps: true,
    },
);

// Prevent duplicate role names within the same context (Hub or specific Tenant)
roleSchema.index({ name: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);

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
        isSystem: {
            type: Boolean,
            default: false, // System roles (like 'superuser' or 'admin') cannot be deleted or modified
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
    }
);
// Prevent duplicate role names
roleSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);

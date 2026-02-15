const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * GlobalUser Schema
 * Centrally manages users across all tenant instances.
 */
const globalUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: false,
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'staff', 'user'],
            default: 'user',
        },
        firstName: String,
        lastName: String,
        // Links to tenants this user has access to
        tenants: [
            {
                tenant: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Tenant',
                },
                role: {
                    type: String,
                    enum: ['owner', 'admin', 'staff', 'user'],
                    default: 'user',
                },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GlobalUser',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

// Hash password before saving
globalUserSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
globalUserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('GlobalUser', globalUserSchema);

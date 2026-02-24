const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationTokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['invite', 'email_verification', 'password_reset'],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        usedAt: {
            type: Date,
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

// Compound index for lookups by user + type
verificationTokenSchema.index({ user: 1, type: 1 });

// TTL index — automatically remove documents 7 days after creation
verificationTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

/**
 * Invalidates prior tokens of same type for user, then generates a new one.
 */
verificationTokenSchema.statics.createToken = async function (
    userId,
    type,
    expiresInHours,
    metadata = {},
) {
    // Invalidate existing unused tokens of the same type for this user
    await this.updateMany({ user: userId, type, usedAt: null }, { usedAt: new Date() });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const doc = await this.create({
        user: userId,
        token,
        type,
        expiresAt,
        metadata,
    });

    return doc;
};

/**
 * Finds a valid (unexpired, unused) token of the given type.
 */
verificationTokenSchema.statics.findValidToken = async function (plainToken, type) {
    return this.findOne({
        token: plainToken,
        type,
        usedAt: null,
        expiresAt: { $gt: new Date() },
    });
};

/**
 * Marks the token as used.
 */
verificationTokenSchema.methods.consume = async function () {
    this.usedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);

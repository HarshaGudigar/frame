const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalUser', required: true },
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Date },
    replacedByToken: { type: String },
    createdByIp: { type: String },
    createdAt: { type: Date, default: Date.now, expires: '7d' }, // TTL for auto-cleanup
});

refreshTokenSchema.virtual('isExpired').get(function () {
    return Date.now() >= this.expiresAt;
});

refreshTokenSchema.virtual('isActive').get(function () {
    return !this.revoked && !this.isExpired;
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

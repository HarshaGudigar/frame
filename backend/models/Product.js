const mongoose = require('mongoose');

/**
 * Product Schema
 * Represents a module available in the Marketplace.
 */
const productSchema = new mongoose.Schema({
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
    },
    description: String,
    price: {
        amount: Number,
        currency: { type: String, default: 'USD' },
        interval: { type: String, enum: ['monthly', 'yearly', 'once'], default: 'monthly' }
    },
    features: [String],
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Product', productSchema);

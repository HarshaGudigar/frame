const mongoose = require('mongoose');

/**
 * Product Schema
 * Represents a module available in the Marketplace.
 */
const productSchema = new mongoose.Schema(
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
        },
        category: {
            type: String,
            default: 'General',
            trim: true,
        },
        description: String,
        price: {
            amount: Number,
            currency: { type: String, default: 'USD' },
            interval: { type: String, enum: ['monthly', 'yearly', 'once'], default: 'monthly' },
        },
        features: [String],
        dependencies: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
        minPlatformVersion: {
            type: String,
            default: '1.0.0',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: {
            type: String,
            enum: ['Linen', 'Toiletries', 'Mini Bar', 'Cleaning Supplies', 'Other'],
            default: 'Other',
        },
        quantity: { type: Number, default: 0 },
        unit: { type: String, default: 'pcs' }, // pcs, liters, kg, etc.
        minThreshold: { type: Number, default: 5 }, // For low stock alerts
        lastRestockedAt: { type: Date },
        remarks: { type: String },
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return (
        connection.models.InventoryItem || connection.model('InventoryItem', inventoryItemSchema)
    );
};

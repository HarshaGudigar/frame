const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: String,
        rate: { type: Number, required: true },
        gstRate: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Service || connection.model('Service', serviceSchema);
};

const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        agentCode: { type: String, required: true, unique: true },
        email: String,
        phone: String,
        sharePercentage: { type: Number, default: 0 },
        address: String,
        city: String,
        state: String,
        pinCode: String,
        country: String,
        notes: String,
        profilePic: String,
        businessType: {
            type: String,
            enum: ['Registered', 'Unregistered'],
            default: 'Unregistered',
        },
        gstin: String,
        pan: String,
        cin: String,
        bankName: String,
        bankBranch: String,
        bankIfsc: String,
        bankAccountNumber: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Agent || connection.model('Agent', agentSchema);
};

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: {
            type: String,
            sparse: true,
            unique: true,
        },
        phone: { type: String, required: true },
        idProofType: String,
        idProofNumber: String,
        idProofImageUrl: String,
        birthDate: Date,
        marriageDate: Date,
        gender: { type: String, enum: ['Male', 'Female', 'Other'] },
        city: String,
        state: String,
        pinCode: String,
        address: String,
        notes: String,
        attachments: [
            {
                fileName: { type: String, required: true },
                fileUrl: { type: String, required: true },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Customer || connection.model('Customer', customerSchema);
};

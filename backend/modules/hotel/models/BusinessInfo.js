const mongoose = require('mongoose');

const businessInfoSchema = new mongoose.Schema(
    {
        legalName: { type: String, required: true },
        brandName: String,
        address: String,
        city: String,
        state: String,
        pinCode: String,
        country: String,
        email: String,
        website: String,
        phone: String,
        gst: String,
        cin: String,
        pan: String,
        extraInfo: [
            {
                key: { type: String, required: true },
                value: { type: String, required: true },
            },
        ],
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.BusinessInfo || connection.model('BusinessInfo', businessInfoSchema);
};

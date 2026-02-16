const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
    {
        type: { type: String, required: true, unique: true },
        options: [
            {
                label: { type: String, required: true },
                value: { type: String, required: true },
                isActive: { type: Boolean, default: true },
            },
        ],
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Settings || connection.model('Settings', settingsSchema);
};

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
    {
        number: { type: String, required: true, unique: true },
        type: { type: String, required: true },
        status: {
            type: String,
            enum: ['Available', 'Occupied', 'Dirty', 'Maintenance'],
            default: 'Available',
        },
        pricePerNight: { type: Number, required: true },
        amenities: [String],
        floor: { type: Number, required: true },
        description: String,
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Room || connection.model('Room', roomSchema);
};

const mongoose = require('mongoose');

const bookingServiceSchema = new mongoose.Schema(
    {
        booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        notes: String,
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return (
        connection.models.BookingService || connection.model('BookingService', bookingServiceSchema)
    );
};

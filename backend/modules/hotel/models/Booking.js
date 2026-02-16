const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
        checkInDate: { type: Date, required: true },
        checkOutDate: { type: Date, required: true },
        numberOfDays: { type: Number, required: true, min: 1 },
        roomRent: { type: Number, required: true },
        status: {
            type: String,
            enum: ['Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'],
            default: 'Confirmed',
        },
        totalAmount: { type: Number, required: true },
        paidAmount: { type: Number, default: 0 },
        paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
        checkedInAt: Date,
        checkedOutAt: Date,
        maleCount: { type: Number, default: 0 },
        femaleCount: { type: Number, default: 0 },
        childCount: { type: Number, default: 0 },
        checkInType: { type: String, enum: ['Walk In', 'Online Booking'], default: 'Walk In' },
        checkInNumber: { type: String, unique: true },
        agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
        serviceType: { type: String, enum: ['24 Hours', '12 Hours', '12 PM'], default: '24 Hours' },
        purposeOfVisit: String,
        advanceAmount: { type: Number, default: 0 },
        notes: String,
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Booking || connection.model('Booking', bookingSchema);
};

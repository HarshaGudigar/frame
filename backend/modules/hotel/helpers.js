const CounterSchema = require('./models/Counter');

/**
 * Generate the next check-in number using atomic counter increment.
 * Format: CHK-YYYYMMDD-NNNN
 */
async function getNextCheckInNumber(connection) {
    const Counter = CounterSchema(connection);
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const key = `checkin-${dateStr}`;

    const counter = await Counter.findByIdAndUpdate(
        key,
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
    );

    const seq = String(counter.seq).padStart(4, '0');
    return `CHK-${dateStr}-${seq}`;
}

/**
 * Calculate check-out date based on check-in date, number of days, and service type.
 * - '24 Hours': checkIn + numberOfDays * 24h
 * - '12 Hours': checkIn + numberOfDays * 12h
 * - '12 PM': checkOut is numberOfDays later at 12:00 PM
 */
function calculateCheckOutDate(checkInDate, numberOfDays, serviceType) {
    const checkIn = new Date(checkInDate);

    switch (serviceType) {
        case '12 Hours': {
            const ms = numberOfDays * 12 * 60 * 60 * 1000;
            return new Date(checkIn.getTime() + ms);
        }
        case '12 PM': {
            const checkout = new Date(checkIn);
            checkout.setDate(checkout.getDate() + numberOfDays);
            checkout.setHours(12, 0, 0, 0);
            return checkout;
        }
        case '24 Hours':
        default: {
            const ms = numberOfDays * 24 * 60 * 60 * 1000;
            return new Date(checkIn.getTime() + ms);
        }
    }
}

module.exports = {
    getNextCheckInNumber,
    calculateCheckOutDate,
};

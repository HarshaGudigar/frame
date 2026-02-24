const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app');

        const bookingsCol = mongoose.connection.db.collection('bookings');
        const bookings = await bookingsCol.find().toArray();
        console.log(`Found ${bookings.length} bookings`);
        bookings.forEach((b) => {
            console.log(
                `- ID: ${b._id}, Status: ${b.status}, CheckIn: ${b.checkInDate}, CheckOut: ${b.checkOutDate}`,
            );
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
main();

const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app');

        const hkCol = mongoose.connection.db.collection('housekeepingtasks');
        const tasks = await hkCol.find().toArray();
        console.log(`Found ${tasks.length} housekeeping tasks`);
        tasks.forEach((t) => {
            console.log(
                `- ID: ${t._id}, Status: ${t.status}, Room: ${t.room}, CreatedAt: ${t.createdAt}`,
            );
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
main();

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function promoteAllUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app');
        console.log('Connected to MongoDB:', process.env.MONGODB_URI);

        const result = await User.updateMany({ role: 'user' }, { $set: { role: 'admin' } });

        console.log(`\nPromotion complete!`);
        console.log(`  Matched: ${result.matchedCount} user(s) with role='user'`);
        console.log(`  Updated: ${result.modifiedCount} user(s) promoted to 'admin'`);

        const allUsers = await User.find({}, 'email role');
        console.log('\nAll users now:');
        allUsers.forEach((u) => console.log(`  - ${u.email} [${u.role}]`));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

promoteAllUsers();

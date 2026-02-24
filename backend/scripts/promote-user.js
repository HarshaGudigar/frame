require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function promoteUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOneAndUpdate(
            {},
            { role: 'owner' },
            { new: true, sort: { createdAt: 1 } },
        );
        console.log(`Successfully promoted user ${user.email} to owner.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

promoteUser();

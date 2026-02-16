const mongoose = require('mongoose');
const GlobalUser = require('../models/GlobalUser');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

const verifyAdmin = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        const email = 'admin@alyxnet.com';
        const user = await GlobalUser.findOne({ email });
        if (user) {
            user.isEmailVerified = true;
            await user.save();
            console.log(`User ${email} is now verified.`);
        } else {
            console.log(`User ${email} not found.`);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verifyAdmin();

const mongoose = require('mongoose');
const GlobalUser = require('../models/GlobalUser');
require('dotenv').config({ path: './.env' }); // Adjust path as needed

// Hardcoded config if .env is not picked up correctly by script location
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alyxnet-frame';

const createOwner = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@alyxnet.com';
        const password = 'password123';

        let user = await GlobalUser.findOne({ email });

        if (!user) {
            console.log('Creating new owner user...');
            user = new GlobalUser({
                email,
                password,
                firstName: 'Admin',
                lastName: 'User',
                role: 'owner',
                isActive: true,
            });
        } else {
            console.log('Updating existing user to owner...');
            user.role = 'owner';
            user.password = password; // Reset password to be sure
        }

        await user.save();
        console.log(`User ${email} is now an owner with password: ${password}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createOwner();

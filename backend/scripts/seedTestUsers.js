const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

const testUsers = [
    {
        email: 'test_admin@example.com',
        password: 'password123',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin',
        isEmailVerified: true,
    },
    {
        email: 'test_staff@example.com',
        password: 'password123',
        role: 'staff',
        firstName: 'Test',
        lastName: 'Staff',
        isEmailVerified: true,
    },
    {
        email: 'test_user@example.com',
        password: 'password123',
        role: 'user',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
    },
];

async function seedUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB. Creating test users...');

        for (const u of testUsers) {
            let existing = await User.findOne({ email: u.email });
            if (existing) {
                console.log(`User ${u.email} already exists. Updating role to ${u.role}...`);
                existing.role = u.role;
                await existing.save();
            } else {
                console.log(`Creating user ${u.email} with role ${u.role}...`);
                const newUser = new User(u);
                await newUser.save();
            }
        }

        console.log('User seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();

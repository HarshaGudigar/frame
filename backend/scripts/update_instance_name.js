const mongoose = require('mongoose');
const AppConfig = require('../models/AppConfig');
require('dotenv').config({ path: '../.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app');
        const config = await AppConfig.getInstance();
        config.instanceName = 'SMDS Technologies';
        config.instanceDescription = 'Enterprise Control Plane';
        await config.save();
        console.log('Successfully updated instanceName and instanceDescription');
    } catch (err) {
        console.error('Error updating:', err);
    } finally {
        mongoose.disconnect();
    }
}
run();

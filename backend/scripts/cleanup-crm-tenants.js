const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Tenant = require('../models/Tenant');

async function cleanupCRM() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Remove 'crm' from subscribedModules for all tenants
        const result = await Tenant.updateMany(
            { subscribedModules: 'crm' },
            { $pull: { subscribedModules: 'crm' } },
        );

        console.log(
            `Updated ${result.modifiedCount} tenants. Removed 'crm' from their subscribedModules.`,
        );
    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

cleanupCRM();

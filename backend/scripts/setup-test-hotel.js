const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const GlobalUser = require('../models/GlobalUser');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

const setupTestHotel = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const tenantSlug = 'hotel-test';
        let tenant = await Tenant.findOne({ slug: tenantSlug });

        if (!tenant) {
            console.log('Creating test tenant...');
            tenant = new Tenant({
                name: 'Test Hotel',
                slug: tenantSlug,
                dbUri: MONGODB_URI, // Using same DB for simplicity in test
                deploymentStatus: 'active',
                status: 'online',
                subscribedModules: ['hotel'],
            });
            await tenant.save();
        } else {
            console.log('Test tenant already exists, ensuring hotel module is subscribed...');
            if (!tenant.subscribedModules.includes('hotel')) {
                tenant.subscribedModules.push('hotel');
                await tenant.save();
            }
        }

        const adminEmail = 'admin@alyxnet.com';
        const user = await GlobalUser.findOne({ email: adminEmail });

        if (user) {
            const hasAccess = user.tenants.some(
                (t) => t.tenant.toString() === tenant._id.toString(),
            );
            if (!hasAccess) {
                console.log('Linking admin user to test tenant...');
                user.tenants.push({ tenant: tenant._id, role: 'owner' });
                await user.save();
            }
        }

        console.log('Setup complete. Tenant slug: hotel-test');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

setupTestHotel();

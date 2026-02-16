require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/GlobalUser');
const Tenant = require('./models/Tenant');
const config = require('./config');

const userId = '699312c0a766fd5fd38f08c2'; // From logs

async function verifyAccess() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findById(userId).populate('tenants.tenant');
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User Role:', user.role);
        console.log('User Tenants:', JSON.stringify(user.tenants, null, 2));

        // Check if any tenant has hotel module
        const hasHotel = user.tenants.some(
            (t) => t.tenant && t.tenant.subscribedModules.includes('hotel'),
        );
        console.log('Has Hotel Module Access:', hasHotel);

        if (!hasHotel && user.role !== 'owner') {
            console.log('Fixing access: Updating user role to owner...');
            user.role = 'owner';
            await user.save();
            console.log('User role updated to owner. Please refresh the frontend.');
        } else {
            console.log('User should already have access.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyAccess();

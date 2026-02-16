const mongoose = require('mongoose');
const Tenant = require('./backend/models/Tenant');
const GlobalUser = require('./backend/models/GlobalUser');
require('dotenv').config({ path: './backend/.env' });

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app');

        const tenants = await Tenant.find();
        console.log('--- TENANTS ---');
        tenants.forEach((t) => {
            console.log(
                `Slug: ${t.slug}, Name: ${t.name}, Modules: ${t.subscribedModules.join(', ')}`,
            );
        });

        const users = await GlobalUser.find().populate('tenants.tenant');
        console.log('\n--- USERS ---');
        users.forEach((u) => {
            console.log(`Email: ${u.email}, Role: ${u.role}, Tenants count: ${u.tenants.length}`);
            u.tenants.forEach((tt) => {
                console.log(`  - Tenant: ${tt.tenant?.slug}, Role: ${tt.role}`);
            });
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkData();

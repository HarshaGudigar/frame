require('dotenv').config();
const mongoose = require('mongoose');

async function removeCRM() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Product = require('./models/Product');

        const result = await Product.deleteMany({ slug: 'crm' });
        console.log(`Deleted ${result.deletedCount} products matching slug "crm".`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

removeCRM();

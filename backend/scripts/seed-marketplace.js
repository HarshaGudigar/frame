const mongoose = require('mongoose');
const Product = require('../models/Product');
const { MONGODB_URI } = require('../config');

async function seedMarketplace() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = [
            {
                name: 'Hotel Management',
                slug: 'hotel',
                category: 'Hospitality',
                description:
                    'Complete hotel management solution: Rooms, Bookings, Guests, and Housekeeping.',
                price: { amount: 49, currency: 'USD', interval: 'monthly' },
                features: ['Room Management', 'Guest CRM', 'Booking Engine', 'Housekeeping Status'],
                minPlatformVersion: '1.0.0',
                isActive: true,
            },
        ];

        for (const p of products) {
            const existing = await Product.findOne({ slug: p.slug });
            if (existing) {
                console.log(`Product ${p.name} already exists. Updating...`);
                Object.assign(existing, p);
                await existing.save();
            } else {
                console.log(`Creating product ${p.name}...`);
                await Product.create(p);
            }
        }

        console.log('Marketplace seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedMarketplace();

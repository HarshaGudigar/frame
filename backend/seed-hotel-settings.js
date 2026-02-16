require('dotenv').config();
const mongoose = require('mongoose');
const SettingsSchema = require('./modules/hotel/models/Settings');

const DEFAULT_SETTINGS = [
    {
        type: 'roomType',
        options: [
            { label: 'Single', value: 'Single', isActive: true },
            { label: 'Double', value: 'Double', isActive: true },
            { label: 'Suite', value: 'Suite', isActive: true },
            { label: 'Deluxe', value: 'Deluxe', isActive: true },
        ],
    },
    {
        type: 'idProofType',
        options: [
            { label: 'Passport', value: 'Passport', isActive: true },
            { label: 'Driving License', value: 'Driving License', isActive: true },
            { label: 'National ID', value: 'National ID', isActive: true },
            { label: 'Aadhaar', value: 'Aadhaar', isActive: true },
        ],
    },
    {
        type: 'purposeOfVisit',
        options: [
            { label: 'Business', value: 'Business', isActive: true },
            { label: 'Leisure', value: 'Leisure', isActive: true },
            { label: 'Medical', value: 'Medical', isActive: true },
            { label: 'Family', value: 'Family', isActive: true },
            { label: 'Other', value: 'Other', isActive: true },
        ],
    },
];

async function seedSettings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // We are seeding into the main DB, which acts as the tenant DB in this setup
        const Settings = SettingsSchema(mongoose.connection);

        for (const setting of DEFAULT_SETTINGS) {
            const existing = await Settings.findOne({ type: setting.type });
            if (!existing) {
                await Settings.create(setting);
                console.log(`Seeded setting: ${setting.type}`);
            } else {
                console.log(`Setting already exists: ${setting.type}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedSettings();

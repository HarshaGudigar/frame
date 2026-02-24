/**
 * Seed Script: Granular RBAC Matrix
 *
 * Populates the `roles` collection with the system-default Hub roles
 * based on the new Attribute-Based Access Control (ABAC) architecture.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/Role');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

const defaultRoles = [
    {
        name: 'admin',
        description:
            'System Administrator with full access aside from destructive core operations.',
        isSystem: true,
        permissions: [
            'users:read',
            'users:write',
            'marketplace:read',
            'marketplace:write',
            'roles:read',
            'roles:manage', // Required to view/edit the Role Matrix UI
            'audit:read',
            'system:read',
            'system:write',
            'hotel:read',
            'hotel:write',
        ],
    },
    {
        name: 'staff',
        description: 'Internal staff with read-only access to most platform metrics.',
        isSystem: true,
        permissions: [
            'users:read',
            'marketplace:read',
            'roles:read', // Can view matrix, but cannot manage
            'system:read',
            'hotel:read',
        ],
    },
    {
        name: 'user',
        description: 'Standard end-user with restricted self-serve capabilities.',
        isSystem: true,
        permissions: ['users:read', 'hotel:read'],
    },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB. Seeding roles...');

        for (const roleDef of defaultRoles) {
            // Upsert role based on name
            await Role.findOneAndUpdate(
                { name: roleDef.name },
                { $set: roleDef },
                { upsert: true, new: true },
            );
            console.log(`[SEED] Upserted default role: ${roleDef.name}`);
        }

        console.log('Role seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding roles:', error);
        process.exit(1);
    }
}

seed();

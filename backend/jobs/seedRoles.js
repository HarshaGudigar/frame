/**
 * Seed Default Roles — Upserts system roles on first startup (and safely on every restart).
 *
 * This is idempotent: if roles already exist they are updated in-place via upsert,
 * so it is safe to run on every server boot without duplicating data.
 */

const Role = require('../models/Role');
const logger = require('../utils/logger');

const DEFAULT_ROLES = [
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
            'roles:manage',
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
        permissions: ['users:read', 'marketplace:read', 'roles:read', 'system:read', 'hotel:read'],
    },
    {
        name: 'user',
        description: 'Standard end-user with restricted self-serve capabilities.',
        isSystem: true,
        permissions: ['users:read', 'hotel:read'],
    },
];

async function seedDefaultRoles() {
    try {
        for (const roleDef of DEFAULT_ROLES) {
            await Role.findOneAndUpdate(
                { name: roleDef.name },
                { $set: roleDef },
                { upsert: true, new: true },
            );
        }
        logger.info('[SEED] Default roles seeded successfully (admin, staff, user).');
    } catch (err) {
        logger.error({ err }, '[SEED] Failed to seed default roles');
    }
}

module.exports = { seedDefaultRoles };

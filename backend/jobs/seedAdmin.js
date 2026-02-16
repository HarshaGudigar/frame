/**
 * Seed Default Admin — Creates a default owner account on first startup.
 *
 * This runs once per database. If any user with the 'owner' role already exists,
 * the seed is skipped. The default credentials are:
 *
 *   Email:    admin@frame.local
 *   Password: Admin@123
 *
 * Users should change the password immediately after first login.
 */

const GlobalUser = require('../models/GlobalUser');
const logger = require('../utils/logger');

const DEFAULT_ADMIN = {
    email: 'admin@frame.local',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'Frame',
    role: 'owner',
    isActive: true,
    isEmailVerified: true,
};

async function seedDefaultAdmin() {
    try {
        // Skip if any owner already exists
        const existingOwner = await GlobalUser.findOne({ role: 'owner' });
        if (existingOwner) {
            return; // Already seeded — nothing to do
        }

        // Skip if the default admin email is already taken (e.g., with a different role)
        const existingUser = await GlobalUser.findOne({ email: DEFAULT_ADMIN.email });
        if (existingUser) {
            return;
        }

        const admin = new GlobalUser(DEFAULT_ADMIN);
        await admin.save();

        logger.info('──────────────────────────────────────────────');
        logger.info('🔑 Default admin account created:');
        logger.info(`   Email:    ${DEFAULT_ADMIN.email}`);
        logger.info('   Password: Admin@123');
        logger.info('   ⚠️  Change this password after first login!');
        logger.info('──────────────────────────────────────────────');
    } catch (err) {
        logger.error({ err }, 'Failed to seed default admin user');
    }
}

module.exports = { seedDefaultAdmin };

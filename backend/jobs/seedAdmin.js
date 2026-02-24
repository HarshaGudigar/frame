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

const User = require('../models/User');
const logger = require('../utils/logger');
const config = require('../config');

const DEFAULT_ADMIN = {
    email: config.DEFAULT_ADMIN_EMAIL,
    password: config.DEFAULT_ADMIN_PASSWORD,
    firstName: 'Admin',
    lastName: 'Frame',
    role: 'superuser',
    isActive: true,
    isEmailVerified: true,
};

async function seedDefaultAdmin() {
    try {
        // Skip if any superuser already exists
        const existingOwner = await User.findOne({ role: 'superuser' });
        if (existingOwner) {
            return; // Already seeded — nothing to do
        }

        // Skip if the default admin email is already taken (e.g., with a different role)
        const existingUser = await User.findOne({ email: DEFAULT_ADMIN.email });
        if (existingUser) {
            return;
        }

        const admin = new User(DEFAULT_ADMIN);
        await admin.save();

        logger.info('──────────────────────────────────────────────');
        logger.info('🔑 Default admin account created:');
        logger.info(`   Email:    ${DEFAULT_ADMIN.email}`);
        if (config.DEFAULT_ADMIN_PASSWORD === 'Admin@123') {
            logger.info('   Password: Admin@123');
        } else {
            logger.info('   Password: [SEE ENVIRONMENT VARIABLES]');
        }
        logger.info('   ⚠️  Change this password after first login!');
        logger.info('──────────────────────────────────────────────');
    } catch (err) {
        logger.error({ err }, 'Failed to seed default admin user');
    }
}

module.exports = { seedDefaultAdmin };

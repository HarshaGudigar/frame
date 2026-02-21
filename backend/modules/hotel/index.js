const routes = require('./routes');

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

module.exports = {
    routes,

    /**
     * onProvision(tenant, logger)
     * Seed default Settings on first provision.
     */
    onProvision: async (tenant, logger) => {
        logger.info({ tenantId: tenant.slug }, 'Provisioning Hotel module v2.0.0...');

        const { getTenantConnection } = require('../../utils/tenantDBCache');
        const SettingsSchema = require('./models/Settings');

        const connection = await getTenantConnection(tenant.slug, tenant.dbUri);
        const Settings = SettingsSchema(connection);

        for (const setting of DEFAULT_SETTINGS) {
            const existing = await Settings.findOne({ type: setting.type });
            if (!existing) {
                await Settings.create(setting);
                logger.info(
                    { tenantId: tenant.slug, type: setting.type },
                    'Seeded default settings',
                );
            }
        }
    },
};

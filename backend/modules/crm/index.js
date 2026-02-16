const routes = require('./routes');

module.exports = {
    name: 'Customer Relationship Management',
    slug: 'crm',
    version: '1.0.0',
    description: 'Track leads, contacts, and sales pipeline.',
    routes,

    /**
     * onProvision(tenant, logger)
     * Seed initial CRM data if needed.
     */
    onProvision: async (tenant, logger) => {
        logger.info({ tenantId: tenant.slug }, 'CRM module provisioned. Ready for leads.');

        // Example: You could seed a default 'Welcome Lead' here
        // const { getTenantConnection } = require('../../utils/tenantDBCache');
        // const connection = await getTenantConnection(tenant.slug, tenant.dbUri);
        // const Lead = require('./models/Lead')(connection);
        // await Lead.create({ firstName: 'System', lastName: 'Admin', company: 'Alyxnet' });
    },
};

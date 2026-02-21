const routes = require('./routes');
const logger = require('../../utils/logger');

module.exports = {
    routes,

    // Core module hooks
    onProvision: async (tenant) => {
        logger.info(`[Billing] Provisioning billing core for tenant: ${tenant.slug}`);
        // Note: The billing module itself doesn't need a DB collection per tenant right now,
        // it acts more like a service interacting with Stripe and the central Subscriptions.
    },

    onDeprovision: async (tenant) => {
        logger.info(`[Billing] Deprovisioning billing core for tenant: ${tenant.slug}`);
    },
};

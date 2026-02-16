const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

/**
 * Trial Cleanup Job
 * Runs daily to find expired trial subscriptions and remove them from tenants.
 */
function startTrialCleanup() {
    // Run at 04:00 AM every day
    cron.schedule('0 4 * * *', async () => {
        logger.info('Starting trial cleanup job');
        try {
            const now = new Date();

            // 1. Find all expired trial subscriptions
            const expiredSubs = await Subscription.find({
                status: 'trialing',
                trialExpiry: { $lte: now },
            }).populate('product');

            for (const sub of expiredSubs) {
                logger.info(
                    { tenant: sub.tenant, product: sub.product.slug },
                    'Processing expired trial',
                );

                // Update subscription status
                sub.status = 'expired';
                await sub.save();

                // Remove from tenant's subscribedModules
                const tenant = await Tenant.findById(sub.tenant);
                if (tenant) {
                    tenant.subscribedModules = tenant.subscribedModules.filter(
                        (mod) => mod !== sub.product.slug.toLowerCase(),
                    );
                    await tenant.save();
                    logger.info(
                        { tenant: tenant.slug, module: sub.product.slug },
                        'Removed expired trial module from tenant',
                    );
                }
            }

            logger.info({ count: expiredSubs.length }, 'Trial cleanup job completed');
        } catch (err) {
            logger.error({ err }, 'Trial cleanup job failed');
        }
    });
}

module.exports = { startTrialCleanup };

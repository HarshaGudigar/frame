const cron = require('node-cron');
const RefreshToken = require('../models/RefreshToken');
const VerificationToken = require('../models/VerificationToken');
const logger = require('../utils/logger');

/**
 * Token Cleanup Job
 * Runs daily at 03:00 to purge stale tokens from the database.
 */
function startTokenCleanup() {
    cron.schedule('0 3 * * *', async () => {
        logger.info('Token cleanup job started');

        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Purge revoked refresh tokens older than 30 days
            const revokedResult = await RefreshToken.deleteMany({
                revoked: { $ne: null, $lt: thirtyDaysAgo },
            });

            // Purge expired refresh tokens
            const expiredResult = await RefreshToken.deleteMany({
                expiresAt: { $lt: new Date() },
            });

            // Purge used/expired verification tokens older than 7 days
            const verificationResult = await VerificationToken.deleteMany({
                $or: [
                    { usedAt: { $ne: null, $lt: sevenDaysAgo } },
                    { expiresAt: { $lt: sevenDaysAgo } },
                ],
            });

            logger.info(
                {
                    revokedRefreshTokens: revokedResult.deletedCount,
                    expiredRefreshTokens: expiredResult.deletedCount,
                    staleVerificationTokens: verificationResult.deletedCount,
                },
                'Token cleanup job completed',
            );
        } catch (error) {
            logger.error({ err: error }, 'Token cleanup job failed');
        }
    });

    logger.info('Token cleanup cron job scheduled (daily at 03:00)');
}

module.exports = { startTokenCleanup };

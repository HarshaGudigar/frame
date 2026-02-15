/**
 * Manual Backup Trigger
 *
 * Usage:
 *   node backend/scripts/backup.js
 *   docker exec frame-app node backend/scripts/backup.js
 *   npm run backup --prefix backend
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Override BACKUP_ENABLED for manual runs
process.env.BACKUP_ENABLED = 'true';

const { runBackup } = require('../jobs/backup');
const logger = require('../utils/logger');

(async () => {
    try {
        logger.info('Manual backup started');
        await runBackup();
        logger.info('Manual backup completed successfully');
        process.exit(0);
    } catch (err) {
        logger.error({ err: err.message }, 'Manual backup failed');
        process.exit(1);
    }
})();

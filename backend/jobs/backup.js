const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const { cleanLocal } = require('./backup-providers/local');

const PROVIDERS = {
    local: () => require('./backup-providers/local'),
    s3: () => require('./backup-providers/s3'),
    gdrive: () => require('./backup-providers/gdrive'),
};

/**
 * Run a single backup cycle.
 * 1. mongodump → compressed archive in BACKUP_DIR
 * 2. Upload to configured provider (skip for 'local')
 * 3. Remote retention cleanup
 * 4. Local retention cleanup (always runs)
 */
async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.gz`;
    const filePath = path.join(config.BACKUP_DIR, filename);

    // Ensure backup directory exists
    if (!fs.existsSync(config.BACKUP_DIR)) {
        fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
    }

    // Step 1: mongodump
    logger.info({ filename }, 'Starting MongoDB backup');

    try {
        execSync(
            `"${config.MONGODUMP_BIN}" --uri="${config.MONGODB_URI}" --gzip --archive="${filePath}"`,
            {
                timeout: 5 * 60 * 1000,
                stdio: ['pipe', 'pipe', 'pipe'],
            },
        );
    } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : '';
        logger.error({ err: err.message, stderr }, 'mongodump failed');
        throw new Error(`mongodump failed: ${stderr || err.message}`, { cause: err });
    }

    const stat = fs.statSync(filePath);
    logger.info({ filename, sizeBytes: stat.size }, 'mongodump completed');

    // Step 2 & 3: Upload + remote retention (skip for 'local')
    const providerName = config.BACKUP_PROVIDER;
    const loadProvider = PROVIDERS[providerName];

    if (!loadProvider) {
        throw new Error(`Unknown backup provider: ${providerName}`);
    }

    const provider = loadProvider();

    if (providerName !== 'local') {
        await provider.upload(filePath, filename);
        await provider.deleteOld(config.BACKUP_RETENTION_DAYS);
    }

    // Step 4: Local retention cleanup (always runs)
    cleanLocal(config.BACKUP_DIR, config.BACKUP_RETENTION_DAYS);

    logger.info({ provider: providerName, filename }, 'Backup cycle completed');
}

/**
 * Start the backup cron job.
 * Gated by BACKUP_ENABLED to prevent accidental runs in dev.
 */
function startBackupJob() {
    if (!config.BACKUP_ENABLED) {
        logger.info('Backup job disabled (BACKUP_ENABLED !== true)');
        return;
    }

    cron.schedule(config.BACKUP_CRON, async () => {
        try {
            await runBackup();
        } catch (err) {
            logger.error({ err: err.message }, 'Backup job failed');
        }
    });

    logger.info(
        { cron: config.BACKUP_CRON, provider: config.BACKUP_PROVIDER },
        'Backup cron job scheduled',
    );
}

module.exports = { startBackupJob, runBackup };

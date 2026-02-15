const fs = require('fs');
const path = require('path');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Local Backup Provider
 * Manages backup files in BACKUP_DIR (host-mounted volume).
 */

/**
 * Upload is a no-op for local — mongodump already writes to BACKUP_DIR.
 */
async function upload() {
    // File is already in BACKUP_DIR from mongodump
}

/**
 * List backup files in the backup directory.
 * @returns {Array<{ name: string, date: Date }>}
 */
async function list() {
    const dir = config.BACKUP_DIR;
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gz'));
    return files.map((name) => {
        const stat = fs.statSync(path.join(dir, name));
        return { name, date: stat.mtime };
    });
}

/**
 * Delete backup files older than the retention period.
 * @param {number} retentionDays
 */
async function deleteOld(retentionDays) {
    const dir = config.BACKUP_DIR;
    if (!fs.existsSync(dir)) return;

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gz'));

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtime < cutoff) {
            fs.unlinkSync(filePath);
            logger.info({ file }, 'Deleted old local backup');
        }
    }
}

/**
 * Clean local backup directory — reused by main job regardless of provider.
 * @param {string} dir
 * @param {number} retentionDays
 */
function cleanLocal(dir, retentionDays) {
    if (!fs.existsSync(dir)) return;

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gz'));

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtime < cutoff) {
            fs.unlinkSync(filePath);
            logger.info({ file }, 'Cleaned old local backup file');
        }
    }
}

module.exports = { upload, list, deleteOld, cleanLocal };

const fs = require('fs');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * S3 Backup Provider
 * Uses @aws-sdk/client-s3 for uploads to S3 or Lightsail Object Storage.
 * AWS credentials are resolved via the standard SDK credential chain
 * (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars).
 */

let _s3Client = null;

function getClient() {
    if (!_s3Client) {
        // Lazy-load to avoid requiring AWS SDK when not using S3 provider
        const { S3Client } = require('@aws-sdk/client-s3');
        _s3Client = new S3Client({ region: config.BACKUP_S3_REGION });
    }
    return _s3Client;
}

/**
 * Upload a backup file to S3.
 * @param {string} filePath - Absolute path to the backup file
 * @param {string} filename - Filename for the S3 key
 */
async function upload(filePath, filename) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = getClient();
    const key = `${config.BACKUP_S3_PREFIX}${filename}`;

    await client.send(
        new PutObjectCommand({
            Bucket: config.BACKUP_S3_BUCKET,
            Key: key,
            Body: fs.createReadStream(filePath),
            ContentType: 'application/gzip',
        }),
    );

    logger.info({ bucket: config.BACKUP_S3_BUCKET, key }, 'Backup uploaded to S3');
}

/**
 * List backup objects in the S3 prefix.
 * @returns {Array<{ name: string, date: Date }>}
 */
async function list() {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const client = getClient();

    const response = await client.send(
        new ListObjectsV2Command({
            Bucket: config.BACKUP_S3_BUCKET,
            Prefix: config.BACKUP_S3_PREFIX,
        }),
    );

    if (!response.Contents) return [];

    return response.Contents.filter((obj) => obj.Key.endsWith('.gz')).map((obj) => ({
        name: obj.Key,
        date: obj.LastModified,
    }));
}

/**
 * Delete S3 backup objects older than the retention period.
 * @param {number} retentionDays
 */
async function deleteOld(retentionDays) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = getClient();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const objects = await list();

    for (const obj of objects) {
        if (obj.date < cutoff) {
            await client.send(
                new DeleteObjectCommand({
                    Bucket: config.BACKUP_S3_BUCKET,
                    Key: obj.name,
                }),
            );
            logger.info({ key: obj.name }, 'Deleted old S3 backup');
        }
    }
}

module.exports = { upload, list, deleteOld };

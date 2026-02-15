const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Google Drive Backup Provider
 * Uses existing jsonwebtoken + axios — no new dependencies.
 * Authenticates via a Google Cloud service account (RS256 JWT → access token).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

let _cachedToken = null;
let _tokenExpiry = 0;

/**
 * Get an access token from Google using the service account JWT flow.
 */
async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if still valid (60s safety margin)
    if (_cachedToken && now < _tokenExpiry - 60) {
        return _cachedToken;
    }

    const privateKey = config.BACKUP_GDRIVE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const payload = {
        iss: config.BACKUP_GDRIVE_SERVICE_ACCOUNT_EMAIL,
        scope: 'https://www.googleapis.com/auth/drive.file',
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
    };

    const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    const response = await axios.post(
        TOKEN_URL,
        new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }).toString(),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
    );

    _cachedToken = response.data.access_token;
    _tokenExpiry = now + response.data.expires_in;

    return _cachedToken;
}

/**
 * Upload a backup file to Google Drive.
 * @param {string} filePath - Absolute path to the backup file
 * @param {string} filename - Filename for Google Drive
 */
async function upload(filePath, filename) {
    const token = await getAccessToken();

    const metadata = {
        name: filename,
        mimeType: 'application/gzip',
    };

    if (config.BACKUP_GDRIVE_FOLDER_ID) {
        metadata.parents = [config.BACKUP_GDRIVE_FOLDER_ID];
    }

    // Step 1: Initiate resumable upload
    const initResponse = await axios.post(`${DRIVE_UPLOAD_URL}?uploadType=resumable`, metadata, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const uploadUri = initResponse.headers.location;

    // Step 2: Upload file data
    const fileStream = fs.createReadStream(filePath);
    const stat = fs.statSync(filePath);

    await axios.put(uploadUri, fileStream, {
        headers: {
            'Content-Length': stat.size,
            'Content-Type': 'application/gzip',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

    logger.info(
        { filename, folderId: config.BACKUP_GDRIVE_FOLDER_ID },
        'Backup uploaded to Google Drive',
    );
}

/**
 * List backup files in the configured Google Drive folder.
 * @returns {Array<{ name: string, date: Date, id: string }>}
 */
async function list() {
    const token = await getAccessToken();

    let query = "mimeType='application/gzip' and trashed=false";
    if (config.BACKUP_GDRIVE_FOLDER_ID) {
        query += ` and '${config.BACKUP_GDRIVE_FOLDER_ID}' in parents`;
    }

    const response = await axios.get(DRIVE_FILES_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
            q: query,
            fields: 'files(id,name,createdTime)',
            orderBy: 'createdTime desc',
            pageSize: 100,
        },
    });

    return (response.data.files || []).map((f) => ({
        name: f.name,
        date: new Date(f.createdTime),
        id: f.id,
    }));
}

/**
 * Delete Google Drive backup files older than the retention period.
 * @param {number} retentionDays
 */
async function deleteOld(retentionDays) {
    const token = await getAccessToken();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const files = await list();

    for (const file of files) {
        if (file.date < cutoff) {
            await axios.delete(`${DRIVE_FILES_URL}/${file.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            logger.info({ filename: file.name, id: file.id }, 'Deleted old Google Drive backup');
        }
    }
}

module.exports = { upload, list, deleteOld };

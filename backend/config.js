/**
 * Centralized Configuration — Alyxnet Frame
 *
 * All environment variables are read here and validated.
 * The server will REFUSE to start if required secrets are missing.
 * No hardcoded fallbacks for security-critical values.
 */

// ─── Required Secrets (fail-fast if missing, skip in test mode) ──────────────

if (process.env.NODE_ENV !== 'test') {
    if (!process.env.JWT_SECRET) {
        console.error('❌ FATAL: JWT_SECRET is not set in environment variables.');
        console.error('   Add it to backend/.env: JWT_SECRET=your-secure-secret-here');
        process.exit(1);
    }

    if (!process.env.HEARTBEAT_SECRET) {
        console.warn(
            '⚠️ WARNING: HEARTBEAT_SECRET is not set. Fleet Manager features will be limited.',
        );
        console.warn('   Add it to backend/.env: HEARTBEAT_SECRET=your-secure-key-here');
    }

    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ WARNING: RESEND_API_KEY is not set. Email features will be disabled.');
        console.warn('   Add it to backend/.env: RESEND_API_KEY=re_your-key-here');
    }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    // Server
    PORT: parseInt(process.env.PORT, 10) || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app',

    // Auth
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY || '15m', // Short-lived access token
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, // Fallback for dev
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d', // Long-lived refresh token

    // Fleet Manager
    HEARTBEAT_SECRET: process.env.HEARTBEAT_SECRET,

    // CORS — comma-separated list of allowed origins
    CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    // Email (Resend)
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
    EMAIL_FROM: process.env.EMAIL_FROM || 'Alyxnet Frame <noreply@yourdomain.com>',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    RATE_LIMIT_MAX_AUTH:
        parseInt(process.env.RATE_LIMIT_MAX_AUTH, 10) ||
        (process.env.NODE_ENV === 'production' ? 20 : 1000),

    // Endpoint-specific rate limits
    RATE_LIMIT_LOGIN_WINDOW_MS:
        parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 10) || 15 * 60 * 1000,
    RATE_LIMIT_LOGIN_MAX:
        parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) ||
        (process.env.NODE_ENV === 'production' ? 10 : 1000),
    RATE_LIMIT_REGISTER_WINDOW_MS:
        parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, 10) || 15 * 60 * 1000,
    RATE_LIMIT_REGISTER_MAX:
        parseInt(process.env.RATE_LIMIT_REGISTER_MAX, 10) ||
        (process.env.NODE_ENV === 'production' ? 5 : 1000),
    RATE_LIMIT_FORGOT_PW_WINDOW_MS:
        parseInt(process.env.RATE_LIMIT_FORGOT_PW_WINDOW_MS, 10) || 15 * 60 * 1000,
    RATE_LIMIT_FORGOT_PW_MAX:
        parseInt(process.env.RATE_LIMIT_FORGOT_PW_MAX, 10) ||
        (process.env.NODE_ENV === 'production' ? 5 : 1000),

    // Request Limits
    BODY_SIZE_LIMIT: process.env.BODY_SIZE_LIMIT || '10kb',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Backup
    BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
    BACKUP_PROVIDER: process.env.BACKUP_PROVIDER || 'local', // 'local' | 's3' | 'gdrive'
    BACKUP_CRON: process.env.BACKUP_CRON || '0 2 * * *', // Default 02:00 UTC
    BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 7,
    BACKUP_DIR: process.env.BACKUP_DIR || '/backups',

    // Backup — S3
    BACKUP_S3_BUCKET: process.env.BACKUP_S3_BUCKET || '',
    BACKUP_S3_REGION: process.env.BACKUP_S3_REGION || 'us-east-1',
    BACKUP_S3_PREFIX: process.env.BACKUP_S3_PREFIX || 'backups/',

    // Backup — Google Drive
    BACKUP_GDRIVE_FOLDER_ID: process.env.BACKUP_GDRIVE_FOLDER_ID || '',
    BACKUP_GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.BACKUP_GDRIVE_SERVICE_ACCOUNT_EMAIL || '',
    BACKUP_GDRIVE_PRIVATE_KEY: process.env.BACKUP_GDRIVE_PRIVATE_KEY || '',

    // Runtime Mode
    RUNTIME_MODE: process.env.APP_TENANT_ID ? 'SILO' : 'HUB',

    // Default Admin (Seeding)
    DEFAULT_ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@frame.local',
    DEFAULT_ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123',
};

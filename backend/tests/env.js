const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-tests';
process.env.HEARTBEAT_SECRET = 'test-heartbeat-secret';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.RATE_LIMIT_MAX_AUTH = '1000'; // Don't rate-limit in tests
process.env.RUNTIME_MODE = 'SILO';
process.env.APP_TENANT_ID = 'default';
process.env.BACKUP_DIR = path.join(__dirname, '..', 'backup');

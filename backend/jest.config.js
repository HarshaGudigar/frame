module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    // Set test environment variables BEFORE any module loads
    globals: {},
    setupFiles: ['./tests/env.js'],
};

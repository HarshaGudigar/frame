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
    // Transform ESM dependencies (otplib uses @scure/base, @noble/hashes which are ESM-only)
    transformIgnorePatterns: ['/node_modules/(?!(@scure|@otplib|otplib|@noble)/)'],
    transform: {
        '^.+\\.[jt]s$': 'ts-jest',
    },
};

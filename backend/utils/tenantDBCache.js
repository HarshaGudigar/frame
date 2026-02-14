const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

// Cache for tenant-specific connections
const tenantConnections = {};

/**
 * Gets or creates a connection to a tenant's database.
 * @param {string} tenantId - The unique slug or ID of the tenant.
 * @param {string} dbUri - The MongoDB connection string for the tenant.
 * @returns {mongoose.Connection}
 */
const getTenantConnection = async (tenantId, dbUri) => {
    if (tenantConnections[tenantId]) {
        return tenantConnections[tenantId];
    }

    // Create a new connection if it doesn't exist
    const connection = mongoose.createConnection(dbUri);

    connection.on('connected', () => logger.info(`Connected to database for tenant: ${tenantId}`));
    connection.on('error', (err) =>
        logger.error({ err }, `Error in tenant ${tenantId} connection`),
    );

    tenantConnections[tenantId] = connection;
    return connection;
};

module.exports = {
    getTenantConnection,
};

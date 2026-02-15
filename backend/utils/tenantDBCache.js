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

/**
 * Derives a tenant-specific database URI from the hub's MONGODB_URI.
 * Replaces the database name with `frame_tenant_{slug}`.
 * Handles both standard (mongodb://) and SRV (mongodb+srv://) connection strings.
 * @param {string} hubUri - The hub's MongoDB connection string.
 * @param {string} slug - The tenant slug.
 * @returns {string} The tenant-specific URI.
 */
const deriveTenantDbUri = (hubUri, slug) => {
    const dbName = `frame_tenant_${slug}`;

    // For SRV URIs, URL class cannot parse mongodb+srv:// directly in all environments.
    // Replace the database name portion after the host and before query params.
    const srvMatch = hubUri.match(/^(mongodb\+srv:\/\/[^/]+)\/?([^?]*)?(\?.*)?$/);
    if (srvMatch) {
        const base = srvMatch[1];
        const query = srvMatch[3] || '';
        return `${base}/${dbName}${query}`;
    }

    // Standard mongodb:// — use URL class
    const stdMatch = hubUri.match(/^(mongodb:\/\/[^/]+)\/?([^?]*)?(\?.*)?$/);
    if (stdMatch) {
        const base = stdMatch[1];
        const query = stdMatch[3] || '';
        return `${base}/${dbName}${query}`;
    }

    // Fallback: just append the database name
    const separator = hubUri.endsWith('/') ? '' : '/';
    return `${hubUri}${separator}${dbName}`;
};

/**
 * Provisions a new database for a tenant by connecting and pinging it.
 * MongoDB creates databases lazily on first write, but connecting + pinging
 * ensures the URI is valid and the server is reachable.
 * @param {string} slug - The tenant slug.
 * @returns {string} The provisioned database URI.
 */
const provisionTenantDatabase = async (slug) => {
    const hubUri = config.MONGODB_URI;
    const dbUri = deriveTenantDbUri(hubUri, slug);

    const connection = mongoose.createConnection(dbUri);
    try {
        await connection.asPromise();
        await connection.db.admin().ping();
        logger.info(`Provisioned database for tenant: ${slug} at ${dbUri}`);
    } finally {
        await connection.close();
    }

    return dbUri;
};

/**
 * Drops a tenant's database entirely. Used during tenant deletion cleanup.
 * @param {string} dbUri - The tenant's database URI to drop.
 */
const dropTenantDatabase = async (dbUri) => {
    const connection = mongoose.createConnection(dbUri);
    try {
        await connection.asPromise();
        await connection.db.dropDatabase();
        logger.info(`Dropped database at ${dbUri}`);
    } finally {
        await connection.close();
    }
};

/**
 * Closes and removes a cached tenant connection.
 * @param {string} tenantId - The tenant slug or ID.
 */
const closeTenantConnection = async (tenantId) => {
    if (tenantConnections[tenantId]) {
        await tenantConnections[tenantId].close();
        delete tenantConnections[tenantId];
        logger.info(`Closed cached connection for tenant: ${tenantId}`);
    }
};

module.exports = {
    getTenantConnection,
    deriveTenantDbUri,
    provisionTenantDatabase,
    dropTenantDatabase,
    closeTenantConnection,
};

/**
 * Module Loader — Auto-discovers and registers modules from the modules/ directory.
 * 
 * Each module must export a manifest from its index.js:
 *   { name, slug, version, description, routes }
 * 
 * The loader mounts each module's routes under /api/m/{slug}/
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

/**
 * Discovers all valid modules in the modules/ directory.
 * Skips folders starting with _ (e.g., _template) and folders without index.js.
 * 
 * @param {Object} logger - Pino logger instance
 * @returns {Array} Array of module manifests
 */
function discoverModules(logger) {
    const modules = [];

    if (!fs.existsSync(MODULES_DIR)) {
        fs.mkdirSync(MODULES_DIR, { recursive: true });
        logger.info('Created modules/ directory');
    }

    const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });

    for (const entry of entries) {
        // Skip non-directories and template/hidden folders
        if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) {
            continue;
        }

        const modulePath = path.join(MODULES_DIR, entry.name, 'index.js');

        if (!fs.existsSync(modulePath)) {
            logger.warn({ module: entry.name }, 'Module folder missing index.js — skipped');
            continue;
        }

        try {
            const manifest = require(modulePath);

            // Validate required fields
            if (!manifest.slug || !manifest.routes) {
                logger.warn({ module: entry.name }, 'Module missing slug or routes — skipped');
                continue;
            }

            modules.push(manifest);
            logger.info({
                module: manifest.name,
                slug: manifest.slug,
                version: manifest.version || '0.0.0',
            }, 'Module discovered');
        } catch (err) {
            logger.error({ module: entry.name, err }, 'Failed to load module');
        }
    }

    return modules;
}

/**
 * Registers discovered modules on the Express app.
 * Mounts each module's routes under /api/m/{slug}/
 * 
 * @param {Object} app - Express app instance
 * @param {Array} modules - Array of module manifests
 * @param {Function} accessMiddleware - Module access check middleware
 * @param {Object} logger - Pino logger instance
 */
function registerModules(app, modules, accessMiddleware, logger) {
    for (const mod of modules) {
        const mountPath = `/api/m/${mod.slug}`;
        app.use(mountPath, accessMiddleware(mod.slug), mod.routes);
        logger.info({ slug: mod.slug, path: mountPath }, 'Module routes registered');
    }

    logger.info(`${modules.length} module(s) loaded`);
}

/**
 * Returns a summary of all loaded modules (for health check / docs).
 */
function getModuleSummary(modules) {
    return modules.map(m => ({
        name: m.name,
        slug: m.slug,
        version: m.version || '0.0.0',
        description: m.description || '',
        apiBase: `/api/m/${m.slug}`,
    }));
}

module.exports = { discoverModules, registerModules, getModuleSummary };

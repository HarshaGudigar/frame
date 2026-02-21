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

        const modulePath = path.join(MODULES_DIR, entry.name);
        const indexPath = path.join(modulePath, 'index.js');
        const manifestPath = path.join(modulePath, 'manifest.json');

        if (!fs.existsSync(indexPath)) {
            logger.warn({ module: entry.name }, 'Module folder missing index.js — skipped');
            continue;
        }

        if (!fs.existsSync(manifestPath)) {
            logger.warn({ module: entry.name }, 'Module folder missing manifest.json — skipped');
            continue;
        }

        try {
            // Read manifest.json
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            // Require index.js (exports routes)
            const moduleExport = require(indexPath);

            // Validate required fields
            if (!manifest.slug || !manifest.name) {
                logger.warn({ module: entry.name }, 'manifest.json missing slug or name — skipped');
                continue;
            }

            if (!moduleExport.routes) {
                logger.warn({ module: entry.name }, 'index.js missing exported routes — skipped');
                continue;
            }

            // Merge manifest with exported routes
            const combinedModule = {
                ...manifest,
                routes: moduleExport.routes,
            };

            modules.push(combinedModule);
            logger.info(
                {
                    module: combinedModule.name,
                    slug: combinedModule.slug,
                    version: combinedModule.version || '0.0.0',
                },
                'Module discovered',
            );
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
    return modules.map((m) => ({
        name: m.name,
        slug: m.slug,
        version: m.version || '0.0.0',
        description: m.description || '',
        apiBase: `/api/m/${m.slug}`,
    }));
}

module.exports = { discoverModules, registerModules, getModuleSummary };

/**
 * Module Template — Copy this folder to create a new module.
 * 
 * Required exports:
 *   - name: Display name of the module
 *   - slug: URL-safe identifier (must match folder name)
 *   - version: Semantic version string
 *   - routes: Express Router with module endpoints
 * 
 * Optional exports:
 *   - description: Short description
 *   - swaggerSpec: OpenAPI spec object for per-module docs
 *   - init(app, logger): Async function called once at startup
 */

const routes = require('./routes');

module.exports = {
    name: 'Template Module',
    slug: 'template',
    version: '1.0.0',
    description: 'A template module to copy when creating new modules.',
    routes,
    // swaggerSpec: require('./swagger'),
};

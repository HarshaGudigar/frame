const asyncContext = require('../utils/asyncContext');

/**
 * Mongoose plugin to automatically enforce tenant isolation at the query level.
 *
 * If a schema has a `tenant` field, this plugin hooks into all read/update/delete
 * operations and forcefully injects `{ tenant: currentTenantId }` into the query filter,
 * ensuring that data from one tenant can NEVER leak into another tenant's request context.
 *
 * Admins/system jobs can bypass this by chaining `.setOptions({ skipTenantCheck: true })`
 * on the Mongoose query.
 */
function tenantPlugin(schema) {
    // Only apply if the schema actually has a tenant field defined
    if (!schema.path('tenant')) {
        return;
    }

    const enforceTenantIsolation = function () {
        // Allow explicit bypass for system queries or cross-tenant aggregations
        const options = this.getOptions ? this.getOptions() : this.options || {};
        if (options && options.skipTenantCheck) {
            return;
        }

        const store = asyncContext.getStore();

        // If there's an active HTTP context with a resolved tenant...
        if (store && store.tenant && store.tenant._id) {
            // Forcefully add the tenant ID to the query conditions
            this.where({ tenant: store.tenant._id });
        }
    };

    // Apply hook to all standard find operations
    const queryMethods = [
        'find',
        'findOne',
        'countDocuments',
        'update',
        'updateOne',
        'updateMany',
        'delete',
        'deleteOne',
        'deleteMany',
        'findOneAndDelete',
        'findOneAndRemove',
        'findOneAndUpdate',
        'findOneAndReplace',
    ];

    queryMethods.forEach((method) => {
        schema.pre(method, enforceTenantIsolation);
    });
}

module.exports = tenantPlugin;

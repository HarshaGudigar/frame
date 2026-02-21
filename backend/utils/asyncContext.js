const { AsyncLocalStorage } = require('async_hooks');

/**
 * Global AsyncLocalStorage instance for request-scoped context.
 * Used primarily to store the resolved tenant for the current request
 * so it can be accessed deep within Mongoose models/plugins without
 * explicit parameter passing.
 */
const asyncContext = new AsyncLocalStorage();

module.exports = asyncContext;

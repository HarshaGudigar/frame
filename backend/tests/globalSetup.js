const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async function globalSetup() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Store the URI and instance for tests and teardown
    process.env.MONGODB_URI = uri;
    globalThis.__MONGOD__ = mongod;
};

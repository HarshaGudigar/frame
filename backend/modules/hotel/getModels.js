const { getTenantConnection } = require('../../utils/tenantDBCache');
const RoomSchema = require('./models/Room');
const CustomerSchema = require('./models/Customer');
const BookingSchema = require('./models/Booking');
const ServiceSchema = require('./models/Service');
const AgentSchema = require('./models/Agent');
const BookingServiceSchema = require('./models/BookingService');
const TransactionSchema = require('./models/Transaction');
const TransactionCategorySchema = require('./models/TransactionCategory');
const BusinessInfoSchema = require('./models/BusinessInfo');
const SettingsSchema = require('./models/Settings');
const CounterSchema = require('./models/Counter');
const HousekeepingTaskSchema = require('./models/HousekeepingTask');
const InventoryItemSchema = require('./models/InventoryItem');

/**
 * Get all hotel models bound to the current tenant's connection.
 */
const getModels = async (req) => {
    const connection = req.db || (await getTenantConnection(req.tenant.slug, req.tenant.dbUri));

    return {
        Room: RoomSchema(connection),
        Customer: CustomerSchema(connection),
        Booking: BookingSchema(connection),
        Service: ServiceSchema(connection),
        Agent: AgentSchema(connection),
        BookingService: BookingServiceSchema(connection),
        Transaction: TransactionSchema(connection),
        TransactionCategory: TransactionCategorySchema(connection),
        BusinessInfo: BusinessInfoSchema(connection),
        Settings: SettingsSchema(connection),
        Counter: CounterSchema(connection),
        HousekeepingTask: HousekeepingTaskSchema(connection),
        InventoryItem: InventoryItemSchema(connection),
        connection,
    };
};

module.exports = getModels;

const mongoose = require('mongoose');
const User = require('../models/GlobalUser');

// --- Tool Registry Definitions (Anthropic Claude 3 Format) ---
// These definitions are sent to the AI so it knows what tools exist and what arguments they require.
const AI_TOOLS_DEFINITIONS = [
    {
        name: 'get_users_list',
        description:
            'Retrieves a list of active users/staff members currently registered in the database for the current tenant. Returns their name, email, and role. Use this when asked about who works here, who has access, or list employees.',
        input_schema: {
            type: 'object',
            properties: {}, // No input needed, it uses the injected context
            required: [],
        },
    },
    {
        name: 'get_hotel_stats',
        description:
            'Retrieves live statistical data about the hotel for the current tenant, specifically the total number of rooms, how many are currently occupied, and how many are available/clean. Use this when asked about occupancy, room availability, or hotel status.',
        input_schema: {
            type: 'object',
            properties: {}, // No input needed, context injected
            required: [],
        },
    },
];

// --- Tool Execution Logic ---
// These are the actual JavaScript functions executed when the AI requests a tool.
// They must accept the `tenantId` to ensure strict multi-tenant isolation.
const ToolExecutors = {
    get_users_list: async (args, context) => {
        try {
            const { tenantId, isSiloMode } = context;

            // In Silo mode, all users belong to the silo. In Hub mode, we must strictly filter by tenantId.
            // If we are in the Hub but no tenantId is provided, we default to the entire system (admin view).
            let query = { isActive: true };
            if (!isSiloMode && tenantId) {
                query = { 'tenants.tenant': tenantId, isActive: true };
            }

            const users = await User.find(query).select('name email role');

            if (!users || users.length === 0) {
                return 'No users found in the current context.';
            }

            const formatted = users
                .map((u) => `- ${u.name} (${u.email}) [Role: ${u.role}]`)
                .join('\n');
            return `Current User Roster:\n${formatted}`;
        } catch (error) {
            console.error('Tool Error [get_users_list]:', error);
            return `Error fetching users: ${error.message}`;
        }
    },

    get_hotel_stats: async (args, context) => {
        try {
            const { tenantId, isSiloMode } = context;

            // Because the AI gateway is at the root module level, it needs to access
            // the Hotel models. We dynamically require them to avoid circular dependencies
            let Room;
            try {
                Room = mongoose.model('Room');
            } catch (e) {
                Room = require('../modules/hotel/models/Room');
            }

            if (!tenantId && !isSiloMode) {
                return 'Error: Cannot fetch hotel occupancy data. You are operating in the Central Hub without a specific Tenant context selected. Please navigate to a specific hotel dashboard to use this tool.';
            }

            // In Silo mode, there is no tenantId foreign key because the DB is dedicated.
            const query = isSiloMode ? {} : { tenantId };

            const totalRooms = await Room.countDocuments(query);
            const occupiedRooms = await Room.countDocuments({ ...query, status: 'Occupied' });
            const availableRooms = await Room.countDocuments({ ...query, status: 'Available' });
            const cleaningRooms = await Room.countDocuments({ ...query, status: 'Cleaning' });
            const maintenanceRooms = await Room.countDocuments({ ...query, status: 'Maintenance' });

            return `Live Hotel Status:
- Total Rooms: ${totalRooms}
- Occupied: ${occupiedRooms}
- Available (Ready): ${availableRooms}
- Currently Cleaning: ${cleaningRooms}
- Under Maintenance: ${maintenanceRooms}
Occupancy Rate: ${totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%`;
        } catch (error) {
            console.error('Tool Error [get_hotel_stats]:', error);
            return `Error fetching hotel statistics. Is the Hotel module installed for this tenant? Details: ${error.message}`;
        }
    },
};

/**
 * Main dispatcher function to execute a requested tool
 */
async function executeTool(toolName, toolInput, context) {
    const executor = ToolExecutors[toolName];
    if (!executor) {
        return `Error: Tool '${toolName}' does not exist or is not registered.`;
    }

    try {
        console.log(`[AI_TOOL] Executing ${toolName} for tenant: ${context.tenantId || 'HUB'}`);
        const result = await executor(toolInput, context);
        return result;
    } catch (error) {
        return `Failed to execute tool ${toolName}: ${error.message}`;
    }
}

module.exports = {
    AI_TOOLS_DEFINITIONS,
    executeTool,
};

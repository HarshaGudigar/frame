const mongoose = require('mongoose');

const housekeepingTaskSchema = new mongoose.Schema(
    {
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
        staffName: { type: String },
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Delayed'],
            default: 'Pending',
        },
        type: {
            type: String,
            enum: ['Routine', 'Deep Clean', 'Maintenance', 'Turn Down'],
            default: 'Routine',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Emergency'],
            default: 'Medium',
        },
        notes: { type: String },
        dueDate: { type: Date },
        completedAt: { type: Date },
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return (
        connection.models.HousekeepingTask ||
        connection.model('HousekeepingTask', housekeepingTaskSchema)
    );
};

const mongoose = require('mongoose');

/**
 * Lead Schema
 * Tenant-scoped CRM entity.
 */
const leadSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, trim: true, lowercase: true },
        company: String,
        status: {
            type: String,
            enum: ['new', 'contacted', 'qualified', 'lost', 'won'],
            default: 'new',
        },
        value: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
);

/**
 * Factory function to create a Lead model on a specific connection.
 * @param {mongoose.Connection} connection
 * @returns {mongoose.Model}
 */
module.exports = (connection) => {
    return connection.model('Lead', leadSchema);
};

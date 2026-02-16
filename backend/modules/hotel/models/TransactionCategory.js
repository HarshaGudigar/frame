const mongoose = require('mongoose');

const transactionCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        type: { type: String, enum: ['Expense', 'Income'], required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return (
        connection.models.TransactionCategory ||
        connection.model('TransactionCategory', transactionCategorySchema)
    );
};

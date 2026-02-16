const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['Expense', 'Income'], required: true },
        referenceNumber: String,
        date: { type: Date, required: true },
        accountType: { type: String, enum: ['Petty Cash', 'Undeposited Funds'], required: true },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TransactionCategory',
            required: true,
        },
        amount: { type: Number, required: true },
        from: String,
        to: String,
        remarks: String,
    },
    { timestamps: true },
);

module.exports = (connection) => {
    return connection.models.Transaction || connection.model('Transaction', transactionSchema);
};

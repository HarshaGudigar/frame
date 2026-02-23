const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GlobalUser',
            required: true,
            index: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            default: null,
            index: true,
        },
        role: {
            type: String,
            enum: ['user', 'assistant', 'system', 'tool'],
            required: true,
        },
        content: {
            type: String, // Stringified JSON if it's a tool response or complex block, otherwise regular text
            required: true,
        },
        toolId: {
            type: String, // If this message originated from a tool execution
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

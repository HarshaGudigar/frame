const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { authMiddleware } = require('../middleware/authMiddleware');
const { errorResponse, successResponse } = require('../utils/responseWrapper');
const { generateSystemContext } = require('../services/contextInjector');
const { invokeClaudeMessages } = require('../services/bedrockService');

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     summary: Send a message to the AI Copilot
 *     security:
 *       - bearerAuth: []
 */
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return errorResponse(res, 'Message text is required', 400);
        }

        const userId = req.user._id;
        const tenantId = req.tenant?._id || null;

        // 1. Save the user's incoming message to the DB for history
        const userMsg = new ChatMessage({
            userId,
            tenantId,
            role: 'user',
            content: message,
        });
        await userMsg.save();

        // 2. Fetch recent conversation history (last 20 messages for this user/tenant context)
        const history = await ChatMessage.find({ userId, tenantId })
            .sort({ createdAt: -1 })
            .limit(20) // Keep context window reasonable
            .select('role content -_id'); // Bedrock only needs role and content

        // Reverse to get chronological order [oldest, ..., newest]
        const formattedHistory = history.reverse().map((msg) => ({
            role: msg.role === 'tool' ? 'user' : msg.role, // Simple mapping for now, actual tool schemas will come later
            content: msg.content,
        }));

        // 3. Generate the highly-restricted System Context Injector Prompt
        const systemPrompt = generateSystemContext(req);

        // 4. Send the request to AWS Bedrock
        const aiResponseText = await invokeClaudeMessages(formattedHistory, systemPrompt);

        // 5. Save the AI's response to the DB
        const assistantMsg = new ChatMessage({
            userId,
            tenantId,
            role: 'assistant',
            content: aiResponseText,
        });
        await assistantMsg.save();

        // 6. Return response to frontend
        return successResponse(res, {
            reply: aiResponseText,
        });
    } catch (err) {
        return errorResponse(res, 'Failed to process AI request', 500, err);
    }
});

/**
 * @openapi
 * /api/ai/chat/history:
 *   get:
 *     summary: Get user's conversation history
 *     security:
 *       - bearerAuth: []
 */
router.get('/chat/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const tenantId = req.tenant?._id || null;

        // Fetch last 50 messages, ordered newest to oldest, but send oldest to newest
        const history = await ChatMessage.find({ userId, tenantId })
            .sort({ createdAt: -1 })
            .limit(50);

        return successResponse(res, history.reverse());
    } catch (err) {
        return errorResponse(res, 'Failed to fetch chat history', 500, err);
    }
});

module.exports = router;

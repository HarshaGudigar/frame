const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { authMiddleware } = require('../middleware/authMiddleware');
const { errorResponse, successResponse } = require('../utils/responseWrapper');
const { generateSystemContext } = require('../services/contextInjector');
const { invokeClaudeMessages } = require('../services/bedrockService');
const { AI_TOOLS_DEFINITIONS, executeTool } = require('../services/aiTools');

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
            user: userId,
            role: 'user',
            content: message,
        });
        await userMsg.save();

        // 2. Fetch recent conversation history (last 20 messages for this user/tenant context)
        const history = await ChatMessage.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(20) // Keep context window reasonable
            .select('role content -_id'); // Bedrock only needs role and content

        // Reverse to get chronological order [oldest, ..., newest]
        const rawChronological = history.reverse();
        const formattedHistory = [];
        let lastRole = null;

        for (const msg of rawChronological) {
            const currentRole = msg.role === 'tool' ? 'user' : msg.role;

            // Claude strictly requires alternating user/assistant roles.
            // If we have sequential messages of the same role (e.g. from a past crash),
            // we must either skip the duplicate or merge them. We will merge them.
            if (currentRole === lastRole && formattedHistory.length > 0) {
                const prevMsg = formattedHistory[formattedHistory.length - 1];
                prevMsg.content += `\n\n[Follow-up]: ${msg.content}`;
            } else if (formattedHistory.length === 0 && currentRole !== 'user') {
                // AWS Bedrock (Claude 3) strictly requires the FIRST message in the history array to be 'user'
                // If our 20-message slice happens to start with an 'assistant' message, we must skip it.
                continue;
            } else {
                formattedHistory.push({
                    role: currentRole,
                    content: msg.content,
                });
                lastRole = currentRole;
            }
        }

        // 3. Generate the highly-restricted System Context Injector Prompt
        const systemPrompt = generateSystemContext(req);

        // 4. Recursive Tool Use Execution Loop
        let isFinalResponse = false;
        let aiFinalText = '';
        let loopCount = 0;
        const MAX_TOOL_LOOPS = 5; // Safety fallback

        while (!isFinalResponse && loopCount < MAX_TOOL_LOOPS) {
            loopCount++;

            // Invoke Bedrock with current history and tool definitions
            const bedrockPayload = await invokeClaudeMessages(
                formattedHistory,
                systemPrompt,
                AI_TOOLS_DEFINITIONS,
            );

            // Bedrock returns an array of content blocks. Some may be text, some may be tool_use.
            const contentBlocks = bedrockPayload.content || [];

            // Find if there's any tool_use requests in this turn
            const toolUseBlocks = contentBlocks.filter((b) => b.type === 'tool_use');
            const textBlock = contentBlocks.find((b) => b.type === 'text');

            if (bedrockPayload.stop_reason === 'tool_use' || toolUseBlocks.length > 0) {
                console.log(
                    `[AI Controller] AI requested tools: ${toolUseBlocks.map((t) => t.name).join(', ')}`,
                );

                // We must ALWAYS append the AI's exact request to the history so Claude knows what it asked for
                // Claude strictly requires alternating user/assistant roles, and tool_results must follow tool_uses.
                formattedHistory.push({
                    role: 'assistant',
                    content: bedrockPayload.content,
                });

                // We must format the results EXACTLY as Claude 3 expects:
                // A 'user' message containing an array of 'tool_result' objects
                const toolResultsContent = [];

                for (const tool of toolUseBlocks) {
                    const resultText = await executeTool(tool.name, tool.input, {
                        tenantId,
                        userId,
                        userRole: req.user.role,
                        isSiloMode: process.env.APP_TENANT_ID ? true : false,
                        tenantName: req.tenant ? req.tenant.name : 'Unknown',
                    });

                    toolResultsContent.push({
                        type: 'tool_result',
                        tool_use_id: tool.id,
                        content: resultText,
                    });
                }

                // Add the tool results to the conversation history as a 'user' turn
                formattedHistory.push({
                    role: 'user',
                    content: toolResultsContent,
                });

                // The loop iterates, sending this updated history back to Claude...
            } else {
                // Stop reason is end_turn (or max_tokens). We are done.
                isFinalResponse = true;
                aiFinalText = textBlock
                    ? textBlock.text
                    : 'Sorry, I could not generate a response.';
            }
        }

        if (loopCount >= MAX_TOOL_LOOPS) {
            aiFinalText =
                'I encountered an error or took too long analyzing that request. Please try asking in a different way.';
        }

        // 5. Save the final finalized AI's text response to the DB
        const assistantMsg = new ChatMessage({
            user: userId,
            role: 'assistant',
            content: aiFinalText,
        });
        await assistantMsg.save();

        // 6. Return response to frontend
        return successResponse(res, {
            reply: aiFinalText,
        });
    } catch (err) {
        console.error('[AI CHAT ERROR]', err);
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
        const history = await ChatMessage.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        return successResponse(res, history.reverse());
    } catch (err) {
        return errorResponse(res, 'Failed to fetch chat history', 500, err);
    }
});

/**
 * @openapi
 * /api/ai/chat/history:
 *   delete:
 *     summary: Clear user's conversation history
 *     security:
 *       - bearerAuth: []
 */
router.delete('/chat/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const tenantId = req.tenant?._id || null;

        await ChatMessage.deleteMany({ user: userId });

        return successResponse(res, { message: 'Chat history cleared.' });
    } catch (err) {
        return errorResponse(res, 'Failed to clear chat history', 500, err);
    }
});

module.exports = router;

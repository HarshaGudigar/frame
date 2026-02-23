require('dotenv').config();
const { invokeClaudeMessages } = require('./services/bedrockService');
const { AI_TOOLS_DEFINITIONS } = require('./services/aiTools');

async function test() {
    try {
        console.log('SENDING MOCK TOOL RESULT TO BEDROCK...');
        const history = [
            { role: 'user', content: 'How many rooms?' },
            {
                role: 'assistant',
                content: [
                    { type: 'tool_use', id: 'toolu_123', name: 'get_hotel_stats', input: {} },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: 'toolu_123',
                        content: 'There are 50 rooms total, 10 occupied.',
                    },
                ],
            },
        ];

        const res = await invokeClaudeMessages(history, 'You are an AI.', AI_TOOLS_DEFINITIONS);
        console.log('RESPONSE SUCCESS:', JSON.stringify(res, null, 2));
    } catch (e) {
        console.error('TEST FAILED ERROR:', e.message);
        if (e.name) console.error('Error Name:', e.name);
        if (e.$metadata) console.error('Metadata:', e.$metadata);
    }
}

test();

require('dotenv').config();
const { invokeClaudeMessages } = require('./services/bedrockService');
const { AI_TOOLS_DEFINITIONS } = require('./services/aiTools');

async function test() {
    try {
        console.log('SENDING REQUEST TO BEDROCK...');
        const res = await invokeClaudeMessages(
            [{ role: 'user', content: 'How many rooms are occupied?' }],
            'You are an AI.',
            AI_TOOLS_DEFINITIONS,
        );
        console.log('RESPONSE SUCCESS:', JSON.stringify(res, null, 2));
    } catch (e) {
        console.error('TEST FAILED ERROR:', e.message);
        if (e.name) console.error('Error Name:', e.name);
        if (e.$metadata) console.error('Metadata:', e.$metadata);
    }
}

test();

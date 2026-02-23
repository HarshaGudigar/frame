const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const logger = require('../utils/logger');

// Initialize the Bedrock client globally
// Credentials should be picked up automatically from process.env.AWS_ACCESS_KEY_ID etc.
let bedrockClient;

function getClient() {
    if (!bedrockClient) {
        bedrockClient = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    return bedrockClient;
}

/**
 * Sends a conversation to Claude 3 via AWS Bedrock's Messages API
 * @param {Array} formattedMessages - Array of {role: 'user'|'assistant', content: string}
 * @param {String} systemPrompt - The injected system context
 * @param {String} modelId - The Bedrock Model ID (defaults to ENV overriding to Haiku)
 */
async function invokeClaudeMessages(
    formattedMessages,
    systemPrompt,
    modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
) {
    try {
        const payload = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1500,
            system: systemPrompt,
            messages: formattedMessages,
            temperature: 0.2, // Low temperature for deterministic/tool-calling tasks
        };

        const command = new InvokeModelCommand({
            modelId: modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(payload),
        });

        const client = getClient();
        const response = await client.send(command);

        // Bedrock response body is a Uint8Array, we must parse it
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        if (responseBody.content && responseBody.content.length > 0) {
            return responseBody.content[0].text;
        }

        return 'No response generated.';
    } catch (error) {
        logger.error({ err: error, modelId }, 'Failed to invoke AWS Bedrock');
        throw error;
    }
}

module.exports = {
    invokeClaudeMessages,
};

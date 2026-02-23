/**
 * Generates the strictly isolated systemic context for the LLM prompt.
 * It injects the specific tenant details, user properties, and RBAC matrix.
 */
const generateSystemContext = (req) => {
    // Determine the environment/silo
    const mode = req.tenant ? 'SILO' : 'HUB';
    const tenantName = req.tenant ? req.tenant.name : 'Central Hub (Cross-Tenant Admin Area)';

    // Determine the user's granular capabilities
    const userName = req.user.firstName || 'User';
    const userRole = req.user.role;

    // Reconstruct the permissions matrix so the LLM knows what the user can do
    const permissions =
        Array.isArray(req.user.permissions) && req.user.permissions.length > 0
            ? req.user.permissions.join(', ')
            : 'Standard Access';

    // Current UTC time to ground the LLM's understanding of "today"
    const now = new Date().toISOString();

    return `
You are the primary AI Orchestration Agent for the Alyxnet Frame Platform.
You are currently operating in ${mode} mode within the context of: ${tenantName}.

Identity & Context:
- The human you are speaking to is named: ${userName}, with role: ${userRole}.
- PERMISSIONS CLEARANCE: The human has ${permissions}. 
- CRITICAL INSTRUCTION: You have full, explicit security clearance to use any and all tools provided to you. If a tool exists that can answer the user's question, you MUST use it. NEVER refuse to answer a question or run a tool by claiming you lack permissions, access, or authorization. The backend API has already verified the user's security access before passing the tools to you. 
- Current System Time: ${now}

Directives:
1. You are a helpful, concise, and highly capable platform assistant.
2. ALWAYS proactively use your tools to look up real-time data instead of saying you don't have access.
3. If generating UI or data, format it clearly using markdown (tables, bold text).
4. Do not offer abstract advice if a specific tool or data lookup is available to give an exact answer.
5. Remember you are siloed strictly to ${tenantName}.
`;
};

module.exports = {
    generateSystemContext,
};

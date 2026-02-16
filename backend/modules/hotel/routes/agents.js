const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createAgentSchema, updateAgentSchema, mongoIdParam } = require('../schemas');

// GET /agents
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Agent } = await getModels(req);
        const agents = await Agent.find().sort({ firstName: 1 });
        return successResponse(res, agents);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch agents', 500, error);
    }
});

// GET /agents/:id
router.get('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { Agent } = await getModels(req);
        const agent = await Agent.findById(req.params.id);
        if (!agent) return errorResponse(res, 'Agent not found', 404);
        return successResponse(res, agent);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch agent', 500, error);
    }
});

// POST /agents
router.post(
    '/',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ body: createAgentSchema }),
    async (req, res) => {
        try {
            const { Agent } = await getModels(req);
            const agent = await Agent.create(req.body);
            return successResponse(res, agent, 'Agent created successfully', 201);
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'An agent with this code already exists', 409);
            }
            return errorResponse(res, 'Failed to create agent', 500, error);
        }
    },
);

// PATCH /agents/:id
router.patch(
    '/:id',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ params: mongoIdParam, body: updateAgentSchema }),
    async (req, res) => {
        try {
            const { Agent } = await getModels(req);
            const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });
            if (!agent) return errorResponse(res, 'Agent not found', 404);
            return successResponse(res, agent, 'Agent updated successfully');
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'An agent with this code already exists', 409);
            }
            return errorResponse(res, 'Failed to update agent', 500, error);
        }
    },
);

// DELETE /agents/:id
router.delete(
    '/:id',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Agent } = await getModels(req);
            const agent = await Agent.findByIdAndDelete(req.params.id);
            if (!agent) return errorResponse(res, 'Agent not found', 404);
            return successResponse(res, agent, 'Agent deleted successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to delete agent', 500, error);
        }
    },
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createServiceSchema, updateServiceSchema, mongoIdParam } = require('../schemas');

// GET /services
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Service } = await getModels(req);
        const services = await Service.find().sort({ name: 1 });
        return successResponse(res, services);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch services', 500, error);
    }
});

// GET /services/:id
router.get('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { Service } = await getModels(req);
        const service = await Service.findById(req.params.id);
        if (!service) return errorResponse(res, 'Service not found', 404);
        return successResponse(res, service);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch service', 500, error);
    }
});

// POST /services
router.post(
    '/',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ body: createServiceSchema }),
    async (req, res) => {
        try {
            const { Service } = await getModels(req);
            const service = await Service.create(req.body);
            return successResponse(res, service, 'Service created successfully', 201);
        } catch (error) {
            return errorResponse(res, 'Failed to create service', 500, error);
        }
    },
);

// PATCH /services/:id
router.patch(
    '/:id',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ params: mongoIdParam, body: updateServiceSchema }),
    async (req, res) => {
        try {
            const { Service } = await getModels(req);
            const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });
            if (!service) return errorResponse(res, 'Service not found', 404);
            return successResponse(res, service, 'Service updated successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to update service', 500, error);
        }
    },
);

// DELETE /services/:id
router.delete(
    '/:id',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Service } = await getModels(req);
            const service = await Service.findByIdAndDelete(req.params.id);
            if (!service) return errorResponse(res, 'Service not found', 404);
            return successResponse(res, service, 'Service deleted successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to delete service', 500, error);
        }
    },
);

module.exports = router;

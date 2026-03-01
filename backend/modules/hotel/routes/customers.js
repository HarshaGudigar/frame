const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createCustomerSchema, updateCustomerSchema, mongoIdParam } = require('../schemas');

// GET /customers
router.get('/', authMiddleware, authorize(['superuser', 'admin', 'agent']), async (req, res) => {
    try {
        const { Customer } = await getModels(req);
        const customers = await Customer.find().sort({ createdAt: -1 });
        return successResponse(res, customers);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch customers', 500, error);
    }
});

// GET /customers/:id
router.get(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin', 'agent']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Customer } = await getModels(req);
            const customer = await Customer.findById(req.params.id);
            if (!customer) return errorResponse(res, 'Customer not found', 404);
            return successResponse(res, customer);
        } catch (error) {
            return errorResponse(res, 'Failed to fetch customer', 500, error);
        }
    },
);

// POST /customers
router.post(
    '/',
    authMiddleware,
    authorize(['superuser', 'admin', 'agent']),
    validate({ body: createCustomerSchema }),
    async (req, res) => {
        try {
            const { Customer } = await getModels(req);
            const customer = await Customer.create(req.body);
            return successResponse(res, customer, 'Customer registered successfully', 201);
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'A customer with this email already exists', 409);
            }
            return errorResponse(res, 'Failed to register customer', 500, error);
        }
    },
);

// PATCH /customers/:id
router.patch(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin', 'agent']),
    validate({ params: mongoIdParam, body: updateCustomerSchema }),
    async (req, res) => {
        try {
            const { Customer } = await getModels(req);
            const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });
            if (!customer) return errorResponse(res, 'Customer not found', 404);
            return successResponse(res, customer, 'Customer updated successfully');
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'A customer with this email already exists', 409);
            }
            return errorResponse(res, 'Failed to update customer', 500, error);
        }
    },
);

module.exports = router;

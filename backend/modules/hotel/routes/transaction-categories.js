const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const {
    createTransactionCategorySchema,
    updateTransactionCategorySchema,
    mongoIdParam,
} = require('../schemas');

// GET /transaction-categories
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { TransactionCategory } = await getModels(req);
        const categories = await TransactionCategory.find().sort({ name: 1 });
        return successResponse(res, categories);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch transaction categories', 500, error);
    }
});

// GET /transaction-categories/:id
router.get('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { TransactionCategory } = await getModels(req);
        const category = await TransactionCategory.findById(req.params.id);
        if (!category) return errorResponse(res, 'Transaction category not found', 404);
        return successResponse(res, category);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch transaction category', 500, error);
    }
});

// POST /transaction-categories
router.post(
    '/',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ body: createTransactionCategorySchema }),
    async (req, res) => {
        try {
            const { TransactionCategory } = await getModels(req);
            const category = await TransactionCategory.create(req.body);
            return successResponse(res, category, 'Transaction category created successfully', 201);
        } catch (error) {
            return errorResponse(res, 'Failed to create transaction category', 500, error);
        }
    },
);

// PATCH /transaction-categories/:id
router.patch(
    '/:id',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ params: mongoIdParam, body: updateTransactionCategorySchema }),
    async (req, res) => {
        try {
            const { TransactionCategory } = await getModels(req);
            const category = await TransactionCategory.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });
            if (!category) return errorResponse(res, 'Transaction category not found', 404);
            return successResponse(res, category, 'Transaction category updated successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to update transaction category', 500, error);
        }
    },
);

// DELETE /transaction-categories/:id
router.delete(
    '/:id',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { TransactionCategory } = await getModels(req);
            const category = await TransactionCategory.findByIdAndDelete(req.params.id);
            if (!category) return errorResponse(res, 'Transaction category not found', 404);
            return successResponse(res, category, 'Transaction category deleted successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to delete transaction category', 500, error);
        }
    },
);

module.exports = router;

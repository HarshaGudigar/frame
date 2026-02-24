const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createTransactionSchema, updateTransactionSchema, mongoIdParam } = require('../schemas');

// GET /transactions — supports filtering by type and date range
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Transaction } = await getModels(req);
        const filter = {};

        if (req.query.type && ['Expense', 'Income'].includes(req.query.type)) {
            filter.type = req.query.type;
        }
        if (req.query.from || req.query.to) {
            filter.date = {};
            if (req.query.from) filter.date.$gte = new Date(req.query.from);
            if (req.query.to) filter.date.$lte = new Date(req.query.to);
        }

        const transactions = await Transaction.find(filter).populate('category').sort({ date: -1 });
        return successResponse(res, transactions);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch transactions', 500, error);
    }
});

// GET /transactions/:id
router.get('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { Transaction } = await getModels(req);
        const transaction = await Transaction.findById(req.params.id).populate('category');
        if (!transaction) return errorResponse(res, 'Transaction not found', 404);
        return successResponse(res, transaction);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch transaction', 500, error);
    }
});

// POST /transactions
router.post('/', authMiddleware, validate({ body: createTransactionSchema }), async (req, res) => {
    try {
        const { Transaction, TransactionCategory } = await getModels(req);

        // Verify category exists
        const category = await TransactionCategory.findById(req.body.categoryId);
        if (!category) return errorResponse(res, 'Transaction category not found', 404);

        const transaction = await Transaction.create({
            type: req.body.type,
            referenceNumber: req.body.referenceNumber,
            date: req.body.date,
            accountType: req.body.accountType,
            category: req.body.categoryId,
            amount: req.body.amount,
            from: req.body.from,
            to: req.body.to,
            remarks: req.body.remarks,
        });

        const populated = await Transaction.findById(transaction._id).populate('category');
        return successResponse(res, populated, 'Transaction created successfully', 201);
    } catch (error) {
        return errorResponse(res, 'Failed to create transaction', 500, error);
    }
});

// PATCH /transactions/:id
router.patch(
    '/:id',
    authMiddleware,
    validate({ params: mongoIdParam, body: updateTransactionSchema }),
    async (req, res) => {
        try {
            const { Transaction, TransactionCategory } = await getModels(req);

            if (req.body.categoryId) {
                const category = await TransactionCategory.findById(req.body.categoryId);
                if (!category) return errorResponse(res, 'Transaction category not found', 404);
                req.body.category = req.body.categoryId;
                delete req.body.categoryId;
            }

            const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            }).populate('category');
            if (!transaction) return errorResponse(res, 'Transaction not found', 404);
            return successResponse(res, transaction, 'Transaction updated successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to update transaction', 500, error);
        }
    },
);

// DELETE /transactions/:id — admin/owner only
router.delete(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Transaction } = await getModels(req);
            const transaction = await Transaction.findByIdAndDelete(req.params.id);
            if (!transaction) return errorResponse(res, 'Transaction not found', 404);
            return successResponse(res, transaction, 'Transaction deleted successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to delete transaction', 500, error);
        }
    },
);

module.exports = router;

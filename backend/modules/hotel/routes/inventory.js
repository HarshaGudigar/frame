const express = require('express');
const router = express.Router();
const getModels = require('../getModels');
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const {
    createInventoryItemSchema,
    updateInventoryItemSchema,
    mongoIdParam,
} = require('../schemas');

/**
 * @route   POST /api/hotel/inventory
 * @desc    Add a new inventory item
 */
router.post(
    '/',
    authMiddleware,
    authorize(['superuser', 'admin', 'agent']),
    validate({ body: createInventoryItemSchema }),
    async (req, res) => {
        try {
            const { InventoryItem } = await getModels(req);
            const item = await InventoryItem.create(req.body);
            return successResponse(res, item, 'Inventory item added', 201);
        } catch (error) {
            console.error(error);
            return errorResponse(res, 'Failed to add inventory item', 500, error);
        }
    },
);

/**
 * @route   GET /api/hotel/inventory
 * @desc    List all inventory items
 */
router.get('/', authMiddleware, authorize(['superuser', 'admin', 'agent']), async (req, res) => {
    try {
        const { InventoryItem } = await getModels(req);
        const { category, lowStock } = req.query;

        const filters = {};
        if (category) filters.category = category;

        const items = await InventoryItem.find(filters).sort({ name: 1 });

        let result = items;
        if (lowStock === 'true') {
            result = items.filter((item) => item.quantity <= item.minThreshold);
        }

        return successResponse(res, result);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Failed to fetch inventory', 500, error);
    }
});

/**
 * @route   PATCH /api/hotel/inventory/:id
 * @desc    Update inventory item details or quantity
 */
router.patch(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin', 'agent']),
    validate({ params: mongoIdParam, body: updateInventoryItemSchema }),
    async (req, res) => {
        try {
            const { InventoryItem } = await getModels(req);

            const updateData = req.body;
            if (updateData.quantity !== undefined) {
                updateData.lastRestockedAt = new Date();
            }

            const item = await InventoryItem.findByIdAndUpdate(req.params.id, updateData, {
                new: true,
                runValidators: true,
            });

            if (!item) return errorResponse(res, 'Item not found', 404);
            return successResponse(res, item, 'Inventory item updated');
        } catch (error) {
            console.error(error);
            return errorResponse(res, 'Failed to update inventory item', 500, error);
        }
    },
);

/**
 * @route   DELETE /api/hotel/inventory/:id
 */
router.delete(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { InventoryItem } = await getModels(req);
            const item = await InventoryItem.findByIdAndDelete(req.params.id);
            if (!item) return errorResponse(res, 'Item not found', 404);
            return successResponse(res, { message: 'Item deleted' });
        } catch (error) {
            return errorResponse(res, 'Failed to delete item', 500, error);
        }
    },
);

module.exports = router;

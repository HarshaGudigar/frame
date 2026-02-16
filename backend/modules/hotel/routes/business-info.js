const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { businessInfoSchema } = require('../schemas');

// GET /business-info — get the singleton business info
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { BusinessInfo } = await getModels(req);
        const info = await BusinessInfo.findOne();
        return successResponse(res, info);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch business info', 500, error);
    }
});

// PUT /business-info — upsert business info
router.put(
    '/',
    authMiddleware,
    authorize(['owner', 'admin']),
    validate({ body: businessInfoSchema }),
    async (req, res) => {
        try {
            const { BusinessInfo } = await getModels(req);
            const info = await BusinessInfo.findOneAndUpdate({}, req.body, {
                new: true,
                upsert: true,
                runValidators: true,
            });
            return successResponse(res, info, 'Business info saved successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to save business info', 500, error);
        }
    },
);

module.exports = router;

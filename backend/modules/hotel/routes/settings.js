const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createSettingsSchema, updateSettingsSchema, settingsTypeParam } = require('../schemas');

// GET /settings — list all settings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Settings } = await getModels(req);
        const settings = await Settings.find().sort({ type: 1 });
        return successResponse(res, settings);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch settings', 500, error);
    }
});

const { DEFAULT_HOTEL_SETTINGS } = require('../constants');

// GET /settings/:type — get single settings by type
router.get('/:type', authMiddleware, validate({ params: settingsTypeParam }), async (req, res) => {
    try {
        const { Settings } = await getModels(req);
        const settings = await Settings.findOne({ type: req.params.type });

        if (!settings) {
            // Return defaults if available to avoid 404 noise in console
            const defaults = DEFAULT_HOTEL_SETTINGS[req.params.type];
            if (defaults) {
                return successResponse(res, defaults);
            }
            return errorResponse(res, 'Settings not found', 404);
        }

        return successResponse(res, settings);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch settings', 500, error);
    }
});

// POST /settings — create new settings type
router.post(
    '/',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ body: createSettingsSchema }),
    async (req, res) => {
        try {
            const { Settings } = await getModels(req);
            const settings = await Settings.create(req.body);
            return successResponse(res, settings, 'Settings created successfully', 201);
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'A settings type with this name already exists', 409);
            }
            return errorResponse(res, 'Failed to create settings', 500, error);
        }
    },
);

// PATCH /settings/:type — update options for a settings type
router.patch(
    '/:type',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ params: settingsTypeParam, body: updateSettingsSchema }),
    async (req, res) => {
        try {
            const { Settings } = await getModels(req);
            const settings = await Settings.findOneAndUpdate(
                { type: req.params.type },
                { options: req.body.options },
                { new: true, runValidators: true },
            );
            if (!settings) return errorResponse(res, 'Settings not found', 404);
            return successResponse(res, settings, 'Settings updated successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to update settings', 500, error);
        }
    },
);

// DELETE /settings/:type
router.delete(
    '/:type',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ params: settingsTypeParam }),
    async (req, res) => {
        try {
            const { Settings } = await getModels(req);
            const settings = await Settings.findOneAndDelete({ type: req.params.type });
            if (!settings) return errorResponse(res, 'Settings not found', 404);
            return successResponse(res, settings, 'Settings deleted successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to delete settings', 500, error);
        }
    },
);

module.exports = router;

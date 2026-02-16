const express = require('express');
const router = express.Router();
const getLeadModel = require('./models/Lead');
const { successResponse, errorResponse } = require('../../utils/responseWrapper');

/**
 * Get all leads for the current tenant.
 */
router.get('/leads', async (req, res) => {
    try {
        const Lead = getLeadModel(req.db);
        const leads = await Lead.find().sort({ createdAt: -1 });
        return successResponse(res, leads, 'Leads retrieved');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch leads', 500, err);
    }
});

/**
 * Create a new lead.
 */
router.post('/leads', async (req, res) => {
    try {
        const Lead = getLeadModel(req.db);
        const lead = await Lead.create(req.body);
        return successResponse(res, lead, 'Lead created', 201);
    } catch (err) {
        return errorResponse(res, 'Failed to create lead', 500, err);
    }
});

module.exports = router;

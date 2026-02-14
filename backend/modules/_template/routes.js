/**
 * Template Module Routes
 * 
 * All routes here are automatically mounted under /api/m/{slug}/
 * For example, if slug = 'accounting', these become /api/m/accounting/...
 * 
 * The tenant context and module access have already been verified by the
 * gateway middleware before reaching these routes.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/authMiddleware');
const { successResponse } = require('../../utils/responseWrapper');

// Example: GET /api/m/{slug}/
router.get('/', authMiddleware, (req, res) => {
    return successResponse(res, {
        module: req.module.slug,
        tenant: req.tenant.slug,
    }, 'Module is active');
});

module.exports = router;

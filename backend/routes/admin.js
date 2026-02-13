const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Async route wrapper — catches errors and forwards to Express error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Heartbeat (Machine-to-Machine, API Key auth) ────────────────────────────

const HEARTBEAT_SECRET = process.env.HEARTBEAT_SECRET || 'heartbeat-dev-key';

router.post('/heartbeat', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== HEARTBEAT_SECRET) {
        return errorResponse(res, 'Invalid or missing API key', 401);
    }
    next();
}, asyncHandler(async (req, res) => {
    const { tenantId, metrics } = req.body;

    if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
    }

    const tenant = await Tenant.findOne({ slug: tenantId });
    if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
    }

    tenant.status = 'online';
    tenant.lastSeen = new Date();
    tenant.metrics = {
        cpu: metrics?.cpu || 0,
        ram: metrics?.ram || 0,
        uptime: metrics?.uptime || 0,
        version: metrics?.version || 'unknown'
    };

    await tenant.save();

    return successResponse(res, {
        subscribedModules: tenant.subscribedModules,
        status: tenant.status
    }, 'Heartbeat processed');
}));

// ─── Tenant CRUD (JWT auth required) ──────────────────────────────────────────

/**
 * GET /api/admin/tenants — List all tenants
 */
router.get('/tenants', authMiddleware, asyncHandler(async (req, res) => {
    const tenants = await Tenant.find().sort({ lastSeen: -1 });
    return successResponse(res, tenants, 'Tenants retrieved');
}));

/**
 * GET /api/admin/tenants/:id — Get single tenant
 */
router.get('/tenants/:id', authMiddleware, asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
    }
    return successResponse(res, tenant, 'Tenant retrieved');
}));

/**
 * POST /api/admin/tenants — Create a new tenant
 */
router.post('/tenants', authMiddleware, asyncHandler(async (req, res) => {
    const { name, slug, vmIpAddress, subscribedModules } = req.body;

    // Validation
    if (!name || !slug) {
        return errorResponse(res, 'Name and slug are required', 400);
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
        return errorResponse(res, 'Slug must be lowercase letters, numbers, and hyphens only', 400);
    }

    // Check for duplicate slug
    const existing = await Tenant.findOne({ slug });
    if (existing) {
        return errorResponse(res, `Tenant with slug "${slug}" already exists`, 409);
    }

    const tenant = await Tenant.create({
        name,
        slug,
        vmIpAddress: vmIpAddress || '',
        subscribedModules: subscribedModules || [],
        status: 'offline',
        deploymentStatus: 'pending',
    });

    return successResponse(res, tenant, 'Tenant created', 201);
}));

/**
 * PUT /api/admin/tenants/:id — Update a tenant
 */
router.put('/tenants/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { name, vmIpAddress, subscribedModules, isActive } = req.body;

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
    }

    // Update only provided fields
    if (name !== undefined) tenant.name = name;
    if (vmIpAddress !== undefined) tenant.vmIpAddress = vmIpAddress;
    if (subscribedModules !== undefined) tenant.subscribedModules = subscribedModules;
    if (isActive !== undefined) tenant.isActive = isActive;

    await tenant.save();

    return successResponse(res, tenant, 'Tenant updated');
}));

/**
 * DELETE /api/admin/tenants/:id — Delete a tenant
 */
router.delete('/tenants/:id', authMiddleware, asyncHandler(async (req, res) => {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
    }

    return successResponse(res, { id: req.params.id }, 'Tenant deleted');
}));

module.exports = router;

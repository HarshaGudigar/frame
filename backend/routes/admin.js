const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { HEARTBEAT_SECRET } = require('../config');
const { validate } = require('../middleware/validate');
const { z } = require('zod');
const logger = require('../utils/logger');
const GlobalUser = require('../models/GlobalUser');
const Metric = require('../models/Metric');
const {
    createTenantSchema,
    updateTenantSchema,
    heartbeatSchema,
    mongoIdParam,
    updateUserRoleSchema,
} = require('../schemas/admin');

// Async route wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Heartbeat (Machine-to-Machine) ──────────────────────────────────────────

/**
 * @openapi
 * /api/admin/heartbeat:
 *   post:
 *     tags: [Admin]
 *     summary: Silo heartbeat
 *     description: Machine-to-machine endpoint for tenant silo instances to report their status and metrics.
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId]
 *             properties:
 *               tenantId: { type: string, example: "acme-corp" }
 *               metrics:
 *                 type: object
 *                 properties:
 *                   cpu: { type: number, example: 45.2 }
 *                   ram: { type: number, example: 68.1 }
 *                   uptime: { type: number, example: 86400 }
 *                   version: { type: string, example: "1.0.0" }
 *     responses:
 *       200:
 *         description: Heartbeat processed
 *       401:
 *         description: Invalid or missing API key
 *       404:
 *         description: Tenant not found
 */
router.post(
    '/heartbeat',
    (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== HEARTBEAT_SECRET) {
            return errorResponse(res, 'Invalid or missing API key', 401);
        }
        next();
    },
    validate({ body: heartbeatSchema }),
    asyncHandler(async (req, res) => {
        const { tenantId, metrics } = req.body;

        const tenant = await Tenant.findOne({ slug: tenantId });
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        // Save history
        await Metric.create({
            tenantId,
            metrics,
        });

        // Update latest status in Tenant document
        tenant.lastHeartbeat = new Date();
        if (metrics) {
            tenant.metrics = {
                ...tenant.metrics,
                ...metrics,
            };
        }
        tenant.status = 'online';
        await tenant.save();

        res.json({ success: true, message: 'Heartbeat processed' });
    }),
);

// ─── Tenant CRUD ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/admin/tenants:
 *   get:
 *     tags: [Admin]
 *     summary: List all tenants
 *     description: Returns all tenants sorted by last seen (most recent first).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tenants
 *       401:
 *         description: Authentication required
 *   post:
 *     tags: [Admin]
 *     summary: Create a new tenant
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string, example: "Acme Corporation" }
 *               slug: { type: string, pattern: "^[a-z0-9-]+$", example: "acme-corp" }
 *               vmIpAddress: { type: string, example: "10.0.1.5" }
 *               subscribedModules: { type: array, items: { type: string }, example: ["accounting", "crm"] }
 *     responses:
 *       201:
 *         description: Tenant created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Slug already exists
 */
router.get(
    '/tenants',
    authMiddleware,
    requireRole('admin', 'staff', 'owner'),
    asyncHandler(async (req, res) => {
        const tenants = await Tenant.find().sort({ lastSeen: -1 });
        return successResponse(res, tenants, 'Tenants retrieved');
    }),
);

router.post(
    '/tenants',
    authMiddleware,
    requireRole('admin', 'owner'),
    validate({ body: createTenantSchema }),
    asyncHandler(async (req, res) => {
        const { name, slug, vmIpAddress, subscribedModules } = req.body;

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
    }),
);

/**
 * @openapi
 * /api/admin/tenants/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a tenant by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant details
 *       404:
 *         description: Tenant not found
 *   put:
 *     tags: [Admin]
 *     summary: Update a tenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               vmIpAddress: { type: string }
 *               subscribedModules: { type: array, items: { type: string } }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Tenant updated
 *       404:
 *         description: Tenant not found
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a tenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant deleted
 *       404:
 *         description: Tenant not found
 */
router.get(
    '/tenants/:id',
    authMiddleware,
    requireRole('admin', 'staff', 'owner'),
    validate({ params: mongoIdParam }),
    asyncHandler(async (req, res) => {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }
        return successResponse(res, tenant, 'Tenant retrieved');
    }),
);

router.put(
    '/tenants/:id',
    authMiddleware,
    requireRole('admin', 'owner'),
    validate({ params: mongoIdParam, body: updateTenantSchema }),
    asyncHandler(async (req, res) => {
        const { name, vmIpAddress, subscribedModules, isActive } = req.body;

        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        if (name !== undefined) tenant.name = name;
        if (vmIpAddress !== undefined) tenant.vmIpAddress = vmIpAddress;
        if (subscribedModules !== undefined) tenant.subscribedModules = subscribedModules;
        if (isActive !== undefined) tenant.isActive = isActive;

        await tenant.save();

        return successResponse(res, tenant, 'Tenant updated');
    }),
);

router.delete(
    '/tenants/:id',
    authMiddleware,
    requireRole('admin', 'owner'),
    validate({ params: mongoIdParam }),
    asyncHandler(async (req, res) => {
        const tenant = await Tenant.findByIdAndDelete(req.params.id);
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        return successResponse(res, { id: req.params.id }, 'Tenant deleted');
    }),
);

// ─── User Management Routes ───────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users (Global Owner only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', authMiddleware, requireRole('owner'), async (req, res) => {
    try {
        const users = await GlobalUser.find({}, 'firstName lastName email role isActive createdAt');
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch users');
        errorResponse(res, 'Failed to fetch users', 500);
    }
});

/**
 * @swagger
 * /api/admin/users/invite:
 *   post:
 *     summary: Invite a new user
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, role]
 *             properties:
 *               email: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [admin, staff, user] }
 *     responses:
 *       201:
 *         description: User invited
 */
router.post(
    '/users/invite',
    authMiddleware,
    requireRole('owner', 'admin'),
    validate({
        body: z.object({
            email: z.string().email(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            role: z.enum(['admin', 'staff', 'user']),
        }),
    }),
    async (req, res) => {
        try {
            const { email, firstName, lastName, role } = req.body;

            const existingUser = await GlobalUser.findOne({ email });
            if (existingUser) {
                return errorResponse(res, 'User already exists', 409);
            }

            // In a real app, we'd generate a token and send an email.
            // For now, we set a temporary password.
            const tempPassword = 'Welcome123!';

            const newUser = await GlobalUser.create({
                email,
                firstName,
                lastName,
                role,
                password: tempPassword,
                isActive: true,
            });

            logger.info({ adminId: req.user.id, newUserId: newUser.id }, 'User invited');

            res.status(201).json({
                success: true,
                message: 'User invited successfully',
                data: {
                    user: {
                        id: newUser._id,
                        email: newUser.email,
                        role: newUser.role,
                    },
                    tempPassword, // Return this only in dev/MVP
                },
            });
        } catch (error) {
            logger.error({ err: error }, 'Failed to invite user');
            errorResponse(res, 'Failed to invite user', 500);
        }
    },
);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Deactivate a user
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.delete(
    '/users/:id',
    authMiddleware,
    requireRole('owner'),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (id === req.user.id) {
                return errorResponse(res, 'Cannot deactivate yourself', 400);
            }

            const user = await GlobalUser.findByIdAndUpdate(id, { isActive: false }, { new: true });

            if (!user) {
                return errorResponse(res, 'User not found', 404);
            }

            logger.info({ adminId: req.user.id, targetUserId: id }, 'User deactivated');

            res.json({ success: true, message: 'User deactivated' });
        } catch (error) {
            logger.error({ err: error }, 'Failed to deactivate user');
            errorResponse(res, 'Failed to deactivate user', 500);
        }
    },
);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update a user's role
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [owner, admin, staff, user] }
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
    '/users/:id/role',
    authMiddleware,
    requireRole('owner'),
    validate({ params: mongoIdParam, body: updateUserRoleSchema }),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (id === req.user.id) {
                return errorResponse(res, 'Cannot change your own role', 400);
            }

            const user = await GlobalUser.findByIdAndUpdate(id, { role }, { new: true });

            if (!user) {
                return errorResponse(res, 'User not found', 404);
            }

            logger.info(
                { adminId: req.user.id, targetUserId: id, newRole: role },
                'User role updated',
            );

            res.json({ success: true, message: 'Role updated successfully', data: user });
        } catch (error) {
            logger.error({ err: error }, 'Failed to update user role');
            errorResponse(res, 'Failed to update user role', 500);
        }
    },
);

// ─── Analytics & Fleet Stats ───────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/metrics/{tenantId}:
 *   get:
 *     summary: Get historical metrics for a tenant
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Historical metrics
 */
router.get(
    '/metrics/:id',
    authMiddleware,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        const { id } = req.params; // slug or id

        // Find last 24 entries (approximately 24h if pinged hourly)
        // In a real app, we'd filter by time range
        const history = await Metric.find({ tenantId: id }).sort({ timestamp: -1 }).limit(24);

        res.json({
            success: true,
            data: history.reverse(), // Sort chronologically for charts
        });
    }),
);

/**
 * @swagger
 * /api/admin/fleet/stats:
 *   get:
 *     summary: Get aggregate fleet statistics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Fleet statistics
 */
router.get(
    '/fleet/stats',
    authMiddleware,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        const totalTenants = await Tenant.countDocuments();
        const onlineTenants = await Tenant.countDocuments({ status: 'online' });
        const offlineTenants = await Tenant.countDocuments({ status: 'offline' });

        // Calculate average metrics
        const aggs = await Tenant.aggregate([
            {
                $group: {
                    _id: null,
                    avgCpu: { $avg: '$metrics.cpu' },
                    avgRam: { $avg: '$metrics.ram' },
                },
            },
        ]);

        const stats = {
            total: totalTenants,
            online: onlineTenants,
            offline: offlineTenants,
            averages: aggs[0] || { avgCpu: 0, avgRam: 0 },
        };

        res.json({ success: true, data: stats });
    }),
);

module.exports = router;

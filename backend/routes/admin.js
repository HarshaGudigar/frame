const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const multer = require('multer');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { logAction } = require('../middleware/auditLogger');
const socketService = require('../utils/socket');
const {
    authMiddleware,
    requireRole,
    requireVerifiedEmail,
} = require('../middleware/authMiddleware');
const config = require('../config');
const { HEARTBEAT_SECRET } = config;
const { validate } = require('../middleware/validate');
const { z } = require('zod');
const logger = require('../utils/logger');
const GlobalUser = require('../models/GlobalUser');
const {
    provisionTenantDatabase,
    closeTenantConnection,
    dropTenantDatabase,
} = require('../utils/tenantDBCache');
const VerificationToken = require('../models/VerificationToken');
const emailService = require('../services/email');
const Metric = require('../models/Metric');
const {
    createTenantSchema,
    updateTenantSchema,
    heartbeatSchema,
    mongoIdParam,
    updateUserRoleSchema,
    adminChangePasswordSchema,
} = require('../schemas/admin');
const { runBackup } = require('../jobs/backup');
const { list: listBackups } = require('../jobs/backup-providers/local');

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
    requireVerifiedEmail,
    requireRole('admin', 'staff', 'owner', 'user'),
    asyncHandler(async (req, res) => {
        let query = {};

        // If not owner, filter tenants to only those assigned to the user
        if (req.user.role !== 'owner') {
            const assignedTenantIds = req.user.tenants.map((t) => t.tenant);
            query._id = { $in: assignedTenantIds };
        }

        const tenants = await Tenant.find(query).sort({ lastSeen: -1 });
        return successResponse(res, tenants, 'Tenants retrieved');
    }),
);

router.post(
    '/tenants',
    authMiddleware,
    requireVerifiedEmail,
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
            createdBy: req.user.id,
        });

        // Provision a dedicated database for the tenant
        try {
            const dbUri = await provisionTenantDatabase(slug);
            tenant.dbUri = dbUri;
            await tenant.save();
        } catch (provisionErr) {
            logger.error({ err: provisionErr, slug }, 'Failed to provision tenant database');
            tenant.deploymentStatus = 'failed';
            await tenant.save();
        }

        // Audit Log
        await logAction(req, 'TENANT_CREATED', tenant.id, {
            name: tenant.name,
            slug: tenant.slug,
        });

        // Real-time notification
        socketService.emitEvent('tenant:created', {
            id: tenant.id,
            name: tenant.name,
            owner: req.user.id,
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
    requireVerifiedEmail,
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
    requireVerifiedEmail,
    requireRole('admin', 'owner'),
    validate({ params: mongoIdParam, body: updateTenantSchema }),
    asyncHandler(async (req, res) => {
        const {
            name,
            vmIpAddress,
            subscribedModules,
            isActive,
            status,
            branding,
            onboardingProgress,
        } = req.body;

        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        if (name !== undefined) tenant.name = name;
        if (vmIpAddress !== undefined) tenant.vmIpAddress = vmIpAddress;
        if (subscribedModules !== undefined) tenant.subscribedModules = subscribedModules;
        if (isActive !== undefined) tenant.isActive = isActive;
        if (status !== undefined) tenant.status = status;
        if (branding !== undefined) tenant.branding = { ...tenant.branding, ...branding };
        if (onboardingProgress !== undefined) tenant.onboardingProgress = onboardingProgress;

        await tenant.save();

        // Audit Log
        await logAction(req, 'TENANT_UPDATED', tenant.id, {
            updates: req.body,
        });

        // Real-time notification for status change
        if (isActive !== undefined || status !== undefined) {
            socketService.emitEvent('tenant:status_change', {
                id: tenant.id,
                name: tenant.name,
                isActive: tenant.isActive,
                status: tenant.status,
            });
        }

        return successResponse(res, tenant, 'Tenant updated');
    }),
);

router.delete(
    '/tenants/:id',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('admin', 'owner'),
    validate({ params: mongoIdParam }),
    asyncHandler(async (req, res) => {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        // Clean up tenant database and cached connection
        if (tenant.dbUri) {
            try {
                await closeTenantConnection(tenant.slug);
                await dropTenantDatabase(tenant.dbUri);
            } catch (cleanupErr) {
                logger.error(
                    { err: cleanupErr, slug: tenant.slug },
                    'Failed to clean up tenant database',
                );
            }
        }

        await Tenant.findByIdAndDelete(req.params.id);

        // Audit Log
        await logAction(req, 'TENANT_DELETED', tenant.id, {
            name: tenant.name,
            slug: tenant.slug,
        });

        return successResponse(res, { id: req.params.id }, 'Tenant deleted');
    }),
);

/**
 * @openapi
 * /api/admin/tenants/{id}/export:
 *   get:
 *     tags: [Admin]
 *     summary: Export tenant data
 *     description: Generates a JSON dump of all tenant data (metadata, subscriptions, usage).
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/tenants/:id/export',
    authMiddleware,
    requireRole('owner'),
    validate({ params: mongoIdParam }),
    asyncHandler(async (req, res) => {
        const Subscription = require('../models/Subscription');
        const UsageMeter = require('../models/UsageMeter');

        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return errorResponse(res, 'Tenant not found', 404);

        const [subscriptions, usage] = await Promise.all([
            Subscription.find({ tenant: tenant._id }),
            UsageMeter.find({ tenant: tenant._id }),
        ]);

        const exportData = {
            tenant,
            subscriptions,
            usage,
            exportedAt: new Date(),
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=tenant-export-${tenant.slug}.json`,
        );
        return res.json(exportData);
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
router.get(
    '/users',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('owner', 'admin'),
    async (req, res) => {
        try {
            let query = {};

            // If not owner, filter users to only those sharing a tenant with the requester
            if (req.user.role !== 'owner') {
                const tenantIds = req.user.tenants.map((t) => t.tenant);
                query['tenants.tenant'] = { $in: tenantIds };
            }

            const users = await GlobalUser.find(
                query,
                'firstName lastName email role isActive createdAt tenants',
            ).populate('tenants.tenant');

            res.json({ success: true, count: users.length, data: users });
        } catch (error) {
            logger.error({ err: error }, 'Failed to fetch users');
            errorResponse(res, 'Failed to fetch users', 500);
        }
    },
);

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
    requireVerifiedEmail,
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

            // Determine tenant context
            let userTenants = [];
            let globalRole = role;

            if (req.user.role !== 'owner') {
                // Silo/Tenant Admins can only invite 'user' or 'staff' to their own tenant
                if (role === 'owner' || role === 'admin') {
                    // Technically, a tenant admin MIGHT want to invite another admin for the SAME tenant.
                    // But they definitely cannot create a Global Owner/Admin.
                    // Let's assume the 'role' in body is the TENANT role.
                    // And Global Role is always 'user'.
                }

                // For simplified Silo flow:
                // Global Role = 'user'
                // Tenant Role = req.body.role (e.g. 'user', 'staff', 'admin' of that tenant)
                globalRole = 'user';

                if (req.user.tenants && req.user.tenants.length > 0) {
                    // Use the first tenant (Silo case)
                    userTenants.push({
                        tenant: req.user.tenants[0].tenant,
                        role: role, // The role specified in invite is the tenant-level role
                    });
                }
            }

            // Create user without password — they'll set it via the invite link
            const newUser = await GlobalUser.create({
                email,
                firstName,
                lastName,
                role: globalRole,
                tenants: userTenants,
                isActive: false, // User activates by accepting invite
                isEmailVerified: false,
                invitedBy: req.user._id,
            });

            // Generate invite token (48-hour expiry)
            const inviteToken = await VerificationToken.createToken(newUser._id, 'invite', 48);

            // Send invite email (non-fatal — user is created regardless)
            try {
                const inviterName =
                    `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() ||
                    req.user.email;
                await emailService.sendInviteEmail(
                    email,
                    firstName,
                    inviterName,
                    inviteToken.token,
                );
            } catch (emailErr) {
                logger.error({ err: emailErr, email }, 'Failed to send invite email');
            }

            logger.info({ adminId: req.user.id, newUserId: newUser.id }, 'User invited');

            // Audit Log
            await logAction(req, 'USER_INVITED', email, {
                role,
            });

            // Real-time notification
            socketService.emitEvent('user:invited', {
                email,
                role,
            });

            res.status(201).json({
                success: true,
                message: `Invitation email sent to ${email}`,
                data: {
                    user: {
                        id: newUser._id,
                        email: newUser.email,
                        role: newUser.role,
                    },
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
    requireVerifiedEmail,
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

            // Audit Log
            await logAction(req, 'USER_DEACTIVATED', id, {
                targetEmail: user.email,
            });

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
    requireVerifiedEmail,
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

            // Audit Log
            await logAction(req, 'USER_ROLE_UPDATED', id, {
                newRole: role,
                targetEmail: user.email,
            });

            res.json({ success: true, message: 'Role updated successfully', data: user });
        } catch (error) {
            logger.error({ err: error }, 'Failed to update user role');
            errorResponse(res, 'Failed to update user role', 500);
        }
    },
);

/**
 * @swagger
 * /api/admin/users/{id}/password:
 *   post:
 *     summary: Change a user's password (Admin)
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
 *             required: [password, confirmPassword]
 *             properties:
 *               password: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post(
    '/users/:id/password',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('owner', 'admin'),
    validate({ params: mongoIdParam, body: adminChangePasswordSchema }),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { password } = req.body;

            // Administrative logic:
            // 1. Owners can change anyone's password.
            // 2. Tenant Admins can only change passwords of users in their own tenant.

            const targetUser = await GlobalUser.findById(id);
            if (!targetUser) {
                return errorResponse(res, 'User not found', 404);
            }

            if (req.user.role !== 'owner') {
                // Check if the admin and target user share at least one tenant
                const adminTenantIds = req.user.tenants.map((t) => t.tenant.toString());
                const targetTenantIds = targetUser.tenants.map((t) => t.tenant.toString());

                const hasCommonTenant = adminTenantIds.some((id) => targetTenantIds.includes(id));

                if (!hasCommonTenant) {
                    return errorResponse(res, 'Access denied: User is not in your tenant', 403);
                }
            }

            // Update password
            targetUser.password = password;
            await targetUser.save();

            // Revoke all refresh tokens for security
            const RefreshToken = require('../models/RefreshToken');
            await RefreshToken.updateMany(
                { user: targetUser._id, revoked: null },
                { revoked: new Date() },
            );

            logger.info(
                { adminId: req.user.id, targetUserId: id },
                'User password changed by admin',
            );

            // Audit Log
            await logAction(req, 'USER_PASSWORD_CHANGED_BY_ADMIN', id, {
                targetEmail: targetUser.email,
            });

            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            logger.error({ err: error }, 'Failed to change user password');
            errorResponse(res, 'Failed to change user password', 500);
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
    requireVerifiedEmail,
    requireRole('admin', 'owner', 'user'),
    asyncHandler(async (req, res) => {
        const { id } = req.params; // slug or id

        // Find the tenant first to get the formal ID if 'id' is a slug
        const tenant = await Tenant.findOne({
            $or: [{ slug: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
        });

        if (!tenant) {
            return errorResponse(res, 'Tenant not found', 404);
        }

        // Security: If role is 'user', verify they belong to this tenant
        if (req.user.role === 'user') {
            const hasAccess = req.user.tenants.some(
                (t) => t.tenant.toString() === tenant._id.toString(),
            );
            if (!hasAccess) {
                return errorResponse(res, 'Access denied: Not a member of this tenant', 403);
            }
        }

        // Find last 24 entries using the canonical slug/id
        const history = await Metric.find({ tenantId: tenant.slug })
            .sort({ timestamp: -1 })
            .limit(24);

        res.json({
            success: true,
            data: history.reverse(), // Sort chronologically for charts
        });
    }),
);

/**
 * @openapi
 * /api/admin/usage/{tenantId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get usage data
 *     description: Get hourly API call counts for a tenant.
 */
router.get(
    '/usage/:id',
    authMiddleware,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        const UsageMeter = require('../models/UsageMeter');
        const usage = await UsageMeter.find({ tenant: req.params.id })
            .sort({ timestamp: -1 })
            .limit(100);
        return successResponse(res, usage, 'Usage data retrieved');
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
    requireVerifiedEmail,
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

/**
 * @route GET /api/admin/audit-logs
 * @desc Get all audit logs
 * @access Private (Owner Only)
 */
router.get(
    '/audit-logs',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('owner'),
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;
        const AuditLog = require('../models/AuditLog');

        const query = {};

        // Filter by Action
        if (action) {
            query.action = action;
        }

        // Filter by User
        if (userId) {
            query.user = userId;
        }

        // Filter by Date Range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    query.createdAt.$gte = start;
                }
            }
            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    query.createdAt.$lte = end;
                }
            }
            // Remove createdAt if empty
            if (Object.keys(query.createdAt).length === 0) {
                delete query.createdAt;
            }
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            AuditLog.countDocuments(query),
        ]);

        return successResponse(
            res,
            {
                logs,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / limit),
                },
            },
            'Audit logs retrieved',
        );
    }),
);

// ─── Backup & Restore ───────────────────────────────────────────────────────

// Multer config for backup uploads (500MB limit)
const backupUpload = multer({
    dest: config.BACKUP_DIR,
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.originalname.endsWith('.gz')) {
            cb(null, true);
        } else {
            cb(new Error('Only .gz files are accepted'));
        }
    },
});

/**
 * Path-traversal guard: rejects filenames containing "..", "/", or "\"
 */
function isSafeFilename(filename) {
    return !/[/\\]/.test(filename) && !filename.includes('..');
}

/**
 * @openapi
 * /api/admin/backups:
 *   get:
 *     tags: [Admin]
 *     summary: List all backups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backup files
 */
router.get(
    '/backups',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        const backups = await listBackups();

        const enriched = backups.map((b) => {
            try {
                const stat = fs.statSync(path.join(config.BACKUP_DIR, b.name));
                return { name: b.name, date: b.date, size: stat.size };
            } catch {
                return { name: b.name, date: b.date, size: 0 };
            }
        });

        enriched.sort((a, b) => new Date(b.date) - new Date(a.date));

        return successResponse(res, enriched, 'Backups retrieved');
    }),
);

/**
 * @openapi
 * /api/admin/backups:
 *   post:
 *     tags: [Admin]
 *     summary: Trigger a manual backup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup created
 */
router.post(
    '/backups',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        await runBackup();

        await logAction(req, 'BACKUP_CREATED', null, {});

        return successResponse(res, null, 'Backup created successfully');
    }),
);

/**
 * @openapi
 * /api/admin/backups/{filename}/download:
 *   get:
 *     tags: [Admin]
 *     summary: Download a backup file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Backup file download
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: Backup not found
 */
router.get(
    '/backups/:filename/download',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        const { filename } = req.params;

        if (!isSafeFilename(filename)) {
            return errorResponse(res, 'Invalid filename', 400);
        }

        const filePath = path.join(config.BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return errorResponse(res, 'Backup not found', 404);
        }

        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    }),
);

/**
 * @openapi
 * /api/admin/backups/{filename}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a backup file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Backup deleted
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: Backup not found
 */
router.delete(
    '/backups/:filename',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('admin', 'owner'),
    asyncHandler(async (req, res) => {
        const { filename } = req.params;

        if (!isSafeFilename(filename)) {
            return errorResponse(res, 'Invalid filename', 400);
        }

        const filePath = path.join(config.BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return errorResponse(res, 'Backup not found', 404);
        }

        fs.unlinkSync(filePath);

        await logAction(req, 'BACKUP_DELETED', null, { filename });

        return successResponse(res, null, 'Backup deleted');
    }),
);

/**
 * @openapi
 * /api/admin/backups/restore:
 *   post:
 *     tags: [Admin]
 *     summary: Restore database from backup (Owner only)
 *     description: >
 *       Accepts either a JSON body with `{ filename }` to restore from an existing backup,
 *       or a multipart file upload with a `.gz` archive. This is a destructive operation
 *       that drops existing data before restoring.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database restored
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Restore failed
 */
router.post(
    '/backups/restore',
    authMiddleware,
    requireVerifiedEmail,
    requireRole('owner'),
    backupUpload.single('file'),
    asyncHandler(async (req, res) => {
        let archivePath;
        let uploadedFile = null;

        if (req.file) {
            // Multipart upload — rename temp file to original name
            uploadedFile = path.join(config.BACKUP_DIR, req.file.originalname);
            fs.renameSync(req.file.path, uploadedFile);
            archivePath = uploadedFile;
        } else if (req.body.filename) {
            const { filename } = req.body;

            if (!isSafeFilename(filename)) {
                return errorResponse(res, 'Invalid filename', 400);
            }

            archivePath = path.join(config.BACKUP_DIR, filename);

            if (!fs.existsSync(archivePath)) {
                return errorResponse(res, 'Backup file not found', 404);
            }
        } else {
            return errorResponse(res, 'Provide a filename or upload a .gz file', 400);
        }

        try {
            execSync(
                `"${config.MONGORESTORE_BIN}" --uri="${config.MONGODB_URI}" --gzip --archive="${archivePath}" --drop`,
                {
                    timeout: 10 * 60 * 1000, // 10 minutes
                    stdio: ['pipe', 'pipe', 'pipe'],
                },
            );
        } catch (err) {
            const stderr = err.stderr ? err.stderr.toString() : '';
            logger.error({ err: err.message, stderr }, 'mongorestore failed');

            // Clean up uploaded file on failure
            if (uploadedFile && fs.existsSync(uploadedFile)) {
                fs.unlinkSync(uploadedFile);
            }

            return errorResponse(res, `Restore failed: ${stderr || err.message}`, 500);
        }

        // Successfully restored

        await logAction(req, 'BACKUP_RESTORED', null, {
            source: req.file ? req.file.originalname : req.body.filename,
        });

        return successResponse(res, null, 'Database restored successfully');
    }),
);

module.exports = router;

const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { successResponse, errorResponse } = require('../utils/responseWrapper');
const { authMiddleware, requirePermission } = require('../middleware/authMiddleware');

/**
 * @openapi
 * /api/roles:
 *   get:
 *     summary: List all roles
 *     description: Retrieves the RBAC matrix roles for the current tenant or global Hub context.
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/',
    authMiddleware,
    requirePermission('roles:read', 'roles:manage'),
    async (req, res) => {
        try {
            // Single instance mode: Show all global roles
            const roles = await Role.find({}).sort({ name: 1 });
            return successResponse(res, roles, 'Roles retrieved successfully');
        } catch (err) {
            return errorResponse(res, 'Failed to fetch roles', 500, err);
        }
    },
);

/**
 * @openapi
 * /api/roles:
 *   post:
 *     summary: Create a custom role
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, requirePermission('roles:manage'), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name || !permissions || !Array.isArray(permissions)) {
            return errorResponse(res, 'Name and permissions array are required', 400);
        }

        const newRole = new Role({
            name,
            description,
            permissions,
            isSystem: false,
        });

        await newRole.save();
        return successResponse(res, newRole, 'Role created successfully', 201);
    } catch (err) {
        if (err.code === 11000) {
            return errorResponse(res, 'A role with this name already exists', 409);
        }
        return errorResponse(res, 'Failed to create role', 500, err);
    }
});

/**
 * @openapi
 * /api/roles/{id}:
 *   put:
 *     summary: Update role permissions
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, requirePermission('roles:manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { description, permissions } = req.body;

        const role = await Role.findById(id);
        if (!role) {
            return errorResponse(res, 'Role not found', 404);
        }

        // Single instance node: No context boundary check needed

        // System roles cannot be completely overwritten, but perhaps permissions can be augmented by owner?
        // Actually, let's keep it simple: no editing System role names, only permissions.
        if (description !== undefined) role.description = description;
        if (permissions !== undefined && Array.isArray(permissions)) role.permissions = permissions;

        await role.save();
        return successResponse(res, role, 'Role updated successfully');
    } catch (err) {
        return errorResponse(res, 'Failed to update role', 500, err);
    }
});

/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a custom role
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, requirePermission('roles:manage'), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return errorResponse(res, 'Role not found', 404);
        }

        if (role.isSystem) {
            return errorResponse(res, 'System roles cannot be deleted', 403);
        }

        // Single instance node: No context boundary check needed

        await role.deleteOne();
        return successResponse(res, null, 'Role deleted successfully');
    } catch (err) {
        return errorResponse(res, 'Failed to delete role', 500, err);
    }
});

module.exports = router;

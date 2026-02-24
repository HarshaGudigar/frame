/**
 * Zod Validation Schemas — Admin Routes
 */

const { z } = require('zod');

const heartbeatSchema = z.object({
    instanceId: z
        .string({ required_error: 'Instance ID is required' })
        .min(1, 'Instance ID cannot be empty'),
    metrics: z
        .object({
            cpu: z.number().min(0).max(100).optional(),
            ram: z.number().min(0).max(100).optional(),
            uptime: z.number().min(0).optional(),
            version: z.string().optional(),
        })
        .optional(),
});

const updateUserRoleSchema = z.object({
    role: z.enum(['superuser', 'admin', 'staff', 'user'], {
        required_error: 'Role is required',
    }),
});

const adminChangePasswordSchema = z
    .object({
        password: z
            .string({ required_error: 'Password is required' })
            .min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string({ required_error: 'Confirm password is required' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

const mongoIdParam = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
});

module.exports = {
    heartbeatSchema,
    mongoIdParam,
    updateUserRoleSchema,
    adminChangePasswordSchema,
};

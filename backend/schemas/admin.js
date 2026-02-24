/**
 * Zod Validation Schemas — Admin Routes
 */

const { z } = require('zod');

const createTenantSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .min(1, 'Name cannot be empty')
        .max(100, 'Name must be at most 100 characters')
        .trim(),
    slug: z
        .string({ required_error: 'Slug is required' })
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
        .min(2, 'Slug must be at least 2 characters')
        .max(50, 'Slug must be at most 50 characters'),
    vmIpAddress: z.string().optional().default(''),
    subscribedModules: z.array(z.string()).optional().default([]),
});

const updateTenantSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    vmIpAddress: z.string().optional(),
    subscribedModules: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    status: z.enum(['online', 'offline', 'error', 'suspended']).optional(),
    branding: z
        .object({
            logo: z.string().optional(),
            primaryColor: z.string().optional(),
            faviconUrl: z.string().optional(),
            loginDomain: z.string().optional(),
        })
        .optional(),
    onboardingProgress: z.number().min(0).max(100).optional(),
});

const heartbeatSchema = z.object({
    tenantId: z
        .string({ required_error: 'Tenant ID is required' })
        .min(1, 'Tenant ID cannot be empty'),
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
    createTenantSchema,
    updateTenantSchema,
    heartbeatSchema,
    mongoIdParam,
    updateUserRoleSchema,
    adminChangePasswordSchema,
};

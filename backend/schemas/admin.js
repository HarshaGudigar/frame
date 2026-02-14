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

const mongoIdParam = z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
});

module.exports = { createTenantSchema, updateTenantSchema, heartbeatSchema, mongoIdParam };

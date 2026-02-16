/**
 * Zod Validation Schemas — Marketplace Routes
 */

const { z } = require('zod');

const createProductSchema = z.object({
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
    description: z.string().max(1000).optional().default(''),
    price: z.number().min(0, 'Price cannot be negative').optional().default(0),
    features: z.array(z.string()).optional().default([]),
});

const purchaseSchema = z.object({
    tenantId: z
        .string({ required_error: 'tenantId is required' })
        .regex(/^[a-f\d]{24}$/i, 'Invalid tenant ID format'),
    productId: z
        .string({ required_error: 'productId is required' })
        .regex(/^[a-f\d]{24}$/i, 'Invalid product ID format'),
});

const updateProductSchema = createProductSchema.partial();

module.exports = { createProductSchema, purchaseSchema, updateProductSchema };

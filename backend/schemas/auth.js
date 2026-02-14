/**
 * Zod Validation Schemas — Auth Routes
 */

const { z } = require('zod');

const registerSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format')
        .trim()
        .toLowerCase(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters'),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
});

const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format')
        .trim()
        .toLowerCase(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };

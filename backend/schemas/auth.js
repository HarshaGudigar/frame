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

const updateProfileSchema = z
    .object({
        firstName: z.string().trim().optional(),
        lastName: z.string().trim().optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
        confirmNewPassword: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.newPassword && !data.currentPassword) {
                return false;
            }
            return true;
        },
        {
            message: 'Current password is required to set a new password',
            path: ['currentPassword'],
        },
    )
    .refine(
        (data) => {
            if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
                return false;
            }
            return true;
        },
        {
            message: 'Passwords do not match',
            path: ['confirmNewPassword'],
        },
    );

const acceptInviteSchema = z
    .object({
        token: z.string({ required_error: 'Token is required' }).min(1, 'Token is required'),
        password: z
            .string({ required_error: 'Password is required' })
            .min(6, 'Password must be at least 6 characters')
            .max(128, 'Password must be at most 128 characters'),
        confirmPassword: z.string({ required_error: 'Password confirmation is required' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const verifyEmailSchema = z.object({
    token: z.string({ required_error: 'Token is required' }).min(1, 'Token is required'),
});

const forgotPasswordSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format')
        .trim()
        .toLowerCase(),
});

const resetPasswordSchema = z
    .object({
        token: z.string({ required_error: 'Token is required' }).min(1, 'Token is required'),
        password: z
            .string({ required_error: 'Password is required' })
            .min(6, 'Password must be at least 6 characters')
            .max(128, 'Password must be at most 128 characters'),
        confirmPassword: z.string({ required_error: 'Password confirmation is required' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

module.exports = {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    acceptInviteSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};

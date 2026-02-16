/**
 * Zod Validation Schemas — Hotel Module
 */

const { z } = require('zod');

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

const mongoIdParam = z.object({
    id: mongoId,
});

// ── Room Schemas ──

const createRoomSchema = z.object({
    number: z
        .string({ required_error: 'Room number is required' })
        .min(1, 'Room number cannot be empty')
        .max(20, 'Room number must be at most 20 characters')
        .trim(),
    type: z.string({ required_error: 'Room type is required' }).min(1, 'Room type cannot be empty'),
    pricePerNight: z
        .number({ required_error: 'Price per night is required' })
        .positive('Price must be positive'),
    floor: z.number({ required_error: 'Floor is required' }).int('Floor must be an integer'),
    amenities: z.array(z.string()).optional().default([]),
    description: z.string().max(500).optional(),
});

const updateRoomSchema = z.object({
    number: z.string().min(1).max(20).trim().optional(),
    type: z.string().min(1).optional(),
    status: z.enum(['Available', 'Occupied', 'Dirty', 'Maintenance']).optional(),
    pricePerNight: z.number().positive().optional(),
    floor: z.number().int().optional(),
    amenities: z.array(z.string()).optional(),
    description: z.string().max(500).optional(),
});

// ── Customer Schemas ──

const createCustomerSchema = z.object({
    firstName: z
        .string({ required_error: 'First name is required' })
        .min(1, 'First name cannot be empty')
        .max(100)
        .trim(),
    lastName: z
        .string({ required_error: 'Last name is required' })
        .min(1, 'Last name cannot be empty')
        .max(100)
        .trim(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone cannot be empty'),
    idProofType: z.string().optional(),
    idProofNumber: z.string().optional(),
    birthDate: z.string().datetime().optional(),
    marriageDate: z.string().datetime().optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pinCode: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
});

const updateCustomerSchema = z.object({
    firstName: z.string().min(1).max(100).trim().optional(),
    lastName: z.string().min(1).max(100).trim().optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(1).optional(),
    idProofType: z.string().optional(),
    idProofNumber: z.string().optional(),
    birthDate: z.string().datetime().optional().nullable(),
    marriageDate: z.string().datetime().optional().nullable(),
    gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pinCode: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
});

// ── Booking Schemas ──

const createBookingSchema = z
    .object({
        customerId: mongoId.optional(),
        customerData: createCustomerSchema.optional(),
        roomId: mongoId,
        checkInDate: z
            .string({ required_error: 'Check-in date is required' })
            .datetime({ message: 'Invalid check-in date format' }),
        numberOfDays: z
            .number({ required_error: 'Number of days is required' })
            .int()
            .min(1, 'Number of days must be at least 1'),
        serviceType: z.enum(['24 Hours', '12 Hours', '12 PM']).optional().default('24 Hours'),
        checkInType: z.enum(['Walk In', 'Online Booking']).optional().default('Walk In'),
        maleCount: z.number().int().min(0).optional().default(0),
        femaleCount: z.number().int().min(0).optional().default(0),
        childCount: z.number().int().min(0).optional().default(0),
        agentId: mongoId.optional(),
        purposeOfVisit: z.string().max(500).optional(),
        advanceAmount: z.number().nonnegative().optional().default(0),
        notes: z.string().max(1000).optional(),
    })
    .refine((data) => data.customerId || data.customerData, {
        message: 'Either customerId or customerData is required',
        path: ['customerId'],
    });

// ── Settings Schemas ──

const createSettingsSchema = z.object({
    type: z
        .string({ required_error: 'Settings type is required' })
        .min(1, 'Type cannot be empty')
        .trim(),
    options: z
        .array(
            z.object({
                label: z.string().min(1),
                value: z.string().min(1),
                isActive: z.boolean().optional().default(true),
            }),
        )
        .min(1, 'At least one option is required'),
});

const updateSettingsSchema = z.object({
    options: z
        .array(
            z.object({
                label: z.string().min(1),
                value: z.string().min(1),
                isActive: z.boolean().optional().default(true),
            }),
        )
        .min(1, 'At least one option is required'),
});

const settingsTypeParam = z.object({
    type: z.string().min(1),
});

// ── BusinessInfo Schema ──

const businessInfoSchema = z.object({
    legalName: z
        .string({ required_error: 'Legal name is required' })
        .min(1, 'Legal name cannot be empty')
        .trim(),
    brandName: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pinCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    email: z.string().email().optional(),
    website: z.string().max(200).optional(),
    phone: z.string().max(20).optional(),
    gst: z.string().max(50).optional(),
    cin: z.string().max(50).optional(),
    pan: z.string().max(20).optional(),
    extraInfo: z
        .array(
            z.object({
                key: z.string().min(1),
                value: z.string().min(1),
            }),
        )
        .max(5)
        .optional()
        .default([]),
});

// ── Service Schemas ──

const createServiceSchema = z.object({
    name: z
        .string({ required_error: 'Service name is required' })
        .min(1, 'Name cannot be empty')
        .trim(),
    description: z.string().max(500).optional(),
    rate: z.number({ required_error: 'Rate is required' }).nonnegative('Rate cannot be negative'),
    gstRate: z.number().min(0).max(100).optional().default(0),
    isActive: z.boolean().optional().default(true),
});

const updateServiceSchema = z.object({
    name: z.string().min(1).trim().optional(),
    description: z.string().max(500).optional(),
    rate: z.number().nonnegative().optional(),
    gstRate: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
});

// ── Agent Schemas ──

const createAgentSchema = z.object({
    firstName: z
        .string({ required_error: 'First name is required' })
        .min(1, 'First name cannot be empty')
        .max(100)
        .trim(),
    lastName: z
        .string({ required_error: 'Last name is required' })
        .min(1, 'Last name cannot be empty')
        .max(100)
        .trim(),
    agentCode: z
        .string({ required_error: 'Agent code is required' })
        .min(1, 'Agent code cannot be empty')
        .trim(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    sharePercentage: z.number().min(0).max(100).optional().default(0),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pinCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    profilePic: z.string().optional(),
    businessType: z.enum(['Registered', 'Unregistered']).optional().default('Unregistered'),
    gstin: z.string().max(50).optional(),
    pan: z.string().max(20).optional(),
    cin: z.string().max(50).optional(),
    bankName: z.string().max(100).optional(),
    bankBranch: z.string().max(100).optional(),
    bankIfsc: z.string().max(20).optional(),
    bankAccountNumber: z.string().max(30).optional(),
    isActive: z.boolean().optional().default(true),
});

const updateAgentSchema = z.object({
    firstName: z.string().min(1).max(100).trim().optional(),
    lastName: z.string().min(1).max(100).trim().optional(),
    agentCode: z.string().min(1).trim().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    sharePercentage: z.number().min(0).max(100).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pinCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    profilePic: z.string().optional(),
    businessType: z.enum(['Registered', 'Unregistered']).optional(),
    gstin: z.string().max(50).optional(),
    pan: z.string().max(20).optional(),
    cin: z.string().max(50).optional(),
    bankName: z.string().max(100).optional(),
    bankBranch: z.string().max(100).optional(),
    bankIfsc: z.string().max(20).optional(),
    bankAccountNumber: z.string().max(30).optional(),
    isActive: z.boolean().optional(),
});

// ── BookingService Schemas ──

const createBookingServiceSchema = z.object({
    serviceId: mongoId,
    quantity: z
        .number({ required_error: 'Quantity is required' })
        .int()
        .min(1, 'Quantity must be at least 1'),
    notes: z.string().max(500).optional(),
});

const updateBookingServiceSchema = z.object({
    quantity: z.number().int().min(1).optional(),
    notes: z.string().max(500).optional(),
});

// ── Transaction Category Schemas ──

const createTransactionCategorySchema = z.object({
    name: z
        .string({ required_error: 'Category name is required' })
        .min(1, 'Name cannot be empty')
        .trim(),
    type: z.enum(['Expense', 'Income'], { required_error: 'Type is required' }),
    isActive: z.boolean().optional().default(true),
});

const updateTransactionCategorySchema = z.object({
    name: z.string().min(1).trim().optional(),
    type: z.enum(['Expense', 'Income']).optional(),
    isActive: z.boolean().optional(),
});

// ── Transaction Schemas ──

const createTransactionSchema = z.object({
    type: z.enum(['Expense', 'Income'], { required_error: 'Type is required' }),
    referenceNumber: z.string().max(100).optional(),
    date: z
        .string({ required_error: 'Date is required' })
        .datetime({ message: 'Invalid date format' }),
    accountType: z.enum(['Petty Cash', 'Undeposited Funds'], {
        required_error: 'Account type is required',
    }),
    categoryId: mongoId,
    amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
    from: z.string().max(200).optional(),
    to: z.string().max(200).optional(),
    remarks: z.string().max(1000).optional(),
});

const updateTransactionSchema = z.object({
    type: z.enum(['Expense', 'Income']).optional(),
    referenceNumber: z.string().max(100).optional(),
    date: z.string().datetime().optional(),
    accountType: z.enum(['Petty Cash', 'Undeposited Funds']).optional(),
    categoryId: mongoId.optional(),
    amount: z.number().positive().optional(),
    from: z.string().max(200).optional(),
    to: z.string().max(200).optional(),
    remarks: z.string().max(1000).optional(),
});

// ── Booking ID param (for sub-resources) ──

const bookingIdParam = z.object({
    bookingId: mongoId,
});

const bookingServiceIdParam = z.object({
    bookingId: mongoId,
    id: mongoId,
});

module.exports = {
    mongoIdParam,
    // Room
    createRoomSchema,
    updateRoomSchema,
    // Customer
    createCustomerSchema,
    updateCustomerSchema,
    // Booking
    createBookingSchema,
    // Settings
    createSettingsSchema,
    updateSettingsSchema,
    settingsTypeParam,
    // BusinessInfo
    businessInfoSchema,
    // Service
    createServiceSchema,
    updateServiceSchema,
    // Agent
    createAgentSchema,
    updateAgentSchema,
    // BookingService
    createBookingServiceSchema,
    updateBookingServiceSchema,
    bookingIdParam,
    bookingServiceIdParam,
    // Transaction Category
    createTransactionCategorySchema,
    updateTransactionCategorySchema,
    // Transaction
    createTransactionSchema,
    updateTransactionSchema,
};

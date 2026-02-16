const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createBookingSchema, mongoIdParam } = require('../schemas');
const { getNextCheckInNumber, calculateCheckOutDate } = require('../helpers');

const populateFields = ['customer', 'room', 'agent'];

// GET /bookings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Booking } = await getModels(req);
        const bookings = await Booking.find()
            .populate('customer')
            .populate('room')
            .populate('agent')
            .sort({ checkInDate: -1 });
        return successResponse(res, bookings);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch bookings', 500, error);
    }
});

// GET /bookings/:id
router.get('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { Booking } = await getModels(req);
        const booking = await Booking.findById(req.params.id)
            .populate('customer')
            .populate('room')
            .populate('agent');
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        return successResponse(res, booking);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch booking', 500, error);
    }
});

// POST /bookings
router.post('/', authMiddleware, validate({ body: createBookingSchema }), async (req, res) => {
    try {
        const { Booking, Room, Customer, Agent, connection } = await getModels(req);
        const {
            customerId,
            customerData,
            roomId,
            checkInDate,
            numberOfDays,
            serviceType,
            checkInType,
            maleCount,
            femaleCount,
            childCount,
            agentId,
            purposeOfVisit,
            advanceAmount,
            notes,
        } = req.body;

        // 1. Verify room exists and is not in Maintenance
        const room = await Room.findById(roomId);
        if (!room) return errorResponse(res, 'Room not found', 404);
        if (room.status === 'Maintenance') {
            return errorResponse(res, 'Cannot book a room that is under maintenance', 400);
        }

        // 2. Calculate checkout date
        const checkOutDate = calculateCheckOutDate(checkInDate, numberOfDays, serviceType);

        // 3. Check for overlapping bookings
        const overlap = await Booking.findOne({
            room: roomId,
            status: { $in: ['Confirmed', 'CheckedIn'] },
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: new Date(checkInDate) },
        });
        if (overlap) {
            return errorResponse(res, 'Room is already booked for the selected dates', 409);
        }

        // 4. Resolve customer
        let finalCustomerId = customerId;
        if (!customerId && customerData) {
            const newCustomer = await Customer.create(customerData);
            finalCustomerId = newCustomer._id;
        } else if (customerId) {
            const customer = await Customer.findById(customerId);
            if (!customer) return errorResponse(res, 'Customer not found', 404);
        }

        // 5. Verify agent if provided
        if (agentId) {
            const agent = await Agent.findById(agentId);
            if (!agent) return errorResponse(res, 'Agent not found', 404);
        }

        // 6. Auto-calculate room rent
        const roomRent = room.pricePerNight * numberOfDays;

        // 7. Generate check-in number
        const checkInNumber = await getNextCheckInNumber(connection);

        const booking = await Booking.create({
            customer: finalCustomerId,
            room: roomId,
            checkInDate,
            checkOutDate,
            numberOfDays,
            roomRent,
            totalAmount: roomRent,
            serviceType,
            checkInType,
            maleCount,
            femaleCount,
            childCount,
            agent: agentId || undefined,
            purposeOfVisit,
            advanceAmount,
            checkInNumber,
            notes,
        });

        const populated = await Booking.findById(booking._id)
            .populate('customer')
            .populate('room')
            .populate('agent');

        return successResponse(res, populated, 'Booking created successfully', 201);
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 'A customer with this email already exists', 409);
        }
        return errorResponse(res, 'Failed to create booking', 500, error);
    }
});

// POST /bookings/:id/check-in
router.post(
    '/:id/check-in',
    authMiddleware,
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Booking, Room } = await getModels(req);
            const booking = await Booking.findById(req.params.id);
            if (!booking) return errorResponse(res, 'Booking not found', 404);

            if (booking.status !== 'Confirmed') {
                return errorResponse(
                    res,
                    `Cannot check in a booking with status "${booking.status}". Only confirmed bookings can be checked in.`,
                    400,
                );
            }

            const room = await Room.findById(booking.room);
            if (!room) return errorResponse(res, 'Room not found', 404);
            if (room.status !== 'Available') {
                return errorResponse(
                    res,
                    `Cannot check in: Room ${room.number} is currently ${room.status}. It must be "Available".`,
                    400,
                );
            }

            booking.status = 'CheckedIn';
            booking.checkedInAt = new Date();
            await booking.save();

            room.status = 'Occupied';
            await room.save();

            const populated = await Booking.findById(booking._id)
                .populate('customer')
                .populate('room')
                .populate('agent');

            return successResponse(res, populated, 'Guest checked in successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to check in guest', 500, error);
        }
    },
);

// POST /bookings/:id/check-out
router.post(
    '/:id/check-out',
    authMiddleware,
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Booking, Room } = await getModels(req);
            const booking = await Booking.findById(req.params.id);
            if (!booking) return errorResponse(res, 'Booking not found', 404);

            if (booking.status !== 'CheckedIn') {
                return errorResponse(
                    res,
                    `Cannot check out a booking with status "${booking.status}". Only checked-in bookings can be checked out.`,
                    400,
                );
            }

            booking.status = 'CheckedOut';
            booking.checkedOutAt = new Date();
            booking.paymentStatus = 'Paid';
            await booking.save();

            await Room.findByIdAndUpdate(booking.room, { status: 'Dirty' });

            const populated = await Booking.findById(booking._id)
                .populate('customer')
                .populate('room')
                .populate('agent');

            return successResponse(res, populated, 'Guest checked out successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to check out guest', 500, error);
        }
    },
);

// POST /bookings/:id/cancel
router.post('/:id/cancel', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { Booking, Room } = await getModels(req);
        const booking = await Booking.findById(req.params.id);
        if (!booking) return errorResponse(res, 'Booking not found', 404);

        if (['CheckedOut', 'Cancelled'].includes(booking.status)) {
            return errorResponse(
                res,
                `Cannot cancel a booking with status "${booking.status}"`,
                400,
            );
        }

        if (booking.status === 'CheckedIn') {
            await Room.findByIdAndUpdate(booking.room, { status: 'Available' });
        }

        booking.status = 'Cancelled';
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('customer')
            .populate('room')
            .populate('agent');

        return successResponse(res, populated, 'Booking cancelled successfully');
    } catch (error) {
        return errorResponse(res, 'Failed to cancel booking', 500, error);
    }
});

// POST /bookings/:id/no-show
router.post(
    '/:id/no-show',
    authMiddleware,
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Booking } = await getModels(req);
            const booking = await Booking.findById(req.params.id);
            if (!booking) return errorResponse(res, 'Booking not found', 404);

            if (booking.status !== 'Confirmed') {
                return errorResponse(
                    res,
                    `Only confirmed bookings can be marked as No Show. Current status: "${booking.status}"`,
                    400,
                );
            }

            booking.status = 'NoShow';
            await booking.save();

            const populated = await Booking.findById(booking._id)
                .populate('customer')
                .populate('room')
                .populate('agent');

            return successResponse(res, populated, 'Booking marked as No Show');
        } catch (error) {
            return errorResponse(res, 'Failed to update booking status', 500, error);
        }
    },
);

module.exports = router;

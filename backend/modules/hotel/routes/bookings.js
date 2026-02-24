const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createBookingSchema, mongoIdParam } = require('../schemas');
const { getNextCheckInNumber, calculateCheckOutDate } = require('../helpers');

// GET /bookings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Booking } = await getModels(req);
        const bookings = await Booking.find()
            .populate('customer')
            .populate('rooms')
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
            .populate('rooms')
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
            roomIds,
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

        // 1. Verify all rooms exist and are not in Maintenance
        const rooms = await Room.find({ _id: { $in: roomIds } });
        if (rooms.length !== roomIds.length) {
            return errorResponse(res, 'One or more rooms not found', 404);
        }

        for (const room of rooms) {
            if (room.status === 'Maintenance') {
                return errorResponse(
                    res,
                    `Room ${room.number} is under maintenance and cannot be booked`,
                    400,
                );
            }
        }

        // 2. Calculate checkout date
        const checkOutDate = calculateCheckOutDate(checkInDate, numberOfDays, serviceType);

        // 3. Check for overlapping bookings for any of the rooms
        const overlap = await Booking.findOne({
            rooms: { $in: roomIds },
            status: { $in: ['Confirmed', 'CheckedIn'] },
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: new Date(checkInDate) },
        });
        if (overlap) {
            return errorResponse(
                res,
                'One or more rooms are already booked for the selected dates',
                409,
            );
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

        // 6. Auto-calculate total room rent
        const totalRoomRent = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) * numberOfDays;

        // 7. Generate check-in number
        const checkInNumber = await getNextCheckInNumber(connection);

        const booking = await Booking.create({
            customer: finalCustomerId,
            rooms: roomIds,
            checkInDate,
            checkOutDate,
            numberOfDays,
            totalRoomRent,
            totalAmount: totalRoomRent,
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
            .populate('rooms')
            .populate('agent');

        if (req.eventBus && typeof req.eventBus.publish === 'function') {
            await req.eventBus.publish('hotel', 'hotel.booking.created', populated);

            if (req.emittedEvents) {
                req.emittedEvents.push({ name: 'hotel.booking.created', timestamp: new Date() });
            }
        }

        return successResponse(res, populated, 'Group booking created successfully', 201);
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

            const rooms = await Room.find({ _id: { $in: booking.rooms } });

            for (const room of rooms) {
                if (room.status !== 'Available') {
                    return errorResponse(
                        res,
                        `Cannot check in: Room ${room.number} is currently ${room.status}. All rooms must be "Available".`,
                        400,
                    );
                }
            }

            booking.status = 'CheckedIn';
            booking.checkedInAt = new Date();
            await booking.save();

            // Update all rooms to Occupied
            await Room.updateMany({ _id: { $in: booking.rooms } }, { status: 'Occupied' });

            const populated = await Booking.findById(booking._id)
                .populate('customer')
                .populate('rooms')
                .populate('agent');

            return successResponse(res, populated, 'Guest checked in successfully (Group)');
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

            const { HousekeepingTask } = await getModels(req);

            // Create housekeeping tasks for ALL rooms in the booking
            const tasks = booking.rooms.map((roomId) => ({
                room: roomId,
                type: 'Routine',
                notes: `Auto-generated task after group check-out of ${booking.checkInNumber}`,
                priority: 'Medium',
            }));
            await HousekeepingTask.insertMany(tasks);

            // Mark all rooms as Dirty
            await Room.updateMany({ _id: { $in: booking.rooms } }, { status: 'Dirty' });

            const populated = await Booking.findById(booking._id)
                .populate('customer')
                .populate('rooms')
                .populate('agent');

            return successResponse(res, populated, 'Guest checked out successfully (Group)');
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
            await Room.updateMany({ _id: { $in: booking.rooms } }, { status: 'Available' });
        }

        booking.status = 'Cancelled';
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('customer')
            .populate('rooms')
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
                .populate('rooms')
                .populate('agent');

            return successResponse(res, populated, 'Booking marked as No Show');
        } catch (error) {
            return errorResponse(res, 'Failed to update booking status', 500, error);
        }
    },
);

module.exports = router;

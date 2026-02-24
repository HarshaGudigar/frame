const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../middleware/authMiddleware');
const authorize = require('../../../middleware/rbacMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const { createRoomSchema, updateRoomSchema, mongoIdParam } = require('../schemas');

// GET /rooms
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { Room } = await getModels(req);
        const rooms = await Room.find().sort({ number: 1 });
        return successResponse(res, rooms);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch rooms', 500, error);
    }
});

// GET /rooms/:id
router.get('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { Room } = await getModels(req);
        const room = await Room.findById(req.params.id);
        if (!room) return errorResponse(res, 'Room not found', 404);
        return successResponse(res, room);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch room', 500, error);
    }
});

// POST /rooms
router.post(
    '/',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ body: createRoomSchema }),
    async (req, res) => {
        try {
            const { Room } = await getModels(req);
            const room = await Room.create(req.body);
            return successResponse(res, room, 'Room created successfully', 201);
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'A room with this number already exists', 409);
            }
            return errorResponse(res, 'Failed to create room', 500, error);
        }
    },
);

// PATCH /rooms/:id
router.patch(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ params: mongoIdParam, body: updateRoomSchema }),
    async (req, res) => {
        try {
            const { Room } = await getModels(req);
            const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });
            if (!room) return errorResponse(res, 'Room not found', 404);
            return successResponse(res, room, 'Room updated successfully');
        } catch (error) {
            if (error.code === 11000) {
                return errorResponse(res, 'A room with this number already exists', 409);
            }
            return errorResponse(res, 'Failed to update room', 500, error);
        }
    },
);

// PATCH /rooms/:id/status (For Housekeeping/Quick updates)
router.patch(
    '/:id/status',
    authMiddleware,
    authorize(['superuser', 'admin', 'user']),
    async (req, res) => {
        try {
            const { Room } = await getModels(req);
            const { status } = req.body;
            if (!['Available', 'Occupied', 'Dirty', 'Maintenance'].includes(status)) {
                return errorResponse(res, 'Invalid status', 400);
            }
            const room = await Room.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true, runValidators: true },
            );
            if (!room) return errorResponse(res, 'Room not found', 404);
            return successResponse(res, room, 'Room status updated successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to update room status', 500, error);
        }
    },
);

// DELETE /rooms/:id
router.delete(
    '/:id',
    authMiddleware,
    authorize(['superuser', 'admin']),
    validate({ params: mongoIdParam }),
    async (req, res) => {
        try {
            const { Room, Booking } = await getModels(req);
            const activeBooking = await Booking.findOne({
                room: req.params.id,
                status: { $in: ['Confirmed', 'CheckedIn'] },
            });
            if (activeBooking) {
                return errorResponse(res, 'Cannot delete room with active bookings', 409);
            }
            const room = await Room.findByIdAndDelete(req.params.id);
            if (!room) return errorResponse(res, 'Room not found', 404);
            return successResponse(res, room, 'Room deleted successfully');
        } catch (error) {
            return errorResponse(res, 'Failed to delete room', 500, error);
        }
    },
);

module.exports = router;

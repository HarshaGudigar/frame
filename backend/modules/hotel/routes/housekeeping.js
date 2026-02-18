const express = require('express');
const router = express.Router();
const getModels = require('../getModels');
const { validate } = require('../../../middleware/validate');
const { authMiddleware } = require('../../../middleware/authMiddleware');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const {
    createHousekeepingTaskSchema,
    updateHousekeepingTaskStatusSchema,
    mongoIdParam,
} = require('../schemas');

/**
 * @route   POST /api/hotel/housekeeping
 * @desc    Create a new housekeeping task
 * @access  Private (Hotel Staff)
 */
router.post(
    '/',
    authMiddleware,
    validate({ body: createHousekeepingTaskSchema }),
    async (req, res) => {
        try {
            const { HousekeepingTask, Room } = await getModels(req);
            const { roomId, ...taskData } = req.body;

            const room = await Room.findById(roomId);
            if (!room) return errorResponse(res, 'Room not found', 404);

            const task = await HousekeepingTask.create({
                room: roomId,
                ...taskData,
            });

            return successResponse(res, task, 'Housekeeping task created', 201);
        } catch (err) {
            console.error(err);
            return errorResponse(res, 'Server error creating housekeeping task', 500, err);
        }
    },
);

/**
 * @route   GET /api/hotel/housekeeping
 * @desc    Get all housekeeping tasks
 * @access  Private (Hotel Staff)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { HousekeepingTask } = await getModels(req);
        const { status, roomId, staffName } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (roomId) filters.room = roomId;
        if (staffName) filters.staffName = new RegExp(staffName, 'i');

        const tasks = await HousekeepingTask.find(filters).populate('room').sort({ createdAt: -1 });
        return successResponse(res, tasks);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 'Server error fetching housekeeping tasks', 500, err);
    }
});

/**
 * @route   PATCH /api/hotel/housekeeping/:id/status
 * @desc    Update housekeeping task status
 * @access  Private (Hotel Staff)
 */
router.patch(
    '/:id/status',
    authMiddleware,
    validate({ params: mongoIdParam, body: updateHousekeepingTaskStatusSchema }),
    async (req, res) => {
        try {
            const { HousekeepingTask, Room } = await getModels(req);
            const { status, notes } = req.body;

            const task = await HousekeepingTask.findById(req.params.id);
            if (!task) return errorResponse(res, 'Task not found', 404);

            task.status = status;
            if (notes) task.notes = notes;
            if (status === 'Completed') {
                task.completedAt = new Date();

                const room = await Room.findById(task.room);
                if (room && room.status === 'Dirty') {
                    room.status = 'Available';
                    await room.save();
                }
            }

            await task.save();
            return successResponse(res, task, 'Task status updated');
        } catch (err) {
            console.error(err);
            return errorResponse(res, 'Server error updating task status', 500, err);
        }
    },
);

/**
 * @route   DELETE /api/hotel/housekeeping/:id
 * @desc    Delete a housekeeping task
 * @access  Private (Admin)
 */
router.delete('/:id', authMiddleware, validate({ params: mongoIdParam }), async (req, res) => {
    try {
        const { HousekeepingTask } = await getModels(req);
        const task = await HousekeepingTask.findByIdAndDelete(req.params.id);
        if (!task) return errorResponse(res, 'Task not found', 404);
        return successResponse(res, { message: 'Housekeeping task deleted' });
    } catch (err) {
        console.error(err);
        return errorResponse(res, 'Server error deleting task', 500, err);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authMiddleware } = require('../../../middleware/authMiddleware');
const { validate } = require('../../../middleware/validate');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');
const getModels = require('../getModels');
const {
    createBookingServiceSchema,
    updateBookingServiceSchema,
    bookingIdParam,
    bookingServiceIdParam,
} = require('../schemas');

// GET /bookings/:bookingId/services
router.get('/', authMiddleware, validate({ params: bookingIdParam }), async (req, res) => {
    try {
        const { BookingService, Booking } = await getModels(req);
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return errorResponse(res, 'Booking not found', 404);

        const services = await BookingService.find({ booking: req.params.bookingId })
            .populate('service')
            .sort({ createdAt: -1 });
        return successResponse(res, services);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch booking services', 500, error);
    }
});

// POST /bookings/:bookingId/services
router.post(
    '/',
    authMiddleware,
    validate({ params: bookingIdParam, body: createBookingServiceSchema }),
    async (req, res) => {
        try {
            const { BookingService, Booking, Service } = await getModels(req);
            const booking = await Booking.findById(req.params.bookingId);
            if (!booking) return errorResponse(res, 'Booking not found', 404);

            const service = await Service.findById(req.body.serviceId);
            if (!service) return errorResponse(res, 'Service not found', 404);

            const price = service.rate;
            const totalAmount = price * req.body.quantity;

            const bookingService = await BookingService.create({
                booking: req.params.bookingId,
                service: req.body.serviceId,
                quantity: req.body.quantity,
                price,
                totalAmount,
                notes: req.body.notes,
            });

            const populated = await BookingService.findById(bookingService._id).populate('service');
            return successResponse(res, populated, 'Service added to booking', 201);
        } catch (error) {
            return errorResponse(res, 'Failed to add service to booking', 500, error);
        }
    },
);

// PATCH /bookings/:bookingId/services/:id
router.patch(
    '/:id',
    authMiddleware,
    validate({ params: bookingServiceIdParam, body: updateBookingServiceSchema }),
    async (req, res) => {
        try {
            const { BookingService } = await getModels(req);
            const bs = await BookingService.findOne({
                _id: req.params.id,
                booking: req.params.bookingId,
            });
            if (!bs) return errorResponse(res, 'Booking service not found', 404);

            if (req.body.quantity !== undefined) {
                bs.quantity = req.body.quantity;
                bs.totalAmount = bs.price * bs.quantity;
            }
            if (req.body.notes !== undefined) {
                bs.notes = req.body.notes;
            }
            await bs.save();

            const populated = await BookingService.findById(bs._id).populate('service');
            return successResponse(res, populated, 'Booking service updated');
        } catch (error) {
            return errorResponse(res, 'Failed to update booking service', 500, error);
        }
    },
);

// DELETE /bookings/:bookingId/services/:id
router.delete(
    '/:id',
    authMiddleware,
    validate({ params: bookingServiceIdParam }),
    async (req, res) => {
        try {
            const { BookingService } = await getModels(req);
            const bs = await BookingService.findOneAndDelete({
                _id: req.params.id,
                booking: req.params.bookingId,
            });
            if (!bs) return errorResponse(res, 'Booking service not found', 404);
            return successResponse(res, bs, 'Service removed from booking');
        } catch (error) {
            return errorResponse(res, 'Failed to remove service from booking', 500, error);
        }
    },
);

module.exports = router;

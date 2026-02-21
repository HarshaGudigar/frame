const express = require('express');
const router = express.Router();
const getModels = require('../getModels');
const { authMiddleware } = require('../../../middleware/authMiddleware');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');

/**
 * @route   GET /api/hotel/reports/summary
 * @desc    Get key performance indicators (Occupancy, ADR, RevPAR)
 * @access  Private (Admin/Manager)
 */
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const { Room, Booking } = await getModels(req);

        // 1. Occupancy Data (Current)
        const totalRooms = await Room.countDocuments();
        const occupiedRooms = await Room.countDocuments({ status: 'Occupied' });
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

        // 2. Revenue Data (Today/Recent)
        // For simplicity, we'll look at CheckedIn/CheckedOut bookings for "today"
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Fetch bookings that are active today
        const activeBookings = await Booking.find({
            status: { $in: ['CheckedIn', 'CheckedOut'] },
            $or: [{ checkInDate: { $lte: endOfToday }, checkOutDate: { $gte: startOfToday } }],
        });

        const totalRevenueToday = activeBookings.reduce((sum, b) => {
            // Calculate daily revenue share for this booking
            const dailyRate = b.totalRoomRent / b.numberOfDays;
            return sum + dailyRate;
        }, 0);

        const _roomsSoldToday = activeBookings.length; // Actually should be count of rooms across these bookings
        const totalRoomsSoldToday = activeBookings.reduce((sum, b) => sum + b.rooms.length, 0);

        const adr = totalRoomsSoldToday > 0 ? totalRevenueToday / totalRoomsSoldToday : 0;
        const revpar = totalRooms > 0 ? totalRevenueToday / totalRooms : 0;

        return successResponse(res, {
            metrics: {
                occupancyRate: Math.round(occupancyRate * 100) / 100,
                occupiedRooms,
                totalRooms,
                totalRevenueToday: Math.round(totalRevenueToday * 100) / 100,
                adr: Math.round(adr * 100) / 100,
                revpar: Math.round(revpar * 100) / 100,
                totalRoomsSoldToday,
            },
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Failed to generate report summary', 500, error);
    }
});

/**
 * @route   GET /api/hotel/reports/trends
 * @desc    Get 7-day performance trends (Revenue & Occupancy)
 * @access  Private (Admin/Manager)
 */
router.get('/trends', authMiddleware, async (req, res) => {
    try {
        const { Room, Booking } = await getModels(req);
        const trends = [];
        const totalRooms = await Room.countDocuments();

        for (let i = 6; i >= 0; i--) {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - i);

            const end = new Date();
            end.setHours(23, 59, 59, 999);
            end.setDate(end.getDate() - i);

            const bookings = await Booking.find({
                status: { $in: ['CheckedIn', 'CheckedOut'] },
                $or: [{ checkInDate: { $lte: end }, checkOutDate: { $gte: start } }],
            });

            const revenue = bookings.reduce((sum, b) => {
                const dailyRate = (b.totalRoomRent || b.totalAmount || 0) / (b.numberOfDays || 1);
                return sum + dailyRate;
            }, 0);

            const roomsSold = bookings.reduce((sum, b) => sum + (b.rooms?.length || 1), 0);
            const occupancy = totalRooms > 0 ? (roomsSold / totalRooms) * 100 : 0;

            trends.push({
                date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: Math.round(revenue * 100) / 100,
                occupancy: Math.round(occupancy * 100) / 100,
            });
        }

        return successResponse(res, { trends });
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Failed to fetch trends', 500, error);
    }
});

module.exports = router;

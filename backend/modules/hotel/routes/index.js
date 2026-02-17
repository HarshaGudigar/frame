const express = require('express');
const router = express.Router();

const roomsRouter = require('./rooms');
const customersRouter = require('./customers');
const bookingsRouter = require('./bookings');
const bookingServicesRouter = require('./booking-services');
const servicesRouter = require('./services');
const agentsRouter = require('./agents');
const settingsRouter = require('./settings');
const businessInfoRouter = require('./business-info');
const transactionsRouter = require('./transactions');
const transactionCategoriesRouter = require('./transaction-categories');
const uploadsRouter = require('./uploads');

router.use('/rooms', roomsRouter);
router.use('/customers', customersRouter);
router.use('/bookings', bookingsRouter);
router.use('/bookings/:bookingId/services', bookingServicesRouter);
router.use('/services', servicesRouter);
router.use('/agents', agentsRouter);
router.use('/settings', settingsRouter);
router.use('/business-info', businessInfoRouter);
router.use('/transactions', transactionsRouter);
router.use('/transaction-categories', transactionCategoriesRouter);
router.use('/uploads', uploadsRouter);

module.exports = router;

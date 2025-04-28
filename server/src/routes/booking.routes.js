const express = require('express');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  assignPhotographer,
  updateBooking,
  cancelBooking,
  handleCalendlyWebhook,
  getMyBookings
} = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public webhook route
router.post('/calendly-webhook', handleCalendlyWebhook);

// User routes
router.get('/mybookings', protect, getMyBookings);
router.post('/', protect, createBooking);
router.put('/:id/cancel', protect, cancelBooking);

// Standard routes with protection
router.route('/:id')
  .get(protect, getBooking)
  .put(protect, updateBooking);

// Admin routes
router.get('/', protect, getBookings);
router.put('/:id/status', protect, authorize('admin'), updateBookingStatus);
router.put('/:id/assign', protect, authorize('admin'), assignPhotographer);

module.exports = router;

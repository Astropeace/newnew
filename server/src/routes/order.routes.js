const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  createPaymentIntent,
  handleStripeWebhook,
  getMyOrders
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public webhook route (needs to be raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// User routes
router.get('/myorders', protect, getMyOrders);
router.post('/create-payment-intent', protect, createPaymentIntent);

// Standard routes
router.route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/:id')
  .get(protect, getOrder);

// Admin routes
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);

module.exports = router;

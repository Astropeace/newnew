const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  products: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true
      },
      name: String,
      price: Number,
      quantity: {
        type: Number,
        default: 1,
        min: [1, 'Quantity must be at least 1']
      }
    }
  ],
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  paymentInfo: {
    type: {
      type: String,
      enum: ['stripe', 'paypal'],
      default: 'stripe'
    },
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for order number (based on timestamp and user ID)
orderSchema.virtual('orderNumber').get(function() {
  return `ORD-${this.createdAt.getTime().toString().slice(-6)}-${this._id.toString().slice(-4)}`;
});

// Create index for efficient user-based lookups
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  sessionType: {
    type: String,
    enum: ['portrait', 'wedding', 'event', 'family', 'commercial', 'other'],
    required: [true, 'Please specify the session type']
  },
  date: {
    type: Date,
    required: [true, 'Please provide a booking date']
  },
  timeSlot: {
    start: {
      type: Date,
      required: [true, 'Please provide a start time']
    },
    end: {
      type: Date,
      required: [true, 'Please provide an end time']
    }
  },
  location: {
    type: String,
    required: [true, 'Please provide a location'],
    trim: true
  },
  additionalDetails: {
    numberOfPeople: Number,
    specialRequirements: String,
    preferredStyle: String,
    outfitChanges: Number
  },
  photographer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  payment: {
    amount: {
      type: Number,
      required: [true, 'Please specify the payment amount'],
      min: [0, 'Payment amount cannot be negative']
    },
    deposit: {
      type: Number,
      default: 0,
      min: [0, 'Deposit cannot be negative']
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    method: {
      type: String,
      enum: ['credit_card', 'paypal', 'cash', 'bank_transfer'],
      default: 'credit_card'
    },
    transactionId: String
  },
  calendlyEventId: String,
  notes: String,
  deliverables: {
    digitalImages: {
      type: Number,
      default: 0
    },
    printedPhotos: {
      type: Number,
      default: 0
    },
    albumPages: {
      type: Number,
      default: 0
    },
    videoLength: {
      type: Number, // in minutes
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for booking reference number
bookingSchema.virtual('referenceNumber').get(function() {
  return `BK-${this.date.getFullYear()}${(this.date.getMonth() + 1).toString().padStart(2, '0')}${this.date.getDate().toString().padStart(2, '0')}-${this._id.toString().slice(-4)}`;
});

// Index for efficient lookups
bookingSchema.index({ client: 1, date: 1 });
bookingSchema.index({ photographer: 1, date: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

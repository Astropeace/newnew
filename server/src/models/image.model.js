const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an image title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    enum: ['portrait', 'wedding', 'nature', 'event', 'other'],
    required: [true, 'Please provide a category']
  },
  tags: [String],
  imageUrl: {
    type: String,
    required: [true, 'Please provide an image URL']
  },
  thumbnailUrl: {
    type: String
  },
  originalFilename: String,
  size: Number,
  width: Number,
  height: Number,
  format: String,
  location: {
    type: String,
    trim: true
  },
  dateTaken: Date,
  featured: {
    type: Boolean,
    default: false
  },
  inPortfolio: {
    type: Boolean,
    default: true
  },
  isForSale: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for search functionality
imageSchema.index({ title: 'text', description: 'text', tags: 'text', category: 'text' });

module.exports = mongoose.model('Image', imageSchema);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const imageRoutes = require('./routes/image.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const bookingRoutes = require('./routes/booking.routes');
const importRoutes = require('./routes/import.routes');

// Create Express app
const app = express();

// Middleware
app.use(morgan('dev'));
app.use(cors());

// Parse JSON body for all routes except Stripe webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/orders/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

// Cookie parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Serve static files from the public directory
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/import', importRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

module.exports = app;

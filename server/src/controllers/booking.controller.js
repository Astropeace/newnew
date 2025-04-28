const axios = require('axios');
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const { ErrorResponse } = require('../middleware/error.middleware');

/**
 * @desc    Get all bookings
 * @route   GET /api/bookings
 * @access  Private/Admin
 */
exports.getBookings = async (req, res, next) => {
  try {
    let query;

    // If user is not admin, only show their bookings
    if (req.user.role !== 'admin') {
      query = Booking.find({ client: req.user.id });
    } else {
      query = Booking.find();
    }

    // Sort by date (descending)
    query = query.sort('-date');

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Booking.countDocuments();

    query = query.skip(startIndex).limit(limit)
      .populate('client', 'name email phone')
      .populate('photographer', 'name email');

    // Executing query
    const bookings = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single booking
 * @route   GET /api/bookings/:id
 * @access  Private
 */
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('photographer', 'name email');

    if (!booking) {
      return next(new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is booking owner, photographer, or admin
    if (
      booking.client._id.toString() !== req.user.id && 
      (booking.photographer ? booking.photographer._id.toString() !== req.user.id : true) && 
      req.user.role !== 'admin'
    ) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this booking`, 401));
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new booking
 * @route   POST /api/bookings
 * @access  Private
 */
exports.createBooking = async (req, res, next) => {
  try {
    const {
      sessionType,
      date,
      timeSlot,
      location,
      additionalDetails,
      payment,
      calendlyEventId
    } = req.body;

    // Check required fields
    if (!sessionType || !date || !timeSlot || !location || !payment) {
      return next(new ErrorResponse('Please provide all required booking details', 400));
    }

    // Create booking
    const booking = await Booking.create({
      client: req.user.id,
      sessionType,
      date: new Date(date),
      timeSlot: {
        start: new Date(timeSlot.start),
        end: new Date(timeSlot.end)
      },
      location,
      additionalDetails: additionalDetails || {},
      payment,
      calendlyEventId,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update booking status
 * @route   PUT /api/bookings/:id/status
 * @access  Private/Admin
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404));
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign photographer to booking
 * @route   PUT /api/bookings/:id/assign
 * @access  Private/Admin
 */
exports.assignPhotographer = async (req, res, next) => {
  try {
    const { photographerId } = req.body;

    if (!photographerId) {
      return next(new ErrorResponse('Please provide a photographer ID', 400));
    }

    // Check if photographer exists
    const photographer = await User.findById(photographerId);

    if (!photographer || photographer.role !== 'admin') {
      return next(new ErrorResponse(`Photographer not found with id of ${photographerId}`, 404));
    }

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404));
    }

    // Assign photographer
    booking.photographer = photographerId;
    booking = await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update booking details
 * @route   PUT /api/bookings/:id
 * @access  Private
 */
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is booking owner or admin
    if (booking.client.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this booking`, 401));
    }

    // Don't allow updating if booking is already confirmed or completed
    if (['confirmed', 'completed'].includes(booking.status) && req.user.role !== 'admin') {
      return next(new ErrorResponse(`Cannot update a booking that is already ${booking.status}`, 400));
    }

    // Update fields
    const updateFields = {
      sessionType: req.body.sessionType,
      date: req.body.date ? new Date(req.body.date) : undefined,
      timeSlot: req.body.timeSlot ? {
        start: new Date(req.body.timeSlot.start),
        end: new Date(req.body.timeSlot.end)
      } : undefined,
      location: req.body.location,
      additionalDetails: req.body.additionalDetails,
      notes: req.body.notes
    };

    // Filter out undefined fields
    Object.keys(updateFields).forEach(
      key => updateFields[key] === undefined && delete updateFields[key]
    );

    // Update booking
    booking = await Booking.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is booking owner or admin
    if (booking.client.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to cancel this booking`, 401));
    }

    // Don't allow cancelling if booking is already completed
    if (booking.status === 'completed') {
      return next(new ErrorResponse('Cannot cancel a completed booking', 400));
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking = await booking.save();

    // If integrated with Calendly and there's an event ID, cancel it there too
    if (booking.calendlyEventId && process.env.CALENDLY_API_KEY) {
      try {
        await axios.post(
          `https://api.calendly.com/scheduled_events/${booking.calendlyEventId}/cancellation`,
          {
            reason: req.body.cancellationReason || 'Cancelled by user'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`
            }
          }
        );
      } catch (err) {
        console.error('Failed to cancel Calendly event:', err);
        // Continue anyway, we've already cancelled in our system
      }
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle Calendly webhook
 * @route   POST /api/bookings/calendly-webhook
 * @access  Public
 */
exports.handleCalendlyWebhook = async (req, res, next) => {
  try {
    // Validate the webhook signature if needed
    
    const eventData = req.body;
    const eventType = eventData.event;

    // Handle different Calendly webhook events
    if (eventType === 'invitee.created') {
      // A new event was scheduled
      const payload = eventData.payload;
      
      // Find the user by email
      const user = await User.findOne({ email: payload.invitee.email });
      
      if (user) {
        // Create a new booking
        await Booking.create({
          client: user._id,
          sessionType: payload.event_type.name,
          date: new Date(payload.scheduled_event.start_time),
          timeSlot: {
            start: new Date(payload.scheduled_event.start_time),
            end: new Date(payload.scheduled_event.end_time)
          },
          location: payload.scheduled_event.location.location || 'To be determined',
          calendlyEventId: payload.scheduled_event.uuid,
          payment: {
            amount: 0, // To be updated later
            isPaid: false
          },
          status: 'pending'
        });
      }
    } else if (eventType === 'invitee.canceled') {
      // An event was canceled
      const payload = eventData.payload;
      
      // Find and update the booking
      const booking = await Booking.findOne({ calendlyEventId: payload.scheduled_event.uuid });
      
      if (booking) {
        booking.status = 'cancelled';
        await booking.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my bookings
 * @route   GET /api/bookings/mybookings
 * @access  Private
 */
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ client: req.user.id })
      .sort('-date')
      .populate('photographer', 'name email');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

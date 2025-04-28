const User = require('../models/user.model');
const { ErrorResponse } = require('../middleware/error.middleware');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'user' : role // Prevent creating admin users directly
    });

    // Send response with token
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    console.log('AUTH CONTROLLER - Login attempt:', { email: req.body.email });
    
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      console.log('AUTH CONTROLLER - Login failed: missing email or password');
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('AUTH CONTROLLER - Login failed: user not found');
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    console.log('AUTH CONTROLLER - Password match result:', isMatch);

    if (!isMatch) {
      console.log('AUTH CONTROLLER - Login failed: incorrect password');
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    console.log('AUTH CONTROLLER - Login successful for user:', {
      userId: user._id,
      userEmail: user.email,
      userRole: user.role
    });
    
    // Send response with token
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('AUTH CONTROLLER - Login error:', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/updateprofile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address
    };

    // Filter out undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Check if passwords are provided
    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse('Please provide current and new password', 400));
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
      return next(new ErrorResponse('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get token from model, create cookie and send response
 */
const sendTokenResponse = (user, statusCode, res) => {
  console.log('AUTH CONTROLLER - Generating token response for user:', {
    userId: user._id,
    userRole: user.role,
    cookieExpirySet: !!process.env.JWT_COOKIE_EXPIRE
  });

  try {
    // Create token
    const token = user.getSignedJwtToken();
    console.log('AUTH CONTROLLER - Token generated successfully');

    const cookieExpireDays = parseInt(process.env.JWT_COOKIE_EXPIRE) || 7;
    console.log('AUTH CONTROLLER - Cookie expire days:', cookieExpireDays);

    const options = {
      expires: new Date(
        Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    // Add secure flag in production
    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
      console.log('AUTH CONTROLLER - Added secure flag to cookie (production mode)');
    }

    console.log('AUTH CONTROLLER - Sending token in both cookie and JSON response');
    
    res
      .status(statusCode)
      .cookie('token', token, options)
      .json({
        success: true,
        token
      });
  } catch (error) {
    console.error('AUTH CONTROLLER - Token response error:', {
      errorName: error.name,
      errorMessage: error.message
    });
    throw error;
  }
};

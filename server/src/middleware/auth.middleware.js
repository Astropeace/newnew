const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Log JWT configuration on module load
console.log('AUTH MIDDLEWARE - JWT Configuration Check:', {
  secretExists: !!process.env.JWT_SECRET,
  secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
  expiryValue: process.env.JWT_EXPIRES_IN || 'not set'
});

/**
 * Protect routes - Verify user is authenticated
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    console.log('AUTH MIDDLEWARE - Request received:', {
      hasAuthHeader: !!req.headers.authorization,
      hasBearerToken: req.headers.authorization?.startsWith('Bearer') || false,
      hasCookieToken: !!(req.cookies && req.cookies.token)
    });

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('AUTH MIDDLEWARE - Using bearer token from header');
    } else if (req.cookies && req.cookies.token) {
      // Get token from cookie
      token = req.cookies.token;
      console.log('AUTH MIDDLEWARE - Using token from cookie');
    }

    // Check if token exists
    if (!token) {
      console.log('AUTH MIDDLEWARE - No token found in request');
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Log token verification attempt
      console.log('AUTH MIDDLEWARE - Verifying token with secret length:', process.env.JWT_SECRET?.length || 0);
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('AUTH MIDDLEWARE - Token verified successfully:', {
        userId: decoded.id,
        userRole: decoded.role,
        tokenExp: new Date(decoded.exp * 1000)
      });

      // Add user to request
      req.user = await User.findById(decoded.id);
      console.log('AUTH MIDDLEWARE - User found in database:', !!req.user);

      next();
    } catch (error) {
      console.error('AUTH MIDDLEWARE - Token verification failed:', {
        errorName: error.name,
        errorMessage: error.message
      });
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('AUTH MIDDLEWARE - Unexpected error:', error);
    next(error);
  }
};

/**
 * Authorize specific roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    next();
  };
};

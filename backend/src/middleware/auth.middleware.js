// =============================================================================
// ISKOlarship - Authentication Middleware
// JWT verification and role-based access control
// =============================================================================

const jwt = require('jsonwebtoken');
const { User, UserRole, AdminAccessLevel } = require('../models');

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    } catch (err) {
      // Token invalid, but that's okay for optional auth
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Admin access level middleware
 * @param {string} requiredLevel - Minimum access level required
 */
const requireAdminLevel = (requiredLevel) => {
  const levelHierarchy = {
    [AdminAccessLevel.VIEWER]: 0,
    [AdminAccessLevel.REVIEWER]: 1,
    [AdminAccessLevel.MANAGER]: 2,
    [AdminAccessLevel.SUPER_ADMIN]: 3
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const userLevel = req.user.adminProfile?.accessLevel || AdminAccessLevel.VIEWER;
    const userLevelValue = levelHierarchy[userLevel];
    const requiredLevelValue = levelHierarchy[requiredLevel];

    if (userLevelValue < requiredLevelValue) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${requiredLevel} level or higher required.`
      });
    }

    next();
  };
};

/**
 * Verify user owns the resource or is admin
 * @param {function} getResourceOwnerId - Function to extract owner ID from request
 */
const requireOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admins can access anything
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check if user owns the resource
    const ownerId = await getResourceOwnerId(req);
    
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Rate limiting for sensitive operations
 */
const rateLimitMap = new Map();

const rateLimit = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitMap.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  requireAdminLevel,
  requireOwnerOrAdmin,
  rateLimit
};

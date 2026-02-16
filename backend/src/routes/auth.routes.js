// =============================================================================
// ISKOlarship - Authentication Routes
// Handles user registration, login, logout, password reset
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User, UserRole } = require('../models');
const { authMiddleware, optionalAuth } = require('../middleware/auth.middleware');
const { generateOTP, sendOTPEmail, sendVerificationEmail } = require('../services/email.service');

// =============================================================================
// Validation Rules
// =============================================================================

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('middleName')
    .optional()
    .trim(),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// =============================================================================
// Helper Functions
// =============================================================================

const generateToken = (userId, expiresIn = '7d') => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

// =============================================================================
// Routes
// =============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, middleName, lastName, role = UserRole.STUDENT } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user with initialized studentProfile for students
    const userData = {
      email,
      password,
      firstName,
      lastName,
      role
    };
    
    // Initialize studentProfile for student users
    if (role === UserRole.STUDENT) {
      userData.studentProfile = {
        firstName,
        middleName: middleName || '',
        lastName,
        profileCompleted: false,
        hasExistingScholarship: false,
        hasThesisGrant: false,
        hasDisciplinaryAction: false
      };
    }
    
    // Initialize adminProfile for admin users
    if (role === UserRole.ADMIN) {
      userData.adminProfile = {
        firstName,
        middleName: middleName || '',
        lastName,
        accessLevel: 'academic_unit', // Default to academic unit level
        permissions: [
          'manage_scholarships',
          'review_applications',
          'view_analytics'
        ] // Default permissions for new admins
      };
    }
    
    const user = new User(userData);

    await user.save();

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update user with refresh token
    user.refreshTokens.push({ token: refreshToken });
    user.lastLoginAt = new Date();
    await user.save();

    // Send verification email (fire-and-forget — never block registration)
    const verifyToken = jwt.sign(
      { userId: user._id, type: 'email_verify' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    User.findByIdAndUpdate(user._id, {
      emailVerificationToken: verifyToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }).then(() => {
      sendVerificationEmail(user.email, verifyToken, user.firstName || userData.firstName)
        .catch(err => console.error('Failed to send verification email (non-critical):', err.message));
    }).catch(err => console.error('Failed to save verification token:', err.message));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // --- 2FA: Generate and send OTP ---
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP on user (these are select: false fields, use findByIdAndUpdate)
    await User.findByIdAndUpdate(user._id, {
      otpCode: otp,
      otpExpires,
      otpAttempts: 0
    });

    // Determine first name for email personalization
    const firstName = user.firstName || 
      user.studentProfile?.firstName || 
      user.adminProfile?.firstName || 
      'User';

    // Send OTP email
    await sendOTPEmail(email, otp, firstName);

    // Return requiresOTP flag instead of tokens
    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        requiresOTP: true,
        email: email,
        // Mask email for display: j***@example.com
        maskedEmail: email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => 
          first + '*'.repeat(Math.min(middle.length, 5)) + domain
        )
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code and return tokens (2FA step 2)
 * @access  Public
 */
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('A valid 6-digit OTP is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    // Find user with OTP fields
    const user = await User.findOne({ email }).select('+otpCode +otpExpires +otpAttempts');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if OTP has expired
    if (!user.otpExpires || new Date() > user.otpExpires) {
      return res.status(401).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
        data: { expired: true }
      });
    }

    // Check attempt limit (max 5 attempts)
    if (user.otpAttempts >= 5) {
      // Clear OTP to force re-login
      await User.findByIdAndUpdate(user._id, {
        otpCode: null,
        otpExpires: null,
        otpAttempts: 0
      });
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please sign in again.',
        data: { tooManyAttempts: true }
      });
    }

    // Verify OTP
    if (user.otpCode !== otp) {
      // Increment attempts
      await User.findByIdAndUpdate(user._id, {
        otpAttempts: (user.otpAttempts || 0) + 1
      });
      const remaining = 5 - ((user.otpAttempts || 0) + 1);
      return res.status(401).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      });
    }

    // OTP is valid — clear it and generate tokens
    await User.findByIdAndUpdate(user._id, {
      otpCode: null,
      otpExpires: null,
      otpAttempts: 0
    });

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update user login info
    // Re-fetch user without select: false fields for session update
    const freshUser = await User.findById(user._id);
    freshUser.refreshTokens.push({ token: refreshToken });
    freshUser.lastLoginAt = new Date();
    await freshUser.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: freshUser.getPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend a new OTP code
 * @access  Public
 */
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists, a new verification code has been sent.'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      otpCode: otp,
      otpExpires,
      otpAttempts: 0
    });

    const firstName = user.firstName || 
      user.studentProfile?.firstName || 
      user.adminProfile?.firstName || 
      'User';

    await sendOTPEmail(email, otp, firstName);

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email address from registration link
 * @access  Public
 */
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'email_verify') throw new Error('Invalid token type');
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.'
      });
    }

    // Find and update user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified',
        data: { alreadyVerified: true }
      });
    }

    user.isEmailVerified = true;
    await User.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    res.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'If an unverified account exists, a verification email has been sent.'
      });
    }

    const verifyToken = jwt.sign(
      { userId: user._id, type: 'email_verify' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken: verifyToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const firstName = user.firstName || 
      user.studentProfile?.firstName || 
      user.adminProfile?.firstName || 
      'User';

    await sendVerificationEmail(email, verifyToken, firstName);

    res.json({
      success: true,
      message: 'If an unverified account exists, a verification email has been sent.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove specific refresh token
      req.user.refreshTokens = req.user.refreshTokens.filter(
        t => t.token !== refreshToken
      );
    } else {
      // Clear all refresh tokens (logout from all devices)
      req.user.refreshTokens = [];
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is invalid'
      });
    }

    // Generate new access token
    const accessToken = generateToken(user._id);

    res.json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.getPublicProfile()
    }
  });
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a password reset link will be sent'
      });
    }

    // Generate reset token (in production, send via email)
    const resetToken = jwt.sign(
      { userId: user._id, type: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In production, send email with reset link
    // For now, just return success message
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account exists, a password reset link will be sent'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'reset') throw new Error('Invalid token type');
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find and update user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = password;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

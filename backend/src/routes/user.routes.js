// =============================================================================
// ISKOlarship - User Routes
// User profile management
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { User, UserRole, UPLBCollege, YearLevel, STBracket } = require('../models');
const { authMiddleware, requireRole, requireAdminLevel } = require('../middleware/auth.middleware');

// =============================================================================
// Validation Rules
// =============================================================================

const profileUpdateValidation = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('studentProfile.academicInfo.studentNumber').optional().trim(),
  body('studentProfile.academicInfo.college').optional().isIn(Object.values(UPLBCollege)),
  body('studentProfile.academicInfo.course').optional().trim(),
  body('studentProfile.academicInfo.yearLevel').optional().isIn(Object.values(YearLevel)),
  body('studentProfile.academicInfo.currentGWA').optional().isFloat({ min: 1, max: 5 }),
  body('studentProfile.financialInfo.annualFamilyIncome').optional().isNumeric(),
  body('studentProfile.financialInfo.stBracket').optional().isIn(Object.values(STBracket))
];

// =============================================================================
// User Profile Routes
// =============================================================================

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: req.user.getPublicProfile()
  });
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/profile', 
  authMiddleware, 
  profileUpdateValidation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const allowedUpdates = [
        'firstName',
        'lastName',
        'phone',
        'profilePicture'
      ];

      // Update basic fields
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          req.user[field] = req.body[field];
        }
      }

      // Update student profile if user is a student
      if (req.user.role === UserRole.STUDENT && req.body.studentProfile) {
        const { academicInfo, financialInfo, demographicInfo } = req.body.studentProfile;

        if (academicInfo) {
          req.user.studentProfile.academicInfo = {
            ...req.user.studentProfile.academicInfo?.toObject(),
            ...academicInfo
          };
        }

        if (financialInfo) {
          req.user.studentProfile.financialInfo = {
            ...req.user.studentProfile.financialInfo?.toObject(),
            ...financialInfo
          };
        }

        if (demographicInfo) {
          req.user.studentProfile.demographicInfo = {
            ...req.user.studentProfile.demographicInfo?.toObject(),
            ...demographicInfo
          };
        }
      }

      await req.user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: req.user.getPublicProfile()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/profile/completeness
 * @desc    Get profile completeness status
 * @access  Private
 */
router.get('/profile/completeness', authMiddleware, async (req, res) => {
  const completeness = req.user.isProfileComplete();
  
  res.json({
    success: true,
    data: completeness
  });
});

/**
 * @route   PUT /api/users/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select('+password');

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Admin Routes
// =============================================================================

/**
 * @route   GET /api/users
 * @desc    Get all users (admin)
 * @access  Admin
 */
router.get('/',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const {
        role,
        search,
        college,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      
      if (role) query.role = role;
      if (college) query['studentProfile.academicInfo.college'] = college;
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password -refreshTokens')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin)
 * @access  Admin
 */
router.get('/:id',
  authMiddleware,
  requireRole('admin'),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id)
        .select('-password -refreshTokens')
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (activate/deactivate)
 * @access  Admin
 */
router.put('/:id/status',
  authMiddleware,
  requireRole('admin'),
  requireAdminLevel('manager'),
  [
    param('id').isMongoId(),
    body('isActive').isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive },
        { new: true }
      ).select('-password -refreshTokens');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: `User ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/stats/overview
 * @desc    Get user statistics
 * @access  Admin
 */
router.get('/stats/overview',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const stats = await User.aggregate([
        {
          $facet: {
            byRole: [
              { $group: { _id: '$role', count: { $sum: 1 } } }
            ],
            byCollege: [
              { $match: { role: 'student' } },
              { $group: { _id: '$studentProfile.academicInfo.college', count: { $sum: 1 } } }
            ],
            byYearLevel: [
              { $match: { role: 'student' } },
              { $group: { _id: '$studentProfile.academicInfo.yearLevel', count: { $sum: 1 } } }
            ],
            recentRegistrations: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              { $project: { firstName: 1, lastName: 1, email: 1, role: 1, createdAt: 1 } }
            ]
          }
        }
      ]);

      const result = stats[0];

      res.json({
        success: true,
        data: {
          byRole: result.byRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
          byCollege: result.byCollege.reduce((acc, c) => ({ ...acc, [c._id || 'Unknown']: c.count }), {}),
          byYearLevel: result.byYearLevel.reduce((acc, y) => ({ ...acc, [y._id || 'Unknown']: y.count }), {}),
          recentRegistrations: result.recentRegistrations
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

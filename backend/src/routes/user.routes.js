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
  // Flat studentProfile validation matching User.model.js
  body('studentProfile.studentNumber').optional().trim(),
  body('studentProfile.college').optional(),
  body('studentProfile.course').optional().trim(),
  body('studentProfile.classification').optional(),
  body('studentProfile.gwa').optional().isFloat({ min: 1, max: 5 }),
  body('studentProfile.annualFamilyIncome').optional().isNumeric(),
  body('studentProfile.stBracket').optional(),
  body('studentProfile.provinceOfOrigin').optional().trim(),
  body('studentProfile.householdSize').optional().isInt({ min: 1, max: 20 }),
  body('studentProfile.unitsEnrolled').optional().isInt({ min: 0, max: 30 }),
  body('studentProfile.unitsPassed').optional().isInt({ min: 0 }),
  body('studentProfile.citizenship').optional().trim()
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
      console.log('====== PROFILE UPDATE REQUEST ======');
      console.log('User ID:', req.user._id);
      console.log('User role:', req.user.role);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
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
        console.log('Processing studentProfile update...');
        const studentData = req.body.studentProfile;
        
        // Check for duplicate student number if being updated
        if (studentData.studentNumber) {
          const existingUser = await User.findOne({ 
            'studentProfile.studentNumber': studentData.studentNumber,
            _id: { $ne: req.user._id } // Exclude current user
          });
          
          if (existingUser) {
            console.log('Duplicate student number detected:', studentData.studentNumber);
            return res.status(409).json({
              success: false,
              message: 'This student number is already registered in the system.',
              error: 'DUPLICATE_STUDENT_NUMBER'
            });
          }
        }
        
        // Initialize studentProfile if it doesn't exist
        if (!req.user.studentProfile) {
          console.log('Initializing empty studentProfile');
          req.user.studentProfile = {};
        }

        // List of allowed studentProfile fields matching User.model.js
        const studentProfileFields = [
          'studentNumber',
          'firstName',
          'middleName',
          'lastName',
          'suffix',
          'homeAddress',
          'provinceOfOrigin',
          'college',
          'course',
          'major',
          'classification',
          'gwa',
          'unitsEnrolled',
          'unitsPassed',
          'annualFamilyIncome',
          'citizenship',
          'householdSize',
          'stBracket',
          'expectedGraduationYear',
          'expectedGraduationSemester',
          'contactNumber',
          'birthDate',
          'hasExistingScholarship',
          'existingScholarshipName',
          'hasThesisGrant',
          'hasDisciplinaryAction',
          'profileCompleted'
        ];

        // Update each field if present
        for (const field of studentProfileFields) {
          if (studentData[field] !== undefined) {
            req.user.studentProfile[field] = studentData[field];
          }
        }
        
        // Handle homeAddress as nested object
        if (studentData.homeAddress) {
          req.user.studentProfile.homeAddress = {
            ...req.user.studentProfile.homeAddress,
            ...studentData.homeAddress
          };
          console.log('Updated homeAddress:', req.user.studentProfile.homeAddress);
        }
        
        // Mark profile as completed if we have essential fields
        if (studentData.studentNumber && studentData.college && studentData.course) {
          req.user.studentProfile.profileCompleted = true;
          req.user.studentProfile.profileCompletedAt = new Date();
        }
        
        console.log('Final studentProfile before save:', JSON.stringify(req.user.studentProfile, null, 2));
      }

      // Update admin profile if user is an admin
      if (req.user.role === UserRole.ADMIN && req.body.adminProfile) {
        console.log('Processing adminProfile update...');
        const adminData = req.body.adminProfile;
        
        // Initialize adminProfile if it doesn't exist
        if (!req.user.adminProfile) {
          console.log('Initializing empty adminProfile');
          req.user.adminProfile = {};
        }

        // List of allowed adminProfile fields
        const adminProfileFields = [
          'firstName',
          'lastName',
          'department',
          'college',
          'position',
          'officeLocation',
          'accessLevel',
          'responsibilities',
          'canCreateScholarships',
          'canApproveApplications',
          'canManageUsers',
          'profileCompleted'
        ];

        // Update each field if present
        for (const field of adminProfileFields) {
          if (adminData[field] !== undefined) {
            req.user.adminProfile[field] = adminData[field];
          }
        }
        
        // Mark profile as completed if we have essential fields
        if (adminData.department && adminData.position) {
          req.user.adminProfile.profileCompleted = true;
          req.user.adminProfile.profileCompletedAt = new Date();
        }
        
        console.log('Final adminProfile before save:', JSON.stringify(req.user.adminProfile, null, 2));
      }

      await req.user.save();
      console.log('User saved successfully');
      console.log('Returning profile:', JSON.stringify(req.user.getPublicProfile(), null, 2));

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: req.user.getPublicProfile()
      });
    } catch (error) {
      console.error('Profile update error:', error);
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

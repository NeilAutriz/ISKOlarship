// =============================================================================
// ISKOlarship - User Routes
// User profile management
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { User, UserRole, UPLBCollege, YearLevel, STBracket } = require('../models');
const { authMiddleware, requireRole, requireAdminLevel } = require('../middleware/auth.middleware');
const { uploadMultiple, handleUploadError } = require('../middleware/upload.middleware');
const path = require('path');
const fs = require('fs');

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
 * @route   GET /api/users/debug-documents
 * @desc    Debug endpoint to check documents in database
 * @access  Private
 */
router.get('/debug-documents', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking documents for user:', req.user.email);
    console.log('🔍 DEBUG: User ID:', req.user._id);
    console.log('🔍 DEBUG: Documents in req.user:', req.user.studentProfile?.documents);
    
    // Fetch fresh from database
    const freshUser = await User.findById(req.user._id);
    console.log('🔍 DEBUG: Documents in fresh DB fetch:', freshUser.studentProfile?.documents);
    
    res.json({
      success: true,
      data: {
        userId: req.user._id,
        email: req.user.email,
        documentsInMemory: req.user.studentProfile?.documents || [],
        documentsInDB: freshUser.studentProfile?.documents || [],
        documentCount: freshUser.studentProfile?.documents?.length || 0,
        hasDocuments: !!freshUser.studentProfile?.documents && freshUser.studentProfile.documents.length > 0
      }
    });
  } catch (error) {
    console.error('❌ DEBUG endpoint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
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
      
      // CRITICAL DEBUG: Check documents in raw request body
      console.log('🚨 RAW REQUEST - studentProfile.documents exists?', !!req.body.studentProfile?.documents);
      console.log('🚨 RAW REQUEST - documents count:', req.body.studentProfile?.documents?.length || 0);
      if (req.body.studentProfile?.documents?.length > 0) {
        console.log('🚨 RAW REQUEST - First document:', {
          name: req.body.studentProfile.documents[0].name,
          type: req.body.studentProfile.documents[0].type,
          hasBase64: !!req.body.studentProfile.documents[0].base64,
          base64Length: req.body.studentProfile.documents[0].base64?.length || 0
        });
      }
      
      // Don't log full body if documents exist (too large), summarize instead
      if (req.body.studentProfile?.documents?.length > 0) {
        const bodySummary = {
          ...req.body,
          studentProfile: {
            ...req.body.studentProfile,
            documents: req.body.studentProfile.documents.map(d => ({
              name: d.name,
              type: d.type,
              hasBase64: !!d.base64,
              base64Length: d.base64?.length || 0,
              fileName: d.fileName
            }))
          }
        };
        console.log('Request body (documents summarized):', JSON.stringify(bodySummary, null, 2));
      } else {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
      }
      
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
        
        // DEBUG: Log college/academicUnit data received
        console.log('🏫 College/Academic Unit data received:');
        console.log('  - college:', studentData.college);
        console.log('  - collegeCode:', studentData.collegeCode);
        console.log('  - academicUnit:', studentData.academicUnit);
        console.log('  - academicUnitCode:', studentData.academicUnitCode);
        
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
          'collegeCode',
          'academicUnit',
          'academicUnitCode',
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
          'gender',
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
            // DEBUG: Log specific fields we care about
            if (['collegeCode', 'academicUnitCode', 'academicUnit'].includes(field)) {
              console.log(`📝 Setting ${field} = "${studentData[field]}"`);
            }
          }
        }
        
        // CRITICAL: Mark studentProfile as modified to ensure Mongoose saves all changes
        req.user.markModified('studentProfile');
        console.log('✅ Marked studentProfile as modified');
        
        // Handle homeAddress as nested object
        if (studentData.homeAddress) {
          req.user.studentProfile.homeAddress = {
            ...req.user.studentProfile.homeAddress,
            ...studentData.homeAddress
          };
          console.log('Updated homeAddress:', req.user.studentProfile.homeAddress);
        }
        
        // Handle documents array (for profile verification documents)
        console.log('🔍 Checking for documents in studentData...');
        console.log('studentData.documents:', studentData.documents);
        console.log('Is array?', Array.isArray(studentData.documents));
        console.log('Length:', studentData.documents?.length);
        
        if (studentData.documents !== undefined) {
          if (Array.isArray(studentData.documents) && studentData.documents.length > 0) {
            req.user.studentProfile.documents = studentData.documents.map(doc => {
              console.log('Processing document:', {
                name: doc.name,
                type: doc.type,
                hasBase64: !!doc.base64,
                base64Length: doc.base64?.length || 0,
                fileName: doc.fileName
              });
              return {
                name: doc.name || '',
                documentType: doc.type || 'other',
                url: doc.base64 || doc.url || '',
                fileName: doc.fileName || '',
                fileSize: doc.fileSize || 0,
                mimeType: doc.mimeType || '',
                uploadedAt: new Date()
              };
            });
            console.log('✅ Updated documents:', req.user.studentProfile.documents.length, 'document(s)');
            console.log('📄 Document details:', JSON.stringify(req.user.studentProfile.documents.map(d => ({
              name: d.name,
              type: d.documentType,
              fileName: d.fileName,
              fileSize: d.fileSize,
              urlLength: d.url?.length || 0,
              hasUrl: !!d.url
            })), null, 2));
            
            // CRITICAL: Mark the documents array as modified for Mongoose
            req.user.markModified('studentProfile.documents');
            console.log('🔄 Marked studentProfile.documents as modified');
          } else {
            console.log('⚠️ Documents array is empty or not an array');
            // Initialize empty array if not provided
            req.user.studentProfile.documents = [];
            req.user.markModified('studentProfile.documents');
          }
        } else {
          console.log('⚠️ No documents field in studentData');
        }
        
        // Mark profile as completed if we have essential fields
        if (studentData.studentNumber && studentData.college && studentData.course) {
          req.user.studentProfile.profileCompleted = true;
          req.user.studentProfile.profileCompletedAt = new Date();
        }
        
        console.log('=== FINAL STUDENT PROFILE BEFORE SAVE ===');
        console.log('🏫 College/Academic Unit fields:');
        console.log('  - college:', req.user.studentProfile.college);
        console.log('  - collegeCode:', req.user.studentProfile.collegeCode);
        console.log('  - academicUnit:', req.user.studentProfile.academicUnit);
        console.log('  - academicUnitCode:', req.user.studentProfile.academicUnitCode);
        console.log('Has documents?', !!req.user.studentProfile.documents);
        console.log('Documents count:', req.user.studentProfile.documents?.length || 0);
        if (req.user.studentProfile.documents && req.user.studentProfile.documents.length > 0) {
          console.log('Documents array:', JSON.stringify(req.user.studentProfile.documents.map(d => ({
            name: d.name,
            documentType: d.documentType,
            fileName: d.fileName,
            hasUrl: !!d.url,
            urlLength: d.url?.length || 0
          })), null, 2));
        }
        console.log('Full profile (documents truncated):', JSON.stringify({
          ...req.user.studentProfile,
          documents: req.user.studentProfile.documents?.map(d => '...')
        }, null, 2));
      }

      // Update admin profile if user is an admin
      if (req.user.role === UserRole.ADMIN && req.body.adminProfile) {
        console.log('Processing adminProfile update...');
        const adminData = req.body.adminProfile;
        
        // CRITICAL: Validate accessLevel and required scope fields for clean separation
        const accessLevel = adminData.accessLevel || req.user.adminProfile?.accessLevel;
        
        if (!accessLevel) {
          return res.status(400).json({
            success: false,
            message: 'Access level is required for admin profiles. Please select University, College, or Academic Unit level.'
          });
        }
        
        // Validate required scope fields based on access level
        const collegeCode = adminData.collegeCode || req.user.adminProfile?.collegeCode;
        const academicUnitCode = adminData.academicUnitCode || req.user.adminProfile?.academicUnitCode;
        
        if (accessLevel === 'college' && !collegeCode) {
          return res.status(400).json({
            success: false,
            message: 'College code is required for college-level admins.'
          });
        }
        
        if (accessLevel === 'academic_unit' && (!collegeCode || !academicUnitCode)) {
          return res.status(400).json({
            success: false,
            message: 'College code and academic unit code are required for academic unit-level admins.'
          });
        }
        
        // Initialize adminProfile if it doesn't exist
        if (!req.user.adminProfile) {
          console.log('Initializing adminProfile with provided accessLevel:', accessLevel);
          req.user.adminProfile = {
            accessLevel: accessLevel
          };
        }

        // List of allowed adminProfile fields
        const adminProfileFields = [
          'firstName',
          'middleName',
          'lastName',
          'college',      // Legacy field - auto-computed from collegeCode
          'collegeCode',
          'academicUnit', // Legacy field - auto-computed from academicUnitCode
          'academicUnitCode',
          'universityUnitCode',
          'position',
          'officeLocation',
          'responsibilities',
          'accessLevel',
          'profileCompleted'
        ];

        // Update each field if present
        for (const field of adminProfileFields) {
          if (adminData[field] !== undefined) {
            req.user.adminProfile[field] = adminData[field];
            // DEBUG: Log specific fields we care about
            if (['collegeCode', 'academicUnitCode', 'academicUnit', 'accessLevel'].includes(field)) {
              console.log(`📝 Admin setting ${field} = "${adminData[field]}"`);
            }
          }
        }
        
        // CRITICAL: Mark adminProfile as modified to ensure Mongoose saves all changes
        req.user.markModified('adminProfile');
        console.log('✅ Marked adminProfile as modified');
        
        // Handle address as nested object
        if (adminData.address) {
          req.user.adminProfile.address = {
            ...req.user.adminProfile.address,
            ...adminData.address
          };
          console.log('Updated admin address:', req.user.adminProfile.address);
        }
        
        // Handle permissions array
        if (adminData.permissions && Array.isArray(adminData.permissions)) {
          req.user.adminProfile.permissions = adminData.permissions;
          console.log('Updated admin permissions:', req.user.adminProfile.permissions);
        }
        
        // Handle documents array (for admin verification documents)
        console.log('🔍 Checking for documents in adminData...');
        console.log('adminData.documents:', adminData.documents);
        console.log('Is array?', Array.isArray(adminData.documents));
        console.log('Length:', adminData.documents?.length);
        
        if (adminData.documents !== undefined) {
          if (Array.isArray(adminData.documents) && adminData.documents.length > 0) {
            req.user.adminProfile.documents = adminData.documents.map(doc => {
              console.log('Processing admin document:', {
                name: doc.name,
                type: doc.type,
                hasBase64: !!doc.base64,
                base64Length: doc.base64?.length || 0,
                fileName: doc.fileName
              });
              return {
                name: doc.name || '',
                documentType: doc.type || 'other',
                filePath: doc.filePath || '',
                fileName: doc.fileName || '',
                fileSize: doc.fileSize || 0,
                mimeType: doc.mimeType || '',
                uploadedAt: new Date()
              };
            });
            console.log('✅ Updated admin documents:', req.user.adminProfile.documents.length, 'document(s)');
            
            // CRITICAL: Mark the documents array as modified for Mongoose
            req.user.markModified('adminProfile.documents');
            console.log('🔄 Marked adminProfile.documents as modified');
          } else {
            console.log('⚠️ Admin documents array is empty or not an array');
            // Initialize empty array if not provided
            req.user.adminProfile.documents = [];
            req.user.markModified('adminProfile.documents');
          }
        } else {
          console.log('⚠️ No documents field in adminData');
        }
        
        // Mark profile as completed if we have essential fields
        if (adminData.department && adminData.position) {
          req.user.adminProfile.profileCompleted = true;
          req.user.adminProfile.profileCompletedAt = new Date();
        }
        
        console.log('Final adminProfile before save:', JSON.stringify(req.user.adminProfile, null, 2));
      }

      await req.user.save();
      console.log('✅ User saved successfully');
      
      // CRITICAL DEBUG: Verify fields were actually saved by fetching fresh from DB
      const savedUser = await User.findById(req.user._id);
      console.log('🔎 FRESH DB FETCH - Verifying data in database:');
      console.log('  - collegeCode in DB:', savedUser.studentProfile?.collegeCode);
      console.log('  - academicUnitCode in DB:', savedUser.studentProfile?.academicUnitCode);
      console.log('  - Documents in database:', savedUser.studentProfile?.documents?.length || 0);
      if (savedUser.studentProfile?.documents?.length > 0) {
        console.log('✅ SUCCESS! Documents ARE in database:');
        savedUser.studentProfile.documents.forEach((doc, idx) => {
          console.log(`  DB Doc ${idx + 1}:`, {
            name: doc.name,
            type: doc.documentType,
            hasUrl: !!doc.url,
            urlLength: doc.url?.length || 0
          });
        });
      } else {
        console.log('❌ FAILURE! Documents NOT in database after save');
        console.log('❌ This means Mongoose did NOT persist the documents');
      }
      
      // Verify documents were saved
      if (req.user.role === UserRole.STUDENT && req.user.studentProfile?.documents) {
        console.log('📄 Documents in memory after save:', req.user.studentProfile.documents.length, 'document(s)');
        req.user.studentProfile.documents.forEach((doc, idx) => {
          console.log(`  Memory Doc ${idx + 1}:`, {
            name: doc.name,
            type: doc.documentType,
            hasUrl: !!doc.url,
            urlLength: doc.url?.length || 0
          });
        });
      }
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
      if (college) query['studentProfile.college'] = college;
      
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
              { $group: { _id: '$studentProfile.college', count: { $sum: 1 } } }
            ],
            byYearLevel: [
              { $match: { role: 'student' } },
              { $group: { _id: '$studentProfile.classification', count: { $sum: 1 } } }
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

// =============================================================================
// Document Upload Routes (Optimized File Storage)
// =============================================================================

/**
 * @route   POST /api/users/documents/upload
 * @desc    Upload profile documents (optimized approach - files stored on disk)
 * @access  Private (Student and Admin)
 */
router.post('/documents/upload',
  authMiddleware,
  (req, res, next) => {
    uploadMultiple(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      console.log('📤 Document upload request from user:', req.user.email, 'Role:', req.user.role);
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
          error: 'NO_FILES'
        });
      }

      console.log(`📄 Received ${req.files.length} file(s)`);

      // Process uploaded files and create document metadata
      const uploadedDocuments = req.files.map((file, index) => {
        const documentType = req.body.documentTypes ? 
          (Array.isArray(req.body.documentTypes) ? req.body.documentTypes[index] : req.body.documentTypes) : 
          'other';
        
        const documentName = req.body.documentNames ?
          (Array.isArray(req.body.documentNames) ? req.body.documentNames[index] : req.body.documentNames) :
          file.originalname;

        // Create relative path for storage
        const relativePath = `documents/${req.user._id}/${file.filename}`;

        console.log(`  📎 ${index + 1}. ${documentName} (${file.originalname}) - ${(file.size / 1024).toFixed(2)}KB`);

        return {
          name: documentName,
          documentType: documentType,
          filePath: relativePath,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };
      });

      // Handle based on user role
      if (req.user.role === UserRole.STUDENT) {
        // Update student's document list
        if (!req.user.studentProfile) {
          req.user.studentProfile = {};
        }
        
        if (!req.user.studentProfile.documents) {
          req.user.studentProfile.documents = [];
        }

        // Add new documents to existing array
        req.user.studentProfile.documents.push(...uploadedDocuments);
        
        // Mark as modified and save
        req.user.markModified('studentProfile.documents');
        await req.user.save();

        console.log(`✅ Successfully uploaded and saved ${uploadedDocuments.length} document(s) to studentProfile`);
      } else if (req.user.role === UserRole.ADMIN) {
        // Handle admin employee ID document
        console.log('🔧 Processing admin document upload...');
        console.log('   Current adminProfile:', req.user.adminProfile);
        
        if (!req.user.adminProfile) {
          console.log('   Creating new adminProfile object');
          req.user.adminProfile = {};
        }

        // For admin, we expect only employee_id document
        const employeeIdDoc = uploadedDocuments.find(doc => doc.documentType === 'employee_id');
        console.log('   Looking for employee_id document type...');
        console.log('   Found:', employeeIdDoc ? 'YES' : 'NO');
        
        if (employeeIdDoc) {
          // Initialize documents array if needed
          if (!req.user.adminProfile.documents) {
            req.user.adminProfile.documents = [];
          }
          
          const docData = {
            name: 'Employee ID',
            documentType: 'employee_id',
            fileName: employeeIdDoc.fileName,
            filePath: employeeIdDoc.filePath,
            fileSize: employeeIdDoc.fileSize,
            mimeType: employeeIdDoc.mimeType,
            uploadedAt: employeeIdDoc.uploadedAt
          };
          
          console.log('   Adding document to adminProfile.documents:', JSON.stringify(docData, null, 2));
          req.user.adminProfile.documents.push(docData);
          
          // Mark as modified and save
          req.user.markModified('adminProfile.documents');
          console.log('   Marked adminProfile.documents as modified');
          
          const savedUser = await req.user.save();
          console.log('   User saved successfully');
          
          // Verify it was saved
          console.log('   🔎 VERIFYING SAVE...');
          const freshUser = await User.findById(req.user._id);
          if (freshUser.adminProfile?.documents?.length > 0) {
            console.log('   ✅ SUCCESS! Document found in database after save');
            console.log('   📄 Documents count:', freshUser.adminProfile.documents.length);
            console.log('   📄 Latest document:', JSON.stringify(freshUser.adminProfile.documents[freshUser.adminProfile.documents.length - 1], null, 2));
          } else {
            console.log('   ❌ FAILURE! Document NOT in database after save');
            console.log('   This means Mongoose did NOT persist the document');
          }

          console.log(`✅ Successfully uploaded and saved employee ID document to adminProfile.documents`);
        } else {
          console.log('   ❌ No employee_id document type found in uploads');
          console.log('   Uploaded document types:', uploadedDocuments.map(d => d.documentType));
          return res.status(400).json({
            success: false,
            message: 'Employee ID document type required for admin uploads',
            error: 'INVALID_DOCUMENT_TYPE'
          });
        }
      }

      res.json({
        success: true,
        message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
        data: {
          documents: uploadedDocuments.map(doc => ({
            name: doc.name,
            documentType: doc.documentType,
            fileName: doc.fileName,
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            uploadedAt: doc.uploadedAt
          })),
          totalDocuments: req.user.role === UserRole.STUDENT ? 
            req.user.studentProfile.documents.length : 1
        }
      });
    } catch (error) {
      console.error('❌ Document upload error:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/documents/:documentId
 * @desc    Retrieve a specific document file
 * @access  Private
 */
router.get('/documents/:documentId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      
      console.log('📥 Document download request:', documentId, 'by user:', req.user.email);
      console.log('🔍 User role:', req.user.role);
      console.log('📁 Admin documents count:', req.user.adminProfile?.documents?.length || 0);

      // Find the document in user's profile
      let document;
      let userId;

      if (req.user.role === UserRole.STUDENT) {
        document = req.user.studentProfile?.documents?.id(documentId);
        userId = req.user._id;
      } else if (req.user.role === UserRole.ADMIN) {
        // Check if admin is trying to access their own document first
        // Try using .id() method first, then fallback to manual search
        let ownDocument = req.user.adminProfile?.documents?.id(documentId);
        
        console.log('🔍 Looking for document ID:', documentId);
        if (req.user.adminProfile?.documents) {
          console.log('📋 Available document IDs:', 
            req.user.adminProfile.documents.map(d => ({
              id: d._id?.toString(),
              fileName: d.fileName
            }))
          );
        }
        
        if (!ownDocument && req.user.adminProfile?.documents) {
          // Fallback: manually search through documents array
          ownDocument = req.user.adminProfile.documents.find(
            doc => doc._id && doc._id.toString() === documentId
          );
          console.log('🔍 Manual search result:', ownDocument ? 'Found!' : 'Not found');
        }
        
        if (ownDocument) {
          // Admin accessing their own document
          console.log('✅ Found admin own document:', ownDocument.fileName);
          document = ownDocument;
          userId = req.user._id;
        } else {
          // Admin accessing a student's document - requires studentId query param
          const studentId = req.query.studentId;
          
          if (!studentId) {
            console.log('❌ Document not in admin profile, no studentId provided');
            console.log('Admin documents:', req.user.adminProfile?.documents?.length || 0);
            return res.status(400).json({
              success: false,
              message: 'Document not found in your profile'
            });
          }
          
          const student = await User.findById(studentId);
          if (!student || student.role !== UserRole.STUDENT) {
            return res.status(404).json({
              success: false,
              message: 'Student not found'
            });
          }
          
          document = student.studentProfile?.documents?.id(documentId);
          userId = studentId;
        }
      }

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Construct file path
      const filePath = path.join(__dirname, '../../uploads', document.filePath);
      
      console.log('📂 File path:', filePath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('❌ File not found on disk:', filePath);
        return res.status(404).json({
          success: false,
          message: 'Document file not found on server'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
      res.setHeader('Content-Length', document.fileSize);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      console.log('✅ Document sent successfully');
    } catch (error) {
      console.error('❌ Document download error:', error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/users/documents/:documentId
 * @desc    Delete a specific document
 * @access  Private (Student only - own documents)
 */
router.delete('/documents/:documentId',
  authMiddleware,
  requireRole([UserRole.STUDENT]),
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      
      console.log('🗑️ Document delete request:', documentId, 'by user:', req.user.email);

      // Find the document
      const document = req.user.studentProfile?.documents?.id(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Delete file from disk
      const filePath = path.join(__dirname, '../../uploads', document.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted from disk:', filePath);
      }

      // Remove from database
      req.user.studentProfile.documents.pull(documentId);
      await req.user.save();

      console.log('✅ Document deleted successfully');

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('❌ Document delete error:', error);
      next(error);
    }
  }
);

// =============================================================================
// UPLB Organizational Structure Routes (for Admin Profile Forms)
// =============================================================================

const { 
  UPLBColleges, 
  UPLBDepartments, 
  UniversityUnits,
  getOrganizationalStructure,
  getDepartmentsByCollege,
  getCollegeByCode
} = require('../models/UPLBStructure');

/**
 * @route   GET /api/users/uplb-structure
 * @desc    Get complete UPLB organizational structure for admin forms
 * @access  Private (Admin only)
 */
router.get('/uplb-structure', authMiddleware, async (req, res) => {
  try {
    const structure = getOrganizationalStructure();
    
    res.json({
      success: true,
      data: {
        colleges: structure.colleges.map(c => ({
          code: c.code,
          name: c.name,
          departmentCount: c.departments.length
        })),
        universityUnits: structure.universityUnits
      }
    });
  } catch (error) {
    console.error('Error fetching UPLB structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizational structure'
    });
  }
});

/**
 * @route   GET /api/users/uplb-structure/colleges
 * @desc    Get list of all UPLB colleges
 * @access  Private
 */
router.get('/uplb-structure/colleges', authMiddleware, async (req, res) => {
  try {
    const colleges = Object.entries(UPLBColleges).map(([code, info]) => ({
      code,
      name: info.name,
      fullName: info.fullName
    }));
    
    res.json({
      success: true,
      data: colleges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch colleges'
    });
  }
});

/**
 * @route   GET /api/users/uplb-structure/colleges/:collegeCode/departments
 * @desc    Get departments for a specific college
 * @access  Private
 */
router.get('/uplb-structure/colleges/:collegeCode/departments', authMiddleware, async (req, res) => {
  try {
    const { collegeCode } = req.params;
    
    // Validate college code
    const college = getCollegeByCode(collegeCode);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: `College with code '${collegeCode}' not found`
      });
    }
    
    const departments = getDepartmentsByCollege(collegeCode);
    
    res.json({
      success: true,
      data: {
        college: {
          code: college.code,
          name: college.name
        },
        departments: departments.map(d => ({
          code: d.code,
          name: d.name
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments'
    });
  }
});

/**
 * @route   GET /api/users/uplb-structure/university-units
 * @desc    Get list of university-level administrative units
 * @access  Private
 */
router.get('/uplb-structure/university-units', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: UniversityUnits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch university units'
    });
  }
});

module.exports = router;


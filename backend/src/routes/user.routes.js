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
        
        // Initialize adminProfile if it doesn't exist
        if (!req.user.adminProfile) {
          console.log('Initializing empty adminProfile');
          req.user.adminProfile = {};
        }

        // List of allowed adminProfile fields
        const adminProfileFields = [
          'firstName',
          'middleName',
          'lastName',
          'department',
          'college',
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
          }
        }
        
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
        
        // Mark profile as completed if we have essential fields
        if (adminData.department && adminData.position) {
          req.user.adminProfile.profileCompleted = true;
          req.user.adminProfile.profileCompletedAt = new Date();
        }
        
        console.log('Final adminProfile before save:', JSON.stringify(req.user.adminProfile, null, 2));
      }

      await req.user.save();
      console.log('✅ User saved successfully');
      
      // CRITICAL DEBUG: Verify documents were actually saved by fetching fresh from DB
      const savedUser = await User.findById(req.user._id);
      console.log('🔎 FRESH DB FETCH - Documents in database:', savedUser.studentProfile?.documents?.length || 0);
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

// =============================================================================
// Document Upload Routes (Optimized File Storage)
// =============================================================================

/**
 * @route   POST /api/users/documents/upload
 * @desc    Upload profile documents (optimized approach - files stored on disk)
 * @access  Private (Student only)
 */
router.post('/documents/upload',
  authMiddleware,
  requireRole(UserRole.STUDENT),
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
      console.log('📤 Document upload request from user:', req.user.email);
      
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

      // Update user's document list (append new documents)
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

      console.log(`✅ Successfully uploaded and saved ${uploadedDocuments.length} document(s)`);

      res.json({
        success: true,
        message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
        data: {
          documents: uploadedDocuments.map(doc => ({
            _id: doc._id, // MongoDB will add this
            name: doc.name,
            documentType: doc.documentType,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            uploadedAt: doc.uploadedAt
          })),
          totalDocuments: req.user.studentProfile.documents.length
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

      // Find the document in user's profile
      let document;
      let userId;

      if (req.user.role === UserRole.STUDENT) {
        document = req.user.studentProfile?.documents?.id(documentId);
        userId = req.user._id;
      } else if (req.user.role === UserRole.ADMIN) {
        // Admins can access any student's documents
        const studentId = req.query.studentId;
        if (!studentId) {
          return res.status(400).json({
            success: false,
            message: 'Student ID required for admin access'
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

module.exports = router;

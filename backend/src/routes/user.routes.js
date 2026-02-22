// =============================================================================
// ISKOlarship - User Routes
// User profile management
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { User, UserRole, UPLBCollege, YearLevel, STBracket } = require('../models');
const { authMiddleware, requireRole, requireAdminLevel } = require('../middleware/auth.middleware');
const { logProfileUpdate, logDocumentUpload, logDocumentDelete } = require('../services/activityLog.service');
const { uploadSingle, uploadMultiple, handleUploadError, uploadFilesToCloudinary, uploadToCloudinary, deleteFromCloudinary, getSignedUrl } = require('../middleware/upload.middleware');
const {
  getScholarshipScopeFilter,
  getScopedScholarshipIds
} = require('../middleware/adminScope.middleware');

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
        const studentData = req.body.studentProfile;
        
        // DEBUG: Log college/academicUnit data received
        
        // Check for duplicate student number if being updated
        if (studentData.studentNumber) {
          const existingUser = await User.findOne({ 
            'studentProfile.studentNumber': studentData.studentNumber,
            _id: { $ne: req.user._id } // Exclude current user
          });
          
          if (existingUser) {
            return res.status(409).json({
              success: false,
              message: 'This student number is already registered in the system.',
              error: 'DUPLICATE_STUDENT_NUMBER'
            });
          }
        }
        
        // Initialize studentProfile if it doesn't exist
        if (!req.user.studentProfile) {
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
          'profileCompleted',
          'customFields'  // Custom fields for scholarship-specific requirements
        ];

        // Update each field if present
        for (const field of studentProfileFields) {
          if (studentData[field] !== undefined) {
            req.user.studentProfile[field] = studentData[field];
            // DEBUG: Log specific fields we care about
            if (['collegeCode', 'academicUnitCode', 'academicUnit'].includes(field)) {
            }
          }
        }
        
        // CRITICAL: Mark studentProfile as modified to ensure Mongoose saves all changes
        req.user.markModified('studentProfile');
        
        // Handle homeAddress as nested object
        if (studentData.homeAddress) {
          req.user.studentProfile.homeAddress = {
            ...req.user.studentProfile.homeAddress,
            ...studentData.homeAddress
          };
        }
        
        // Handle documents array (for profile verification documents)
        
        if (studentData.documents !== undefined) {
          if (Array.isArray(studentData.documents) && studentData.documents.length > 0) {
            req.user.studentProfile.documents = studentData.documents.map(doc => {
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
            
            // CRITICAL: Mark the documents array as modified for Mongoose
            req.user.markModified('studentProfile.documents');
          } else {
            // Initialize empty array if not provided
            req.user.studentProfile.documents = [];
            req.user.markModified('studentProfile.documents');
          }
        }
        
        // Handle customFields (merge with existing, don't replace)
        if (studentData.customFields && typeof studentData.customFields === 'object') {
          
          // Initialize customFields if doesn't exist
          if (!req.user.studentProfile.customFields) {
            req.user.studentProfile.customFields = new Map();
          }
          
          // Merge new custom fields with existing ones
          for (const [key, value] of Object.entries(studentData.customFields)) {
            req.user.studentProfile.customFields.set(key, value);
          }
          
          // CRITICAL: Mark customFields as modified for Mongoose to save Map changes
          req.user.markModified('studentProfile.customFields');
        }
        
        // Mark profile as completed if we have essential fields
        if (studentData.studentNumber && studentData.college && studentData.course) {
          req.user.studentProfile.profileCompleted = true;
          req.user.studentProfile.profileCompletedAt = new Date();
        }
        
      }

      // Update admin profile if user is an admin
      if (req.user.role === UserRole.ADMIN && req.body.adminProfile) {
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
            }
          }
        }
        
        // CRITICAL: Mark adminProfile as modified to ensure Mongoose saves all changes
        req.user.markModified('adminProfile');
        
        // Handle address as nested object
        if (adminData.address) {
          req.user.adminProfile.address = {
            ...req.user.adminProfile.address,
            ...adminData.address
          };
        }
        
        // Handle permissions array
        if (adminData.permissions && Array.isArray(adminData.permissions)) {
          req.user.adminProfile.permissions = adminData.permissions;
        }
        
        // Handle documents array (for admin verification documents)
        
        if (adminData.documents !== undefined) {
          if (Array.isArray(adminData.documents) && adminData.documents.length > 0) {
            req.user.adminProfile.documents = adminData.documents.map(doc => {
              return {
                name: doc.name || '',
                documentType: doc.type || 'other',
                url: doc.url || '',
                cloudinaryPublicId: doc.cloudinaryPublicId || '',
                filePath: doc.filePath || '',
                fileName: doc.fileName || '',
                fileSize: doc.fileSize || 0,
                mimeType: doc.mimeType || '',
                uploadedAt: new Date()
              };
            });
            
            // CRITICAL: Mark the documents array as modified for Mongoose
            req.user.markModified('adminProfile.documents');
          } else {
            // Initialize empty array if not provided
            req.user.adminProfile.documents = [];
            req.user.markModified('adminProfile.documents');
          }
        }
        
        // Mark profile as completed if we have essential fields
        if (adminData.position && req.user.adminProfile.accessLevel) {
          req.user.adminProfile.profileCompleted = true;
          req.user.adminProfile.profileCompletedAt = new Date();
        }
        
      }

      await req.user.save();
      
      // Log profile update (fire-and-forget)
      logProfileUpdate(req.user, req.ip);

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
 * @desc    Get all users (admin, scoped)
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

      // SCOPE CHECK: Non-university admins only see students who are applicants
      // of scholarships within their scope
      const isUniversity = req.user.adminProfile?.accessLevel === 'university';
      if (!isUniversity) {
        const scopedScholarshipIds = await getScopedScholarshipIds(req.user);
        const { Application } = require('../models');
        const applicantIds = await Application.distinct('applicant', {
          scholarship: { $in: scopedScholarshipIds }
        });
        query._id = { $in: applicantIds };
        // Non-university admins can only view students, not other admins
        query.role = 'student';
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
 * @route   GET /api/users/stats/overview
 * @desc    Get user statistics (scoped for non-university admins)
 * @access  Admin
 * NOTE: Must be defined BEFORE /:id to avoid Express matching "stats" as an id parameter
 */
router.get('/stats/overview',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const isUniversity = req.user.adminProfile?.accessLevel === 'university';
      let userFilter = {};

      // Non-university admins: scope to students who applied to their scholarships
      if (!isUniversity) {
        const scopedScholarshipIds = await getScopedScholarshipIds(req.user);
        const { Application } = require('../models');
        const applicantIds = await Application.distinct('applicant', {
          scholarship: { $in: scopedScholarshipIds }
        });
        userFilter = { _id: { $in: applicantIds }, role: 'student' };
      }

      const stats = await User.aggregate([
        { $match: userFilter },
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

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin, scope-checked)
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

      // SCOPE CHECK: Non-university admins can only view students who applied to their scholarships
      const isUniversity = req.user.adminProfile?.accessLevel === 'university';
      if (!isUniversity) {
        const scopedScholarshipIds = await getScopedScholarshipIds(req.user);
        const { Application } = require('../models');
        const hasRelation = await Application.exists({
          applicant: req.params.id,
          scholarship: { $in: scopedScholarshipIds }
        });
        if (!hasRelation) {
          return res.status(403).json({
            success: false,
            message: 'This user is outside your administrative scope'
          });
        }
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
  requireAdminLevel('university'),
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
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
          error: 'NO_FILES'
        });
      }

      // Upload files to Cloudinary
      const cloudinaryResults = await uploadFilesToCloudinary(req.files, req.user._id.toString());

      // Build document metadata with Cloudinary URLs
      const uploadedDocuments = req.files.map((file, index) => {
        const documentType = req.body.documentTypes ? 
          (Array.isArray(req.body.documentTypes) ? req.body.documentTypes[index] : req.body.documentTypes) : 
          'other';
        
        const documentName = req.body.documentNames ?
          (Array.isArray(req.body.documentNames) ? req.body.documentNames[index] : req.body.documentNames) :
          file.originalname;

        const cloudResult = cloudinaryResults[index];

        return {
          name: documentName,
          documentType: documentType,
          url: cloudResult.url,
          cloudinaryPublicId: cloudResult.publicId,
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

      } else if (req.user.role === UserRole.ADMIN) {
        // Handle admin employee ID document
        
        if (!req.user.adminProfile) {
          req.user.adminProfile = {};
        }

        // For admin, we expect only employee_id document
        const employeeIdDoc = uploadedDocuments.find(doc => doc.documentType === 'employee_id');
        
        if (employeeIdDoc) {
          // Initialize documents array if needed
          if (!req.user.adminProfile.documents) {
            req.user.adminProfile.documents = [];
          }
          
          const docData = {
            name: 'Employee ID',
            documentType: 'employee_id',
            fileName: employeeIdDoc.fileName,
            url: employeeIdDoc.url,
            cloudinaryPublicId: employeeIdDoc.cloudinaryPublicId,
            fileSize: employeeIdDoc.fileSize,
            mimeType: employeeIdDoc.mimeType,
            uploadedAt: employeeIdDoc.uploadedAt
          };
          
          req.user.adminProfile.documents.push(docData);
          
          // Mark as modified and save
          req.user.markModified('adminProfile.documents');
          
          const savedUser = await req.user.save();
          
          // Verify it was saved
          const freshUser = await User.findById(req.user._id);
          if (freshUser.adminProfile?.documents?.length > 0) {
          } else {
          }

        } else {
          return res.status(400).json({
            success: false,
            message: 'Employee ID document type required for admin uploads',
            error: 'INVALID_DOCUMENT_TYPE'
          });
        }
      }

      // Log document upload (fire-and-forget)
      logDocumentUpload(req.user, uploadedDocuments.length, req.ip);

      res.json({
        success: true,
        message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
        data: {
          documents: uploadedDocuments.map(doc => ({
            name: doc.name,
            documentType: doc.documentType,
            fileName: doc.fileName,
            url: doc.url,
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
        
        if (req.user.adminProfile?.documents) {

        }
        
        if (!ownDocument && req.user.adminProfile?.documents) {
          // Fallback: manually search through documents array
          ownDocument = req.user.adminProfile.documents.find(
            doc => doc._id && doc._id.toString() === documentId
          );
        }
        
        if (ownDocument) {
          // Admin accessing their own document
          document = ownDocument;
          userId = req.user._id;
        } else {
          // Admin accessing a student's document - requires studentId query param
          const studentId = req.query.studentId;
          
          if (!studentId) {
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

          // SCOPE CHECK: Non-university admins can only access documents of students in their scope
          if (req.user.adminProfile?.accessLevel !== 'university') {
            const scopedScholarshipIds = await getScopedScholarshipIds(req.user);
            const { Application } = require('../models');
            const hasRelation = await Application.exists({
              applicant: studentId,
              scholarship: { $in: scopedScholarshipIds }
            });
            if (!hasRelation) {
              return res.status(403).json({
                success: false,
                message: 'This student is outside your administrative scope'
              });
            }
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

      // Stream the file from Cloudinary through the backend (avoids CDN 401 for raw files)
      if (document.url || document.cloudinaryPublicId) {
        const downloadUrl = document.cloudinaryPublicId
          ? getSignedUrl(document.cloudinaryPublicId, document.mimeType)
          : document.url;

        // Check if client wants JSON metadata (Accept: application/json)
        const wantsJson = (req.headers.accept || '').includes('application/json');
        if (wantsJson) {
          return res.json({
            success: true,
            data: { url: downloadUrl, fileName: document.fileName, mimeType: document.mimeType }
          });
        }

        // Otherwise stream the binary content back to the client
        const https = require('https');
        const { pipeline } = require('stream');
        res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
        https.get(downloadUrl, (upstream) => {
          if (upstream.statusCode !== 200) {
            return res.status(502).json({ success: false, message: 'Failed to fetch document from storage' });
          }
          if (upstream.headers['content-length']) {
            res.setHeader('Content-Length', upstream.headers['content-length']);
          }
          pipeline(upstream, res, (err) => {
            if (err) console.error('Stream error:', err.message);
          });
        }).on('error', (err) => {
          console.error('Cloudinary fetch error:', err);
          res.status(502).json({ success: false, message: 'Failed to fetch document from storage' });
        });
        return;
      }

      // Fallback: no URL stored (legacy data)
      return res.status(404).json({
        success: false,
        message: 'Document file not found – it may have been uploaded before cloud storage was enabled'
      });

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
  requireRole(UserRole.STUDENT),
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      
      // Find the document
      const document = req.user.studentProfile?.documents?.id(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Delete file from Cloudinary
      if (document.cloudinaryPublicId) {
        await deleteFromCloudinary(document.cloudinaryPublicId);
      }

      // Remove from database
      req.user.studentProfile.documents.pull(documentId);
      await req.user.save();

      // Log document delete (fire-and-forget)
      logDocumentDelete(req.user, document.name || document.documentType, req.ip);

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
// PUT /documents/:documentId/reupload - Replace an existing document file
// =============================================================================

/**
 * @route   PUT /api/users/documents/:documentId/reupload
 * @desc    Replace an existing document with a new file (reupload)
 *          Resets verificationStatus to 'pending' so admin reviews again
 * @access  Private (Student or Admin - own documents)
 */
router.put('/documents/:documentId/reupload',
  authMiddleware,
  requireRole(UserRole.STUDENT, UserRole.ADMIN),
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { documentId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided for reupload'
        });
      }

      // Find the existing document (check both student and admin profiles)
      const isAdmin = req.user.role === UserRole.ADMIN;
      const profileKey = isAdmin ? 'adminProfile' : 'studentProfile';
      const existingDoc = req.user[profileKey]?.documents?.id(documentId);
      if (!existingDoc) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Delete old file from Cloudinary
      if (existingDoc.cloudinaryPublicId) {
        try {
          await deleteFromCloudinary(existingDoc.cloudinaryPublicId);
        } catch (delErr) {
          console.warn('Could not delete old Cloudinary file:', delErr.message);
        }
      }

      // Upload new file to Cloudinary
      const isImage = req.file.mimetype.startsWith('image/');
      const cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: `iskolaship/documents/${req.user._id.toString()}`,
        resourceType: isImage ? 'image' : 'raw',
        publicId: `${existingDoc.documentType}_${Date.now()}`,
      });

      // Update document metadata
      existingDoc.url = cloudResult.url;
      existingDoc.cloudinaryPublicId = cloudResult.publicId;
      existingDoc.fileName = req.file.originalname;
      existingDoc.fileSize = req.file.size;
      existingDoc.mimeType = req.file.mimetype;
      existingDoc.uploadedAt = new Date();

      // Reset verification status to pending for admin re-review
      existingDoc.verificationStatus = 'pending';
      existingDoc.verifiedBy = undefined;
      existingDoc.verifiedAt = undefined;
      existingDoc.verificationRemarks = '';

      req.user.markModified(`${profileKey}.documents`);
      await req.user.save();

      res.json({
        success: true,
        message: 'Document reuploaded successfully. It will be reviewed again.',
        data: {
          _id: existingDoc._id,
          name: existingDoc.name,
          documentType: existingDoc.documentType,
          fileName: existingDoc.fileName,
          fileSize: existingDoc.fileSize,
          mimeType: existingDoc.mimeType,
          uploadedAt: existingDoc.uploadedAt,
          verificationStatus: existingDoc.verificationStatus,
        }
      });
    } catch (error) {
      console.error('Document reupload error:', error);
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

// =============================================================================
// Notification Preferences
// =============================================================================

/**
 * @route   GET /api/users/notification-preferences
 * @desc    Get current user's notification preferences
 * @access  Private
 */
router.get('/notification-preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        emailEnabled: user.notificationPreferences?.emailEnabled !== false,
        applicationUpdates: user.notificationPreferences?.applicationUpdates !== false,
        documentUpdates: user.notificationPreferences?.documentUpdates !== false,
      },
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notification preferences' });
  }
});

/**
 * @route   PATCH /api/users/notification-preferences
 * @desc    Update current user's notification preferences
 * @access  Private
 */
router.patch('/notification-preferences', authMiddleware, async (req, res) => {
  try {
    const { emailEnabled, applicationUpdates, documentUpdates } = req.body;

    const update = {};
    if (typeof emailEnabled === 'boolean') update['notificationPreferences.emailEnabled'] = emailEnabled;
    if (typeof applicationUpdates === 'boolean') update['notificationPreferences.applicationUpdates'] = applicationUpdates;
    if (typeof documentUpdates === 'boolean') update['notificationPreferences.documentUpdates'] = documentUpdates;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid preference fields provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, select: 'notificationPreferences' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: {
        emailEnabled: user.notificationPreferences?.emailEnabled !== false,
        applicationUpdates: user.notificationPreferences?.applicationUpdates !== false,
        documentUpdates: user.notificationPreferences?.documentUpdates !== false,
      },
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
  }
});

module.exports = router;


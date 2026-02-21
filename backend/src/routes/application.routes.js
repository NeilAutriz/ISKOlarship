// =============================================================================
// ISKOlarship - Application Routes
// Student application management and tracking with admin scope filtering
// IMPORTANT: Admin routes (/admin/*) MUST come before parameterized routes (/:id)
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { Application, ApplicationStatus, Scholarship, User } = require('../models');
const { authMiddleware, requireRole, requireAdminLevel, requireOwnerOrAdmin } = require('../middleware/auth.middleware');
const { uploadApplicationDocuments, uploadFilesToCloudinary, getSignedUrl } = require('../middleware/upload.middleware');
const { 
  attachAdminScope, 
  getScholarshipScopeFilter, 
  canManageApplication,
  canManageScholarship,
  getAdminScopeSummary 
} = require('../middleware/adminScope.middleware');
const { calculateEligibility, runPrediction } = require('../services/eligibility.service');
const { onApplicationDecision } = require('../services/autoTraining.service');
const { notifyApplicationStatusChange } = require('../services/notification.service');

// =============================================================================
// Validation Rules
// =============================================================================

const applicationValidation = [
  body('scholarshipId')
    .isMongoId()
    .withMessage('Valid scholarship ID is required'),
  body('personalStatement')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Personal statement cannot exceed 5000 characters')
];

const statusUpdateValidation = [
  body('status')
    .isIn(Object.values(ApplicationStatus))
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }),
  body('reason')
    .optional()
    .isLength({ max: 500 })
];

// =============================================================================
// Student Routes - Specific paths BEFORE parameterized routes
// =============================================================================

/**
 * @route   GET /api/applications/my
 * @desc    Get current user's applications
 * @access  Private (Student)
 */
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const query = { applicant: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    // Execute query with timeout protection
    const queryTimeout = setTimeout(() => {
      console.error('⚠️  Query taking too long! Check database performance.');
    }, 5000); // Warn if query takes more than 5 seconds

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('scholarship', 'name type sponsor applicationDeadline awardAmount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .maxTimeMS(25000), // MongoDB server-side timeout
      Application.countDocuments(query).maxTimeMS(5000)
    ]);

    clearTimeout(queryTimeout);
    
    const elapsed = Date.now() - startTime;

    // Build applicantSnapshot from current user profile if snapshot is empty
    const userProfile = req.user.studentProfile || {};
    const enrichedApplications = applications.map(app => {
      const storedSnapshot = app.applicantSnapshot || {};
      const hasValidSnapshot = storedSnapshot.gwa || storedSnapshot.course || storedSnapshot.classification;
      
      if (!hasValidSnapshot) {
        app.applicantSnapshot = {
          studentNumber: storedSnapshot.studentNumber || userProfile.studentNumber,
          firstName: userProfile.firstName || req.user.firstName,
          middleName: userProfile.middleName || '',
          lastName: userProfile.lastName || req.user.lastName,
          contactNumber: userProfile.contactNumber,
          homeAddress: userProfile.homeAddress || {},
          gwa: userProfile.gwa,
          classification: userProfile.classification,
          college: userProfile.college,
          course: userProfile.course,
          major: userProfile.major,
          unitsEnrolled: userProfile.unitsEnrolled,
          unitsPassed: userProfile.unitsPassed,
          annualFamilyIncome: userProfile.annualFamilyIncome,
          stBracket: userProfile.stBracket,
          householdSize: userProfile.householdSize,
          provinceOfOrigin: userProfile.provinceOfOrigin,
          citizenship: userProfile.citizenship
        };
      }
      return app;
    });

    res.json({
      success: true,
      data: {
        applications: enrichedApplications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching applications:', error.message);
    next(error);
  }
});

/**
 * @route   GET /api/applications/my/stats
 * @desc    Get application statistics for current user
 * @access  Private (Student)
 */
router.get('/my/stats', authMiddleware, async (req, res, next) => {
  try {
    const stats = await Application.aggregate([
      { $match: { applicant: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = stats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const total = stats.reduce((sum, item) => sum + item.count, 0);
    const approved = statusCounts[ApplicationStatus.APPROVED] || 0;
    const pending = (statusCounts[ApplicationStatus.SUBMITTED] || 0) + 
                   (statusCounts[ApplicationStatus.UNDER_REVIEW] || 0);

    res.json({
      success: true,
      data: {
        total,
        approved,
        pending,
        rejected: statusCounts[ApplicationStatus.REJECTED] || 0,
        draft: statusCounts[ApplicationStatus.DRAFT] || 0,
        byStatus: statusCounts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/applications
 * @desc    Create new application
 * @access  Private (Student)
 */
router.post('/', 
  authMiddleware, 
  requireRole('student'),
  (req, res, next) => {
    uploadApplicationDocuments(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          error: err.code || 'UPLOAD_ERROR'
        });
      }
      next();
    });
  },
  applicationValidation, // THEN validate
  async (req, res, next) => {
    try {
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { scholarshipId, personalStatement, additionalInfo, documentNames, documentTypes, customFieldAnswers, textDocuments } = req.body;
      const uploadedFiles = req.files || [];

      // Check if scholarship exists and is open
      const scholarship = await Scholarship.findById(scholarshipId);
      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      if (!scholarship.isAcceptingApplications()) {
        return res.status(400).json({
          success: false,
          message: 'This scholarship is not currently accepting applications'
        });
      }

      // Check for existing application
      const existingApp = await Application.findOne({
        applicant: req.user._id,
        scholarship: scholarshipId
      });

      if (existingApp) {
        return res.status(409).json({
          success: false,
          message: 'You have already applied for this scholarship',
          data: { applicationId: existingApp._id }
        });
      }

      // Check eligibility
      const eligibilityResult = await calculateEligibility(req.user, scholarship);

      // Create applicant snapshot with complete student data
      // Uses FLAT structure matching User.model.js studentProfile schema
      const profile = req.user.studentProfile || {};
      const applicantSnapshot = {
        // Identity
        studentNumber: profile.studentNumber,
        firstName: profile.firstName || req.user.firstName,
        middleName: profile.middleName || '',
        lastName: profile.lastName || req.user.lastName,

        // Contact Info
        contactNumber: profile.contactNumber,
        homeAddress: profile.homeAddress || {},

        // Academic Info (flat fields from User.model.js)
        gwa: profile.gwa,
        classification: profile.classification,
        college: profile.college,
        course: profile.course,
        major: profile.major,
        unitsEnrolled: profile.unitsEnrolled,
        unitsPassed: profile.unitsPassed,

        // Financial Info (flat fields from User.model.js)
        annualFamilyIncome: profile.annualFamilyIncome,
        stBracket: profile.stBracket,
        householdSize: profile.householdSize,

        // Personal Info (flat fields from User.model.js)
        provinceOfOrigin: profile.provinceOfOrigin,
        citizenship: profile.citizenship,

        // Scholarship/Status Info (flat fields from User.model.js)
        hasExistingScholarship: profile.hasExistingScholarship,
        hasThesisGrant: profile.hasThesisGrant,
        hasApprovedThesisOutline: profile.hasApprovedThesisOutline,
        hasDisciplinaryAction: profile.hasDisciplinaryAction,
        hasFailingGrade: profile.hasFailingGrade
      };

      // Upload files to Cloudinary
      const userId = req.user._id.toString();
      const cloudinaryResults = await uploadFilesToCloudinary(uploadedFiles, userId);

      // Process documents from uploaded files
      const namesArray = Array.isArray(documentNames) ? documentNames : [documentNames].filter(Boolean);
      const typesArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes].filter(Boolean);
      
      const processedDocuments = uploadedFiles.map((file, index) => {
        const cloudResult = cloudinaryResults[index];
        
        return {
          name: namesArray[index] || 'Uploaded Document',
          documentType: typesArray[index] || 'other',
          url: cloudResult.url,
          cloudinaryPublicId: cloudResult.publicId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };
      });

      // Process text documents (no file, just text content)
      if (textDocuments) {
        try {
          const parsedTextDocs = JSON.parse(textDocuments);
          if (Array.isArray(parsedTextDocs)) {
            parsedTextDocs.forEach(textDoc => {
              processedDocuments.push({
                name: textDoc.name || 'Text Document',
                documentType: textDoc.type || 'text_response',
                textContent: textDoc.content,
                isTextDocument: true,
                uploadedAt: new Date()
              });
            });
          }
        } catch (e) {
          console.error('❌ Error parsing text documents:', e);
        }
      }

      // Update document flags based on uploaded documents
      const hasTranscript = processedDocuments.some(d => d.documentType === 'transcript');
      const hasIncomeCertificate = processedDocuments.some(d => d.documentType === 'income_certificate');
      const hasCertificateOfRegistration = processedDocuments.some(d => d.documentType === 'certificate_of_registration');
      const hasGradeReport = processedDocuments.some(d => d.documentType === 'grade_report');

      // Create application
      const application = new Application({
        applicant: req.user._id,
        scholarship: scholarshipId,
        personalStatement,
        additionalInfo,
        documents: processedDocuments,
        hasTranscript,
        hasIncomeCertificate,
        hasCertificateOfRegistration,
        hasGradeReport,
        applicantSnapshot,
        // Parse and store custom field answers
        customFieldAnswers: (() => {
          if (customFieldAnswers) {
            try {
              const parsed = JSON.parse(customFieldAnswers);
              // Store as plain object instead of Map for better serialization
              return parsed;
            } catch (e) {
              console.error('❌ Error parsing customFieldAnswers:', e);
              return {};
            }
          }
          return {};
        })(),
        eligibilityChecks: eligibilityResult.checks,
        passedAllEligibilityCriteria: eligibilityResult.passed,
        eligibilityPercentage: eligibilityResult.score,
        criteriaPassed: eligibilityResult.passed ? eligibilityResult.checks.length : eligibilityResult.checks.filter(c => c.passed).length,
        criteriaTotal: eligibilityResult.checks.length,
        academicYear: scholarship.academicYear,
        semester: scholarship.semester,
        statusHistory: [{
          status: ApplicationStatus.DRAFT,
          changedBy: req.user._id,
          changedAt: new Date(),
          notes: 'Application created'
        }]
      });

      // Run prediction if eligible
      if (eligibilityResult.passed) {
        const prediction = await runPrediction(req.user, scholarship);
        application.prediction = prediction;
      }

      await application.save();
      
      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: {
          application,
          eligibility: eligibilityResult
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Admin Routes - MUST BE BEFORE /:id routes to avoid route matching issues
// Express matches routes in order, so /admin/* must come before /:id
// =============================================================================

/**
 * @route   GET /api/applications/admin/scope
 * @desc    Get admin's scope summary for applications UI
 * @access  Admin
 */
router.get('/admin/scope',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  (req, res) => {
    
    const scopeSummary = getAdminScopeSummary(req.user);
    res.json({
      success: true,
      data: scopeSummary
    });
  }
);

/**
 * @route   GET /api/applications/admin
 * @desc    Get all applications (admin, scope-filtered by scholarship)
 * @access  Admin
 */
router.get('/admin',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  async (req, res, next) => {
    try {

      const {
        status,
        scholarshipId,
        page = 1,
        limit = 50,
        sortBy = 'submittedAt',
        sortOrder = 'desc'
      } = req.query;

      // First, get the scholarships this admin can see
      const scholarshipScopeFilter = getScholarshipScopeFilter(req.user);
      
      // CRITICAL: Check if scope filter denies all access
      if (scholarshipScopeFilter._id && scholarshipScopeFilter._id.$exists === false) {
        return res.json({
          success: true,
          data: {
            applications: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0
            },
            adminScope: req.adminScope,
            message: 'Your admin profile may not be fully configured. Please contact system administrator.'
          }
        });
      }
      
      const accessibleScholarships = await Scholarship.find(scholarshipScopeFilter)
        .select('_id name scholarshipLevel')
        .lean();
      
      const accessibleScholarshipIds = accessibleScholarships.map(s => s._id);

      // Build application query filtered by accessible scholarships
      const query = {
        scholarship: { $in: accessibleScholarshipIds }
      };
      
      if (status) query.status = status;
      if (scholarshipId) {
        // Verify the requested scholarship is within admin's scope
        if (!accessibleScholarshipIds.some(id => id.toString() === scholarshipId)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to applications for this scholarship'
          });
        }
        query.scholarship = scholarshipId;
      }

      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [applications, total] = await Promise.all([
        Application.find(query)
          .populate('applicant', 'firstName lastName email studentProfile')
          .populate('scholarship', 'name type applicationDeadline scholarshipLevel managingCollege managingAcademicUnit managingCollegeCode managingAcademicUnitCode')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Application.countDocuments(query)
      ]);

      // Add permission info to each application
      const enrichedApplications = applications.map(app => ({
        ...app,
        canManage: canManageApplication(req.user, app)
      }));

      res.json({
        success: true,
        data: {
          applications: enrichedApplications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          },
          adminScope: req.adminScope
        }
      });
    } catch (error) {
      console.error('🚫 Admin applications error:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/applications/admin/review-queue
 * @desc    Get pending review queue (scope-filtered)
 * @access  Admin
 */
router.get('/admin/review-queue',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);

      // Get accessible scholarships for this admin
      const scholarshipScopeFilter = getScholarshipScopeFilter(req.user);
      
      // Check for denied access
      if (scholarshipScopeFilter._id && scholarshipScopeFilter._id.$exists === false) {
        return res.json({
          success: true,
          data: [],
          adminScope: req.adminScope
        });
      }
      
      const accessibleScholarships = await Scholarship.find(scholarshipScopeFilter)
        .select('_id')
        .lean();
      
      const accessibleScholarshipIds = accessibleScholarships.map(s => s._id);

      // Get pending applications only for scholarships within admin's scope
      const applications = await Application.find({
        status: { $in: ['submitted', 'under_review'] },
        scholarship: { $in: accessibleScholarshipIds }
      })
        .populate('applicant', 'firstName lastName email studentProfile')
        .populate('scholarship', 'name type applicationDeadline scholarshipLevel managingCollege managingAcademicUnit managingCollegeCode managingAcademicUnitCode')
        .sort({ submittedAt: 1 })
        .limit(parseInt(limit))
        .lean();

      // Add permission info
      const enrichedApplications = applications.map(app => ({
        ...app,
        canManage: canManageApplication(req.user, app)
      }));

      res.json({
        success: true,
        data: enrichedApplications,
        adminScope: req.adminScope
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/applications/admin/stats
 * @desc    Get application statistics (scope-filtered)
 * @access  Admin
 */
router.get('/admin/stats',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  async (req, res, next) => {
    try {
      const { scholarshipId, academicYear, semester } = req.query;

      // Get accessible scholarships for this admin
      const scholarshipScopeFilter = getScholarshipScopeFilter(req.user);
      
      // Check for denied access
      if (scholarshipScopeFilter._id && scholarshipScopeFilter._id.$exists === false) {
        return res.json({
          success: true,
          data: {
            byStatus: {},
            timeline: [],
            predictionAccuracy: null
          }
        });
      }
      
      const accessibleScholarships = await Scholarship.find(scholarshipScopeFilter)
        .select('_id')
        .lean();
      
      const accessibleScholarshipIds = accessibleScholarships.map(s => s._id);

      const matchStage = {
        scholarship: { $in: accessibleScholarshipIds }
      };
      
      if (scholarshipId) {
        // Verify scholarship is accessible
        if (!accessibleScholarshipIds.some(id => id.toString() === scholarshipId)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to stats for this scholarship'
          });
        }
        matchStage.scholarship = new (require('mongoose').Types.ObjectId)(scholarshipId);
      }
      if (academicYear) matchStage.academicYear = academicYear;
      if (semester) matchStage.semester = semester;

      const stats = await Application.aggregate([
        { $match: matchStage },
        {
          $facet: {
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            timeline: [
              {
                $group: {
                  _id: {
                    year: { $year: '$submittedAt' },
                    month: { $month: '$submittedAt' }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': -1, '_id.month': -1 } },
              { $limit: 12 }
            ],
            predictionAccuracy: [
              {
                $match: {
                  status: { $in: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] },
                  'prediction.predictedOutcome': { $exists: true }
                }
              },
              {
                $project: {
                  correct: {
                    $cond: [
                      { $eq: ['$status', '$prediction.predictedOutcome'] },
                      1,
                      0
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  correct: { $sum: '$correct' }
                }
              }
            ]
          }
        }
      ]);

      const result = stats[0];

      res.json({
        success: true,
        data: {
          byStatus: result.byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
          timeline: result.timeline,
          predictionAccuracy: result.predictionAccuracy[0] ? {
            total: result.predictionAccuracy[0].total,
            correct: result.predictionAccuracy[0].correct,
            percentage: (result.predictionAccuracy[0].correct / result.predictionAccuracy[0].total * 100).toFixed(2)
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Parameterized Routes - MUST come AFTER all static and admin routes
// =============================================================================

/**
 * @route   GET /api/applications/:id

 * @desc    Get application by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:id',
  authMiddleware,
  [param('id').isMongoId()],
  requireOwnerOrAdmin(async (req) => {
    const app = await Application.findById(req.params.id);
    return app?.applicant;
  }),
  async (req, res, next) => {
    try {
      const application = await Application.findById(req.params.id)
        .populate('applicant', 'firstName lastName email studentProfile')
        .populate('scholarship', 'name type sponsor applicationDeadline requirements eligibilityCriteria scholarshipLevel managingCollegeCode managingAcademicUnitCode managingCollege managingAcademicUnit')
        .populate('statusHistory.changedBy', 'firstName lastName')
        .lean();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // SCOPE CHECK: If admin, verify they can manage this application's scholarship
      if (req.user.role === 'admin') {
        // Application already has scholarship populated from the query above
        if (!canManageApplication(req.user, application)) {
          return res.status(403).json({
            success: false,
            message: 'This application is outside your administrative scope'
          });
        }
      }

      // Build applicantSnapshot from populated applicant data if snapshot is empty/missing
      // This ensures existing applications display profile info correctly
      const storedSnapshot = application.applicantSnapshot || {};
      const hasValidSnapshot = storedSnapshot.gwa || storedSnapshot.course || storedSnapshot.classification;
      
      if (!hasValidSnapshot && application.applicant?.studentProfile) {
        const profile = application.applicant.studentProfile;
        application.applicantSnapshot = {
          // Identity
          studentNumber: storedSnapshot.studentNumber || profile.studentNumber,
          firstName: profile.firstName || application.applicant.firstName,
          middleName: profile.middleName || '',
          lastName: profile.lastName || application.applicant.lastName,

          // Contact Info
          contactNumber: profile.contactNumber,
          homeAddress: profile.homeAddress || {},

          // Academic Info
          gwa: profile.gwa,
          classification: profile.classification,
          college: profile.college,
          course: profile.course,
          major: profile.major,
          unitsEnrolled: profile.unitsEnrolled,
          unitsPassed: profile.unitsPassed,

          // Financial Info
          annualFamilyIncome: profile.annualFamilyIncome,
          stBracket: profile.stBracket,
          householdSize: profile.householdSize,

          // Personal Info
          provinceOfOrigin: profile.provinceOfOrigin,
          citizenship: profile.citizenship,

          // Status flags
          hasExistingScholarship: profile.hasExistingScholarship,
          hasThesisGrant: profile.hasThesisGrant,
          hasApprovedThesisOutline: profile.hasApprovedThesisOutline,
          hasDisciplinaryAction: profile.hasDisciplinaryAction,
          hasFailingGrade: profile.hasFailingGrade
        };
      }

      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/applications/:id
 * @desc    Update application (before submission)
 * @access  Private (Owner)
 */
router.put('/:id',
  authMiddleware,
  requireRole('student'),
  [param('id').isMongoId()],
  (req, res, next) => {
    uploadApplicationDocuments(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error on edit:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          error: err.code || 'UPLOAD_ERROR'
        });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const application = await Application.findById(req.params.id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check ownership
      if (application.applicant.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Can only update draft or submitted applications
      const editableStatuses = [ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED];
      if (!editableStatuses.includes(application.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot edit application in ' + application.status + ' status. Only draft or submitted applications can be edited.'
        });
      }

      const { personalStatement, additionalInfo, customFieldAnswers, existingDocumentIds, documentNames, documentTypes, textDocuments } = req.body;
      const uploadedFiles = req.files || [];

      // Update text fields
      if (personalStatement !== undefined) {
        application.personalStatement = personalStatement;
      }
      if (additionalInfo !== undefined) {
        application.additionalInfo = additionalInfo;
      }

      // Update custom field answers
      if (customFieldAnswers) {
        try {
          application.customFieldAnswers = JSON.parse(customFieldAnswers);
        } catch (e) {
          console.error('❌ Error parsing customFieldAnswers on edit:', e);
        }
      }

      // Handle documents: keep existing + add new
      let keptDocuments = [];
      if (existingDocumentIds) {
        try {
          const keepIds = JSON.parse(existingDocumentIds);
          if (Array.isArray(keepIds)) {
            keptDocuments = (application.documents || []).filter(
              doc => keepIds.includes(doc._id.toString())
            );
          }
        } catch (e) {
          console.error('❌ Error parsing existingDocumentIds:', e);
          keptDocuments = application.documents || [];
        }
      } else {
        // If no existingDocumentIds sent, keep all existing documents
        keptDocuments = application.documents || [];
      }

      // Process new uploaded files
      const namesArray = Array.isArray(documentNames) ? documentNames : [documentNames].filter(Boolean);
      const typesArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes].filter(Boolean);

      const newDocuments = uploadedFiles.map((file, index) => {
        const userId = req.user._id.toString();
        const relativePath = `documents/${userId}/${file.filename}`;

        return {
          name: namesArray[index] || 'Uploaded Document',
          documentType: typesArray[index] || 'other',
          filePath: relativePath,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };
      });

      // Process text documents
      if (textDocuments) {
        try {
          const parsedTextDocs = JSON.parse(textDocuments);
          if (Array.isArray(parsedTextDocs)) {
            parsedTextDocs.forEach(textDoc => {
              newDocuments.push({
                name: textDoc.name || 'Text Document',
                documentType: textDoc.type || 'text_response',
                textContent: textDoc.content,
                isTextDocument: true,
                uploadedAt: new Date()
              });
            });
          }
        } catch (e) {
          console.error('❌ Error parsing text documents on edit:', e);
        }
      }

      // Merge: kept existing + new uploads
      application.documents = [...keptDocuments, ...newDocuments];

      // Re-run eligibility check and prediction
      const scholarship = await Scholarship.findById(application.scholarship);
      if (scholarship) {
        const eligibilityResult = await calculateEligibility(req.user, scholarship);
        application.eligibilityChecks = eligibilityResult.checks;
        application.passedAllEligibilityCriteria = eligibilityResult.passed;
        application.eligibilityPercentage = eligibilityResult.score;
        application.criteriaPassed = eligibilityResult.passed
          ? eligibilityResult.checks.length
          : eligibilityResult.checks.filter(c => c.passed).length;
        application.criteriaTotal = eligibilityResult.checks.length;

        // Re-run ML prediction
        if (eligibilityResult.passed) {
          try {
            const prediction = await runPrediction(req.user, scholarship);
            application.prediction = prediction;
          } catch (predErr) {
          }
        }
      }

      // Refresh applicant snapshot with latest profile data
      const profile = req.user.studentProfile || {};
      application.applicantSnapshot = {
        studentNumber: profile.studentNumber,
        firstName: profile.firstName || req.user.firstName,
        middleName: profile.middleName || '',
        lastName: profile.lastName || req.user.lastName,
        contactNumber: profile.contactNumber,
        homeAddress: profile.homeAddress || {},
        gwa: profile.gwa,
        classification: profile.classification,
        college: profile.college,
        course: profile.course,
        major: profile.major,
        unitsEnrolled: profile.unitsEnrolled,
        unitsPassed: profile.unitsPassed,
        annualFamilyIncome: profile.annualFamilyIncome,
        stBracket: profile.stBracket,
        householdSize: profile.householdSize,
        provinceOfOrigin: profile.provinceOfOrigin,
        citizenship: profile.citizenship,
        hasExistingScholarship: profile.hasExistingScholarship,
        hasThesisGrant: profile.hasThesisGrant,
        hasApprovedThesisOutline: profile.hasApprovedThesisOutline,
        hasDisciplinaryAction: profile.hasDisciplinaryAction,
        hasFailingGrade: profile.hasFailingGrade
      };

      // Add status history entry for the edit
      application.statusHistory.push({
        status: application.status,
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: 'Application edited by student'
      });

      await application.save();

      res.json({
        success: true,
        message: 'Application updated successfully',
        data: application
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/applications/:id/submit
 * @desc    Submit application for review
 * @access  Private (Owner)
 */
router.post('/:id/submit',
  authMiddleware,
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const application = await Application.findById(req.params.id)
        .populate('scholarship');

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check ownership
      if (application.applicant.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Can only submit draft applications
      if (application.status !== ApplicationStatus.DRAFT) {
        return res.status(400).json({
          success: false,
          message: `Cannot submit application in ${application.status} status`
        });
      }

      // Check if scholarship is still accepting applications
      if (!application.scholarship.isAcceptingApplications()) {
        return res.status(400).json({
          success: false,
          message: 'Scholarship is no longer accepting applications'
        });
      }

      // Update status
      application.updateStatus(
        ApplicationStatus.SUBMITTED,
        req.user._id,
        'Application submitted by student'
      );

      await application.save();

      res.json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/applications/:id/withdraw
 * @desc    Withdraw application
 * @access  Private (Owner)
 */
router.post('/:id/withdraw',
  authMiddleware,
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const application = await Application.findById(req.params.id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check ownership
      if (application.applicant.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Can't withdraw already decided applications
      const nonWithdrawable = [
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN
      ];

      if (nonWithdrawable.includes(application.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot withdraw application in ${application.status} status`
        });
      }

      application.updateStatus(
        ApplicationStatus.WITHDRAWN,
        req.user._id,
        req.body.reason || 'Withdrawn by applicant'
      );

      await application.save();

      res.json({
        success: true,
        message: 'Application withdrawn successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/applications/:id/status
 * @desc    Update application status (admin, scope-checked)
 * @access  Admin
 */
router.put('/:id/status',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  [param('id').isMongoId()],
  statusUpdateValidation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const application = await Application.findById(req.params.id)
        .populate('scholarship');

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check if admin can manage this application
      if (!canManageApplication(req.user, application)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this application',
          details: {
            yourLevel: req.adminScope?.level,
            scholarshipLevel: application.scholarship?.scholarshipLevel,
            scholarshipCollege: application.scholarship?.managingCollege
          }
        });
      }

      const { status, notes, reason } = req.body;
      const previousStatus = application.status;

      // Update status
      application.updateStatus(status, req.user._id, notes, reason);
      application.reviewedBy = req.user._id;
      application.reviewNotes = notes;

      if (status === ApplicationStatus.REJECTED) {
        application.rejectionReason = reason;
      }

      // Handle scholarship filledSlots based on status transitions
      if (status === ApplicationStatus.APPROVED && previousStatus !== ApplicationStatus.APPROVED) {
        // Newly approved — increment slots
        await Scholarship.findByIdAndUpdate(
          application.scholarship._id,
          { $inc: { filledSlots: 1 } }
        );
      } else if (previousStatus === ApplicationStatus.APPROVED && status !== ApplicationStatus.APPROVED) {
        // Was approved, now changed to something else — decrement slots
        await Scholarship.findByIdAndUpdate(
          application.scholarship._id,
          { $inc: { filledSlots: -1 } }
        );
      }

      await application.save();

      // ── Auto-retrain ML model (non-blocking background task) ──────────
      if ([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(status)) {
        onApplicationDecision(
          application._id,
          application.scholarship._id,
          status,
          req.user._id
        );
      }

      // ── Email notification to student (fire-and-forget) ───────────────
      notifyApplicationStatusChange(
        application.applicant.toString(),
        status,
        application.scholarship?.name || application.scholarship?.title || 'a scholarship',
        reason
      );

      res.json({
        success: true,
        message: `Application ${status} successfully`,
        data: application
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Application Document Download Route
// =============================================================================

/**
 * @route   GET /api/applications/:applicationId/documents/:documentId
 * @desc    Download a document from an application
 * @access  Private (Admin or Application Owner)
 */
router.get('/:applicationId/documents/:documentId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { applicationId, documentId } = req.params;

      // Find the application
      const application = await Application.findById(applicationId)
        .populate('applicant')
        .populate('scholarship');
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }



      // Check authorization
      const isOwner = application.applicant._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this document'
        });
      }

      // SCOPE CHECK: If admin (not owner), verify they can manage this application's scholarship
      if (isAdmin && !isOwner) {
        if (!canManageApplication(req.user, application)) {
          return res.status(403).json({
            success: false,
            message: 'This application\'s documents are outside your administrative scope'
          });
        }
      }

      // Find the document in the application
      const document = application.documents.id(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found in application'
        });
      }

      // Stream the file from Cloudinary through the backend (avoids CDN 401 for raw files)
      if ((document.url && document.url.startsWith('http')) || document.cloudinaryPublicId) {
        const downloadUrl = document.cloudinaryPublicId
          ? getSignedUrl(document.cloudinaryPublicId, document.mimeType)
          : document.url;

        // Check if client wants JSON metadata
        const wantsJson = (req.headers.accept || '').includes('application/json');
        if (wantsJson) {
          return res.json({
            success: true,
            data: { url: downloadUrl, fileName: document.fileName, mimeType: document.mimeType }
          });
        }

        // Stream the binary content
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

      // No cloud URL available (legacy data)
      return res.status(404).json({
        success: false,
        message: 'Document file not found – it may have been uploaded before cloud storage was enabled'
      });
    } catch (error) {
      console.error('❌ Application document download error:', error);
      next(error);
    }
  }
);

module.exports = router;

// =============================================================================
// ISKOlarship - Application Routes
// Student application management and tracking with admin scope filtering
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { Application, ApplicationStatus, Scholarship, User } = require('../models');
const { authMiddleware, requireRole, requireAdminLevel, requireOwnerOrAdmin } = require('../middleware/auth.middleware');
const { uploadApplicationDocuments } = require('../middleware/upload.middleware');
const { 
  attachAdminScope, 
  getScholarshipScopeFilter, 
  canManageApplication,
  getAdminScopeSummary 
} = require('../middleware/adminScope.middleware');
const path = require('path');
const fs = require('fs');
const { calculateEligibility, runPrediction } = require('../services/eligibility.service');

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
// Student Routes
// =============================================================================

/**
 * @route   GET /api/applications/my
 * @desc    Get current user's applications
 * @access  Private (Student)
 */
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    console.log('📥 Fetching applications for user:', req.user._id);
    const startTime = Date.now();
    
    const { status, page = 1, limit = 20 } = req.query;

    const query = { applicant: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    console.log('🔍 Query:', JSON.stringify(query));
    console.log('📄 Pagination: page', page, 'limit', limit, 'skip', skip);

    // Execute query with timeout protection
    const queryTimeout = setTimeout(() => {
      console.error('⚠️  Query taking too long! Check database performance.');
    }, 5000); // Warn if query takes more than 5 seconds

    const [applications, total] = await Promise.all([
      Application.find(query)
        .select('-documents.url') // Exclude large base64 document URLs from list view
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
    console.log(`✅ Query completed in ${elapsed}ms - Found ${applications.length} applications (total: ${total})`);

    // Build applicantSnapshot from current user profile if snapshot is empty
    const userProfile = req.user.studentProfile || {};
    const enrichedApplications = applications.map(app => {
      const storedSnapshot = app.applicantSnapshot || {};
      const hasValidSnapshot = storedSnapshot.gwa || storedSnapshot.course || storedSnapshot.classification;
      
      if (!hasValidSnapshot) {
        app.applicantSnapshot = {
          studentNumber: storedSnapshot.studentNumber || userProfile.studentNumber,
          firstName: userProfile.firstName || req.user.firstName,
          lastName: userProfile.lastName || req.user.lastName,
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
      console.log('📥 Received application request');
      console.log('📦 Request body:', req.body);
      console.log('📎 Files:', req.files?.length || 0);
      console.log('📋 Content-Type:', req.headers['content-type']);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { scholarshipId, personalStatement, additionalInfo, documentNames, documentTypes } = req.body;
      const uploadedFiles = req.files || [];

      console.log('📝 Application Creation Request:');
      console.log('📤 Files uploaded:', uploadedFiles.length);
      console.log('📋 Document names:', documentNames);
      console.log('📋 Document types:', documentTypes);
      console.log('🔍 Uploaded files details:', JSON.stringify(uploadedFiles.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype
      })), null, 2));

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
        lastName: profile.lastName || req.user.lastName,
        
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

      // Process documents from uploaded files
      const namesArray = Array.isArray(documentNames) ? documentNames : [documentNames].filter(Boolean);
      const typesArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes].filter(Boolean);
      
      const processedDocuments = uploadedFiles.map((file, index) => {
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

      console.log('📄 Processed Documents:', processedDocuments);
      console.log('📄 Processed Documents Count:', processedDocuments.length);

      // Update document flags based on uploaded documents
      const hasTranscript = processedDocuments.some(d => d.documentType === 'transcript');
      const hasIncomeCertificate = processedDocuments.some(d => d.documentType === 'income_certificate');
      const hasCertificateOfRegistration = processedDocuments.some(d => d.documentType === 'certificate_of_registration');
      const hasGradeReport = processedDocuments.some(d => d.documentType === 'grade_report');
      
      console.log('📋 Document Flags:', {
        hasTranscript,
        hasIncomeCertificate,
        hasCertificateOfRegistration,
        hasGradeReport
      });

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
      
      console.log('💾 Application saved to database');
      console.log('💾 Saved documents count:', application.documents.length);
      console.log('💾 Saved documents:', application.documents);

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
        .populate('scholarship', 'name type sponsor applicationDeadline requirements eligibilityCriteria')
        .populate('statusHistory.changedBy', 'firstName lastName')
        .lean();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
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
          lastName: profile.lastName || application.applicant.lastName,
          
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

      // Can only update draft applications
      if (application.status !== ApplicationStatus.DRAFT) {
        return res.status(400).json({
          success: false,
          message: 'Cannot edit submitted application'
        });
      }

      const { personalStatement, additionalInfo } = req.body;

      if (personalStatement !== undefined) {
        application.personalStatement = personalStatement;
      }
      if (additionalInfo !== undefined) {
        application.additionalInfo = additionalInfo;
      }

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

// =============================================================================
// Admin Routes
// =============================================================================

/**
 * @route   GET /api/applications/admin/scope
 * @desc    Get admin's scope summary for applications UI
 * @access  Admin
 */
router.get('/admin/scope',
  authMiddleware,
  requireRole('admin'),
  (req, res) => {
    const scopeSummary = getAdminScopeSummary(req.user);
    res.json({
      success: true,
      data: scopeSummary
    });
  }
);

/**
 * @route   GET /api/applications
 * @desc    Get all applications (admin, scope-filtered)
 * @access  Admin
 */
router.get('/',
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
      const accessibleScholarships = await Scholarship.find(scholarshipScopeFilter)
        .select('_id')
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
          .populate('scholarship', 'name type applicationDeadline scholarshipLevel managingCollege managingAcademicUnit')
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

      // Update status
      application.updateStatus(status, req.user._id, notes, reason);
      application.reviewedBy = req.user._id;
      application.reviewNotes = notes;

      if (status === ApplicationStatus.REJECTED) {
        application.rejectionReason = reason;
      }

      // If approved, increment scholarship filled slots
      if (status === ApplicationStatus.APPROVED) {
        await Scholarship.findByIdAndUpdate(
          application.scholarship._id,
          { $inc: { filledSlots: 1 } }
        );
      }

      await application.save();

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

/**
 * @route   GET /api/applications/review-queue
 * @desc    Get pending review queue (scope-filtered)
 * @access  Admin
 */
router.get('/review-queue',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  async (req, res, next) => {
    try {
      const { limit = 50 } = req.query;

      // Get accessible scholarships for this admin
      const scholarshipScopeFilter = getScholarshipScopeFilter(req.user);
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
        .populate('scholarship', 'name type applicationDeadline scholarshipLevel managingCollege')
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
 * @route   GET /api/applications/stats
 * @desc    Get application statistics (scope-filtered)
 * @access  Admin
 */
router.get('/stats/overview',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  async (req, res, next) => {
    try {
      const { scholarshipId, academicYear, semester } = req.query;

      // Get accessible scholarships for this admin
      const scholarshipScopeFilter = getScholarshipScopeFilter(req.user);
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
        matchStage.scholarship = scholarshipId;
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

module.exports = router;

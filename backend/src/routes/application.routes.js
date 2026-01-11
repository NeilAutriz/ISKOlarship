// =============================================================================
// ISKOlarship - Application Routes
// Student application management and tracking
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { Application, ApplicationStatus, Scholarship, User } = require('../models');
const { authMiddleware, requireRole, requireAdminLevel, requireOwnerOrAdmin } = require('../middleware/auth.middleware');
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
    const { status, page = 1, limit = 20 } = req.query;

    const query = { applicant: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('scholarship', 'name type sponsor applicationDeadline awardAmount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Application.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        applications,
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
  applicationValidation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { scholarshipId, personalStatement, additionalInfo, documents } = req.body;

      // Debug logging
      console.log('📝 Application Creation Request:');
      console.log('Documents received:', documents);
      console.log('Documents type:', typeof documents);
      console.log('Documents is array:', Array.isArray(documents));
      console.log('Documents length:', documents?.length);

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
      const applicantSnapshot = {
        studentNumber: req.user.studentProfile?.studentNumber,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        gwa: req.user.studentProfile?.academicInfo?.currentGWA,
        classification: req.user.studentProfile?.academicInfo?.yearLevel,
        college: req.user.studentProfile?.academicInfo?.college,
        course: req.user.studentProfile?.academicInfo?.course,
        major: req.user.studentProfile?.academicInfo?.major,
        annualFamilyIncome: req.user.studentProfile?.financialInfo?.annualFamilyIncome,
        unitsEnrolled: req.user.studentProfile?.academicInfo?.unitsEnrolled,
        unitsPassed: req.user.studentProfile?.academicInfo?.unitsPassed,
        provinceOfOrigin: req.user.studentProfile?.personalInfo?.provinceOfOrigin,
        citizenship: req.user.studentProfile?.personalInfo?.citizenship,
        stBracket: req.user.studentProfile?.financialInfo?.stBracket,
        hasExistingScholarship: req.user.studentProfile?.scholarshipInfo?.hasExistingScholarship,
        hasThesisGrant: req.user.studentProfile?.scholarshipInfo?.hasThesisGrant,
        hasApprovedThesisOutline: req.user.studentProfile?.scholarshipInfo?.hasApprovedThesisOutline,
        hasDisciplinaryAction: req.user.studentProfile?.academicInfo?.hasDisciplinaryAction,
        hasFailingGrade: req.user.studentProfile?.academicInfo?.hasFailingGrade
      };

      // Process documents if provided
      const processedDocuments = documents && Array.isArray(documents) ? documents.map(doc => ({
        name: doc.name,
        documentType: doc.documentType,
        url: doc.url || '',
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedAt: new Date()
      })) : [];

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
 * @route   GET /api/applications
 * @desc    Get all applications (admin)
 * @access  Admin
 */
router.get('/',
  authMiddleware,
  requireRole('admin'),
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

      const query = {};
      if (status) query.status = status;
      if (scholarshipId) query.scholarship = scholarshipId;

      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [applications, total] = await Promise.all([
        Application.find(query)
          .populate('applicant', 'firstName lastName email studentProfile')
          .populate('scholarship', 'name type applicationDeadline')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Application.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          applications,
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
 * @route   PUT /api/applications/:id/status
 * @desc    Update application status (admin)
 * @access  Admin
 */
router.put('/:id/status',
  authMiddleware,
  requireRole('admin'),
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
 * @desc    Get pending review queue
 * @access  Admin
 */
router.get('/review-queue',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { limit = 50 } = req.query;

      const applications = await Application.getPendingReviewQueue(parseInt(limit));

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/applications/stats
 * @desc    Get application statistics
 * @access  Admin
 */
router.get('/stats/overview',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { scholarshipId, academicYear, semester } = req.query;

      const matchStage = {};
      if (scholarshipId) matchStage.scholarship = scholarshipId;
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

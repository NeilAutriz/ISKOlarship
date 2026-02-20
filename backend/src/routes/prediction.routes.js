// =============================================================================
// ISKOlarship - Prediction Routes
// Logistic Regression ML predictions for scholarship matching
// Based on Research Paper: Logistic Regression model for probability estimation
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, requireRole, requireAdminLevel } = require('../middleware/auth.middleware');
const { Scholarship, Application, User } = require('../models');
const predictionService = require('../services/prediction.service');
const {
  canManageApplication,
  getScopedScholarshipIds
} = require('../middleware/adminScope.middleware');

// =============================================================================
// Prediction Endpoints
// =============================================================================

/**
 * @route   POST /api/predictions/eligibility
 * @desc    Check eligibility for a scholarship
 * @access  Private (Student)
 */
router.post('/eligibility',
  authMiddleware,
  [body('scholarshipId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { scholarshipId } = req.body;

      // Get scholarship
      const scholarship = await Scholarship.findById(scholarshipId);
      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      // Check eligibility using rule-based filtering
      const eligibilityResult = await predictionService.checkEligibility(
        req.user,
        scholarship
      );

      res.json({
        success: true,
        data: eligibilityResult
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/predictions/probability
 * @desc    Get approval probability using logistic regression
 * @access  Private (Student)
 */
router.post('/probability',
  authMiddleware,
  [body('scholarshipId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { scholarshipId } = req.body;

      // Get scholarship
      const scholarship = await Scholarship.findById(scholarshipId);
      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      // Run logistic regression prediction
      const prediction = await predictionService.predictApprovalProbability(
        req.user,
        scholarship
      );

      res.json({
        success: true,
        data: prediction
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/predictions/application/:applicationId
 * @desc    Get prediction for a specific application (for admin review)
 * @access  Admin (scope-checked — must manage the application's scholarship)
 */
router.post('/application/:applicationId',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { applicationId } = req.params;

      // Get the application with applicant and scholarship data
      const application = await Application.findById(applicationId)
        .populate('applicant', 'firstName lastName email studentProfile')
        .populate('scholarship');

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Scope check: admin must be able to manage this application's scholarship
      if (!canManageApplication(req.user, application)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to run predictions on this application'
        });
      }

      // If applicant or scholarship was deleted, return a default prediction
      // instead of 404 so the dashboard doesn't error out
      if (!application.applicant || !application.scholarship) {
        return res.json({
          success: true,
          data: {
            probability: 0,
            probabilityPercentage: 0,
            confidence: 'low',
            eligible: false,
            factors: [],
            modelVersion: 'fallback',
            applicantName: application.applicant
              ? `${application.applicant.firstName || ''} ${application.applicant.lastName || ''}`.trim()
              : 'Unknown Applicant',
            scholarshipName: application.scholarship?.name || 'Unknown Scholarship',
            scholarshipId: application.scholarship?._id || null,
            note: 'Prediction unavailable – referenced data may have been removed'
          }
        });
      }

      // Run prediction using the applicant's profile
      const prediction = await predictionService.predictApprovalProbability(
        application.applicant,
        application.scholarship
      );

      res.json({
        success: true,
        data: {
          ...prediction,
          applicantName: `${application.applicant.firstName || ''} ${application.applicant.lastName || ''}`.trim(),
          scholarshipName: application.scholarship.name,
          scholarshipId: application.scholarship._id
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/predictions/recommend
 * @desc    Get scholarship recommendations for user
 * @access  Private (Student)
 */
router.post('/recommend',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { limit = 10 } = req.body;

      // Get recommendations
      const recommendations = await predictionService.getRecommendations(
        req.user,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/predictions/batch
 * @desc    Get predictions for multiple scholarships
 * @access  Private (Student)
 */
router.post('/batch',
  authMiddleware,
  [body('scholarshipIds').isArray().withMessage('scholarshipIds must be an array')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { scholarshipIds } = req.body;

      // Get scholarships
      const scholarships = await Scholarship.find({
        _id: { $in: scholarshipIds }
      });

      // Run predictions for each
      const predictions = await Promise.all(
        scholarships.map(async (scholarship) => {
          const eligibility = await predictionService.checkEligibility(req.user, scholarship);
          const probability = eligibility.passed
            ? await predictionService.predictApprovalProbability(req.user, scholarship)
            : null;

          return {
            scholarshipId: scholarship._id,
            scholarshipName: scholarship.name,
            eligibility,
            probability
          };
        })
      );

      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Admin Analytics Endpoints
// =============================================================================

/**
 * @route   GET /api/predictions/model/stats
 * @desc    Get model performance statistics (scoped to admin's scholarships)
 * @access  Admin
 */
router.get('/model/stats',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      // For non-university admins, we still return global model stats
      // but they should understand it reflects overall model performance
      const stats = await predictionService.getModelStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/predictions/model/train
 * @desc    Trigger model retraining with historical data
 * @access  Admin (University only — retrains global model)
 */
router.post('/model/train',
  authMiddleware,
  requireRole('admin'),
  requireAdminLevel('university'),
  async (req, res, next) => {
    try {
      // Train the model using historical application data
      const trainingResult = await predictionService.trainModel();

      if (trainingResult.status === 'failed') {
        return res.status(400).json({
          success: false,
          message: trainingResult.message,
          data: trainingResult
        });
      }

      res.json({
        success: true,
        message: 'Model training completed successfully',
        data: trainingResult
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/predictions/analytics/factors
 * @desc    Get feature importance analysis (scoped)
 * @access  Admin
 */
router.get('/analytics/factors',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const factors = await predictionService.getFeatureImportance();
      
      res.json({
        success: true,
        data: factors
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/predictions/model/state
 * @desc    Get current model state and weights
 * @access  Admin
 */
router.get('/model/state',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const modelState = predictionService.logisticRegression.getModelState();
      
      res.json({
        success: true,
        data: modelState
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/predictions/model/reset
 * @desc    Reset model to default weights
 * @access  Admin (University only)
 */
router.post('/model/reset',
  authMiddleware,
  requireRole('admin'),
  requireAdminLevel('university'),
  async (req, res, next) => {
    try {
      const resetResult = predictionService.logisticRegression.resetModel();
      
      res.json({
        success: true,
        message: 'Model reset to default weights',
        data: resetResult
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

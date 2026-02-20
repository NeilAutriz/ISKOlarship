// =============================================================================
// ISKOlarship - Training Routes
// API endpoints for model training and management
// =============================================================================

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const {
  trainGlobalModel,
  trainScholarshipModel,
  trainAllScholarshipModels,
  getPrediction,
  getTrainingStats
} = require('../services/training.service');
const { TrainedModel } = require('../models/TrainedModel.model');
const { Scholarship } = require('../models/Scholarship.model');
const { Application } = require('../models');

// =============================================================================
// Training Endpoints
// =============================================================================

/**
 * @route   POST /api/training/train
 * @desc    Train global model on all applications
 * @access  Admin only
 */
router.post('/train', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    
    const result = await trainGlobalModel(req.user._id);
    
    res.json({
      success: true,
      message: 'Global model trained successfully',
      data: {
        modelId: result.model._id,
        weights: result.model.weights,
        bias: result.model.bias,
        metrics: result.metrics,
        featureImportance: result.featureImportance
      }
    });
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Training failed'
    });
  }
});

/**
 * @route   POST /api/training/train/:scholarshipId
 * @desc    Train model for a specific scholarship
 * @access  Admin only
 */
router.post('/train/:scholarshipId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    
    const result = await trainScholarshipModel(scholarshipId, req.user._id);
    
    res.json({
      success: true,
      message: `Model trained successfully for ${result.scholarship.name}`,
      data: {
        modelId: result.model._id,
        scholarshipName: result.scholarship.name,
        metrics: result.metrics,
        featureImportance: result.featureImportance
      }
    });
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Training failed'
    });
  }
});

/**
 * @route   POST /api/training/train-all
 * @desc    Train models for all scholarships with sufficient data
 * @access  Admin only
 */
router.post('/train-all', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    
    const results = await trainAllScholarshipModels(req.user._id);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `Trained ${successful} models, ${failed} failed/skipped`,
      data: {
        results,
        summary: {
          successful,
          failed,
          total: results.length
        }
      }
    });
  } catch (error) {
    console.error('Batch training error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Batch training failed'
    });
  }
});

// =============================================================================
// Model Management Endpoints
// =============================================================================

/**
 * @route   GET /api/training/models
 * @desc    Get all trained models
 * @access  Admin only
 */
router.get('/models', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const models = await TrainedModel.find()
      .sort({ trainedAt: -1 })
      .populate('scholarshipId', 'name scholarshipType')
      .populate('trainedBy', 'email')
      .lean();
    
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch models'
    });
  }
});

/**
 * @route   GET /api/training/models/active
 * @desc    Get active global model
 * @access  Private (authenticated users)
 */
router.get('/models/active', authMiddleware, async (req, res) => {
  try {
    const model = await TrainedModel.findOne({
      modelType: 'global',
      isActive: true
    }).lean();
    
    if (!model) {
      return res.json({
        success: true,
        data: null,
        message: 'No active global model'
      });
    }
    
    res.json({
      success: true,
      data: {
        modelId: model._id,
        weights: model.weights,
        bias: model.bias,
        metrics: model.metrics,
        featureImportance: model.featureImportance,
        trainedAt: model.trainedAt
      }
    });
  } catch (error) {
    console.error('Error fetching active model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active model'
    });
  }
});

/**
 * @route   GET /api/training/models/scholarship/:scholarshipId
 * @desc    Get model for a specific scholarship (or fallback to global)
 * @access  Private (authenticated users)
 */
router.get('/models/scholarship/:scholarshipId', authMiddleware, async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    
    // Try scholarship-specific model first
    let model = await TrainedModel.findOne({
      scholarshipId,
      isActive: true
    }).lean();
    
    let usingFallback = false;
    
    // Fallback to global model
    if (!model) {
      model = await TrainedModel.findOne({
        modelType: 'global',
        isActive: true
      }).lean();
      usingFallback = true;
    }
    
    if (!model) {
      return res.json({
        success: true,
        data: null,
        message: 'No trained model available'
      });
    }
    
    res.json({
      success: true,
      data: {
        modelId: model._id,
        modelType: model.modelType,
        usingFallback,
        weights: model.weights,
        bias: model.bias,
        metrics: model.metrics,
        featureImportance: model.featureImportance,
        trainedAt: model.trainedAt
      }
    });
  } catch (error) {
    console.error('Error fetching scholarship model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch model'
    });
  }
});

/**
 * @route   POST /api/training/models/:modelId/activate
 * @desc    Activate a specific model
 * @access  Admin only
 */
router.post('/models/:modelId/activate', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { modelId } = req.params;
    
    const model = await TrainedModel.activateModel(modelId);
    
    res.json({
      success: true,
      message: 'Model activated successfully',
      data: {
        modelId: model._id,
        name: model.name,
        isActive: model.isActive
      }
    });
  } catch (error) {
    console.error('Error activating model:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate model'
    });
  }
});

/**
 * @route   DELETE /api/training/models/:modelId
 * @desc    Delete a model
 * @access  Admin only
 */
router.delete('/models/:modelId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { modelId } = req.params;
    
    const model = await TrainedModel.findById(modelId);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }
    
    if (model.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active model. Activate another model first.'
      });
    }
    
    await model.deleteOne();
    
    res.json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete model'
    });
  }
});

// =============================================================================
// Statistics Endpoints
// =============================================================================

/**
 * @route   GET /api/training/stats
 * @desc    Get training statistics
 * @access  Admin only
 */
router.get('/stats', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const stats = await getTrainingStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * @route   GET /api/training/scholarships/trainable
 * @desc    Get scholarships that can be trained (have enough data)
 * @access  Admin only
 */
router.get('/scholarships/trainable', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Get application counts per scholarship
    const counts = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'rejected'] } } },
      { $group: { _id: '$scholarship', count: { $sum: 1 } } }
    ]);
    
    const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));
    
    // Get all active scholarships
    const scholarships = await Scholarship.find({ status: 'active' })
      .select('name scholarshipType scholarshipLevel')
      .lean();
    
    // Add counts and trainable status
    const result = scholarships.map(s => ({
      _id: s._id,
      name: s.name,
      scholarshipType: s.scholarshipType,
      scholarshipLevel: s.scholarshipLevel,
      applicationCount: countMap.get(s._id.toString()) || 0,
      isTrainable: (countMap.get(s._id.toString()) || 0) >= 30
    }));
    
    // Sort by application count descending
    result.sort((a, b) => b.applicationCount - a.applicationCount);
    
    res.json({
      success: true,
      data: result,
      summary: {
        total: result.length,
        trainable: result.filter(r => r.isTrainable).length,
        minRequired: 30
      }
    });
  } catch (error) {
    console.error('Error fetching trainable scholarships:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarships'
    });
  }
});

module.exports = router;

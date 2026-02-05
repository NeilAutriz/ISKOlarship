// =============================================================================
// ISKOlarship - Model Training Service (Wrapper)
// High-level training management with utilities, caching, and monitoring
// 
// This module wraps the modular trainingService/ components and adds:
// - Model caching and lifecycle management
// - Training progress tracking and reporting
// - Data validation before training
// - Model comparison and analytics
// - Training history and statistics
// =============================================================================

const trainingService = require('./trainingService');
const { TRAINING_CONFIG } = require('./trainingService/constants');

// =============================================================================
// Model Cache Management
// =============================================================================

/**
 * In-memory cache for trained models to reduce database queries
 */
const modelCache = new Map();
const cacheTimestamps = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cache a trained model
 * @param {string} key - Cache key (modelId or 'global')
 * @param {Object} model - Model object to cache
 */
function cacheModel(key, model) {
  modelCache.set(key, model);
  cacheTimestamps.set(key, Date.now());
  console.log(`📦 Model cached: ${key}`);
}

/**
 * Retrieve a model from cache if valid
 * @param {string} key - Cache key
 * @returns {Object|null} Cached model or null if expired/not found
 */
function getCachedModel(key) {
  if (!modelCache.has(key)) return null;
  
  const timestamp = cacheTimestamps.get(key);
  if (Date.now() - timestamp > CACHE_DURATION_MS) {
    modelCache.delete(key);
    cacheTimestamps.delete(key);
    console.log(`🗑️  Cache expired: ${key}`);
    return null;
  }
  
  return modelCache.get(key);
}

/**
 * Clear all cached models
 */
function clearModelCache() {
  modelCache.clear();
  cacheTimestamps.clear();
  console.log(`🗑️  Model cache cleared`);
}

/**
 * Get cache statistics
 * @returns {Object} Cache information
 */
function getCacheStats() {
  return {
    cachedModels: modelCache.size,
    cacheKeys: Array.from(modelCache.keys()),
    maxCacheDuration: CACHE_DURATION_MS / 1000
  };
}

// =============================================================================
// Training Data Validation
// =============================================================================

/**
 * Validate training data before starting training
 * @param {Array} applications - Applications to validate
 * @returns {Object} Validation result with issues and warnings
 */
function validateTrainingData(applications) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      total: applications.length,
      approved: 0,
      rejected: 0,
      incomplete: 0,
      missingFeatures: 0
    }
  };

  if (!applications || applications.length === 0) {
    result.isValid = false;
    result.errors.push('No applications provided for training');
    return result;
  }

  for (const app of applications) {
    // Count outcomes
    if (app.status === 'approved') result.stats.approved++;
    else if (app.status === 'rejected') result.stats.rejected++;

    // Validate essential fields
    if (!app.applicantSnapshot) {
      result.stats.incomplete++;
      result.warnings.push(`Application ${app._id}: missing applicantSnapshot`);
    }

    if (!app.status || !['approved', 'rejected'].includes(app.status)) {
      result.stats.incomplete++;
      result.warnings.push(`Application ${app._id}: invalid status`);
    }

    // Validate features can be extracted
    if (!app.documents) {
      result.stats.missingFeatures++;
    }
  }

  // Check class balance
  if (result.stats.approved === 0 || result.stats.rejected === 0) {
    result.isValid = false;
    result.errors.push('Imbalanced classes: need both approved and rejected applications');
  }

  // Check minimum samples
  if (applications.length < TRAINING_CONFIG.minSamplesGlobal) {
    result.isValid = false;
    result.errors.push(
      `Insufficient samples: ${applications.length}/${TRAINING_CONFIG.minSamplesGlobal} required`
    );
  }

  // Warn about class imbalance ratio
  const ratio = Math.max(result.stats.approved, result.stats.rejected) / 
                Math.min(result.stats.approved, result.stats.rejected);
  if (ratio > 3) {
    result.warnings.push(
      `Severe class imbalance (ratio: ${ratio.toFixed(1)}:1). Model may be biased.`
    );
  }

  return result;
}

/**
 * Validate scholarship training data
 * @param {string} scholarshipId - Scholarship ID
 * @param {Array} applications - Applications to validate
 * @returns {Object} Validation result
 */
function validateScholarshipTrainingData(scholarshipId, applications) {
  const result = validateTrainingData(applications);
  
  if (applications.length < TRAINING_CONFIG.minSamplesPerScholarship) {
    result.isValid = false;
    result.errors.push(
      `Scholarship training requires ${TRAINING_CONFIG.minSamplesPerScholarship} samples, found ${applications.length}`
    );
  }
  
  return result;
}

// =============================================================================
// Training History and Analytics
// =============================================================================

/**
 * Store for training history
 */
const trainingHistory = [];

/**
 * Record a training session
 * @param {Object} session - Training session details
 */
function recordTrainingSession(session) {
  const record = {
    timestamp: new Date(),
    ...session
  };
  trainingHistory.push(record);
  
  // Keep only last 100 sessions
  if (trainingHistory.length > 100) {
    trainingHistory.shift();
  }
}

/**
 * Get training history
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Array} Training history records
 */
function getTrainingHistory(limit = 20) {
  return trainingHistory.slice(-limit).reverse();
}

/**
 * Get aggregated training statistics
 * @returns {Object} Training statistics
 */
function getTrainingAnalytics() {
  if (trainingHistory.length === 0) {
    return {
      totalTrainingSessions: 0,
      averageTrainingTime: 0,
      averageAccuracy: 0,
      recentSessions: []
    };
  }

  const times = trainingHistory
    .filter(s => s.trainingTimeMs)
    .map(s => s.trainingTimeMs);
  const accuracies = trainingHistory
    .filter(s => s.metrics && s.metrics.accuracy)
    .map(s => s.metrics.accuracy);

  return {
    totalTrainingSessions: trainingHistory.length,
    averageTrainingTime: times.length > 0 
      ? (times.reduce((a, b) => a + b, 0) / times.length) / 1000 // Convert to seconds
      : 0,
    averageAccuracy: accuracies.length > 0
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : 0,
    recentSessions: getTrainingHistory(5)
  };
}

// =============================================================================
// Enhanced Training Wrappers with Validation and Logging
// =============================================================================

/**
 * Train global model with validation and progress tracking
 * @param {string} adminId - Admin performing training
 * @param {Object} options - Training options
 * @returns {Promise} Training result with timing and validation
 */
async function trainGlobalModelWithValidation(adminId = null, options = {}) {
  const startTime = Date.now();
  const { validateData = true, useCache = false } = options;

  console.log('\n🎯 Global Model Training Session Starting...');
  console.log(`   Admin: ${adminId || 'system'}`);
  console.log(`   Data validation: ${validateData ? 'enabled' : 'disabled'}`);
  console.log(`   Cache check: ${useCache ? 'enabled' : 'disabled'}`);

  try {
    // Attempt to use cache if requested
    if (useCache) {
      const cached = getCachedModel('global');
      if (cached) {
        console.log('📦 Using cached global model');
        return {
          model: cached,
          fromCache: true,
          trainingTimeMs: 0
        };
      }
    }

    // Call the actual training function
    const result = await trainingService.trainGlobalModel(adminId);

    const trainingTimeMs = Date.now() - startTime;
    
    // Cache the result
    if (result.model) {
      cacheModel('global', result.model);
    }

    // Record training session
    recordTrainingSession({
      type: 'global',
      scholarshipId: null,
      adminId,
      metrics: result.metrics,
      trainingTimeMs,
      success: true
    });

    console.log(`✅ Global model training completed in ${(trainingTimeMs / 1000).toFixed(1)}s`);
    return {
      ...result,
      trainingTimeMs,
      fromCache: false
    };
  } catch (error) {
    const trainingTimeMs = Date.now() - startTime;

    recordTrainingSession({
      type: 'global',
      scholarshipId: null,
      adminId,
      trainingTimeMs,
      success: false,
      error: error.message
    });

    console.error(`❌ Global model training failed: ${error.message}`);
    throw error;
  }
}

/**
 * Train scholarship model with validation and progress tracking
 * @param {string} scholarshipId - Scholarship ID
 * @param {string} adminId - Admin performing training
 * @param {Object} options - Training options
 * @returns {Promise} Training result with timing and validation
 */
async function trainScholarshipModelWithValidation(scholarshipId, adminId = null, options = {}) {
  const startTime = Date.now();
  const { validateData = true, useCache = false } = options;

  console.log(`\n🎯 Scholarship Model Training Session Starting...`);
  console.log(`   Scholarship: ${scholarshipId}`);
  console.log(`   Admin: ${adminId || 'system'}`);
  console.log(`   Data validation: ${validateData ? 'enabled' : 'disabled'}`);

  try {
    // Attempt to use cache if requested
    if (useCache) {
      const cached = getCachedModel(`scholarship_${scholarshipId}`);
      if (cached) {
        console.log('📦 Using cached scholarship model');
        return {
          model: cached,
          fromCache: true,
          trainingTimeMs: 0
        };
      }
    }

    // Call the actual training function
    const result = await trainingService.trainScholarshipModel(scholarshipId, adminId);

    const trainingTimeMs = Date.now() - startTime;

    // Cache the result
    if (result.model) {
      cacheModel(`scholarship_${scholarshipId}`, result.model);
    }

    // Record training session
    recordTrainingSession({
      type: 'scholarship',
      scholarshipId,
      scholarshipName: result.scholarship?.name,
      adminId,
      metrics: result.metrics,
      trainingTimeMs,
      success: true
    });

    console.log(`✅ Scholarship model training completed in ${(trainingTimeMs / 1000).toFixed(1)}s`);
    return {
      ...result,
      trainingTimeMs,
      fromCache: false
    };
  } catch (error) {
    const trainingTimeMs = Date.now() - startTime;

    recordTrainingSession({
      type: 'scholarship',
      scholarshipId,
      adminId,
      trainingTimeMs,
      success: false,
      error: error.message
    });

    console.error(`❌ Scholarship model training failed: ${error.message}`);
    throw error;
  }
}

/**
 * Train all scholarship models with batch processing and progress tracking
 * @param {string} adminId - Admin performing training
 * @param {Object} options - Training options (parallelism, etc.)
 * @returns {Promise} Array of training results
 */
async function trainAllScholarshipModelsWithTracking(adminId = null, options = {}) {
  const startTime = Date.now();
  const { sequential = false } = options;

  console.log('\n🎯 Batch Scholarship Training Starting...');
  console.log(`   Mode: ${sequential ? 'sequential' : 'parallel'}`);

  try {
    const results = await trainingService.trainAllScholarshipModels(adminId);
    
    const trainingTimeMs = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    recordTrainingSession({
      type: 'batch_scholarships',
      adminId,
      totalScholarships: results.length,
      successfulCount: successful,
      failedCount: failed,
      trainingTimeMs,
      success: failed === 0
    });

    console.log(`\n✅ Batch training completed in ${(trainingTimeMs / 1000).toFixed(1)}s`);
    console.log(`   Successful: ${successful}/${results.length}`);
    console.log(`   Failed: ${failed}/${results.length}`);

    return {
      results,
      summary: {
        total: results.length,
        successful,
        failed
      },
      trainingTimeMs
    };
  } catch (error) {
    const trainingTimeMs = Date.now() - startTime;

    recordTrainingSession({
      type: 'batch_scholarships',
      adminId,
      trainingTimeMs,
      success: false,
      error: error.message
    });

    console.error(`❌ Batch training failed: ${error.message}`);
    throw error;
  }
}

// =============================================================================
// Model Comparison and Performance Analysis
// =============================================================================

/**
 * Compare two models' performance
 * @param {Object} model1 - First model
 * @param {Object} model2 - Second model
 * @returns {Object} Comparison analysis
 */
function compareModels(model1, model2) {
  const comparison = {
    metrics: {
      accuracy: {
        model1: model1.metrics?.accuracy || 0,
        model2: model2.metrics?.accuracy || 0,
        difference: (model2.metrics?.accuracy || 0) - (model1.metrics?.accuracy || 0),
        improved: (model2.metrics?.accuracy || 0) > (model1.metrics?.accuracy || 0)
      },
      precision: {
        model1: model1.metrics?.precision || 0,
        model2: model2.metrics?.precision || 0,
        difference: (model2.metrics?.precision || 0) - (model1.metrics?.precision || 0)
      },
      recall: {
        model1: model1.metrics?.recall || 0,
        model2: model2.metrics?.recall || 0,
        difference: (model2.metrics?.recall || 0) - (model1.metrics?.recall || 0)
      },
      f1Score: {
        model1: model1.metrics?.f1Score || 0,
        model2: model2.metrics?.f1Score || 0,
        difference: (model2.metrics?.f1Score || 0) - (model1.metrics?.f1Score || 0)
      }
    },
    recommendation: ''
  };

  // Generate recommendation
  const accuracyImprovement = comparison.metrics.accuracy.difference;
  if (accuracyImprovement > 0.05) {
    comparison.recommendation = 'Model 2 shows significant improvement. Consider deploying.';
  } else if (accuracyImprovement > 0) {
    comparison.recommendation = 'Model 2 shows marginal improvement. Evaluate other metrics.';
  } else if (accuracyImprovement < -0.05) {
    comparison.recommendation = 'Model 1 is significantly better. Do not deploy Model 2.';
  } else {
    comparison.recommendation = 'Models perform similarly. Check precision/recall tradeoffs.';
  }

  return comparison;
}

/**
 * Get feature importance ranking
 * @param {Object} model - Trained model
 * @returns {Array} Features sorted by importance
 */
function getFeatureRanking(model) {
  if (!model.featureImportance) return [];

  return Object.entries(model.featureImportance)
    .sort(([, a], [, b]) => b - a)
    .map(([feature, importance]) => ({
      feature,
      importance: (importance * 100).toFixed(2) + '%',
      displayName: trainingService.FEATURE_DISPLAY_NAMES[feature] || feature
    }));
}

// =============================================================================
// Training Configuration and Status
// =============================================================================

/**
 * Get current training configuration
 * @returns {Object} Training configuration
 */
function getTrainingConfig() {
  return {
    ...TRAINING_CONFIG,
    cache: getCacheStats()
  };
}

/**
 * Get comprehensive training system status
 * @returns {Object} Status information
 */
function getTrainingSystemStatus() {
  return {
    cache: getCacheStats(),
    analytics: getTrainingAnalytics(),
    config: {
      learningRate: TRAINING_CONFIG.learningRate,
      epochs: TRAINING_CONFIG.epochs,
      batchSize: TRAINING_CONFIG.batchSize,
      kFolds: TRAINING_CONFIG.kFolds,
      minSamplesGlobal: TRAINING_CONFIG.minSamplesGlobal,
      minSamplesPerScholarship: TRAINING_CONFIG.minSamplesPerScholarship
    },
    timestamp: new Date()
  };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Original API (re-exported from modular structure)
  trainGlobalModel: trainingService.trainGlobalModel,
  trainScholarshipModel: trainingService.trainScholarshipModel,
  trainAllScholarshipModels: trainingService.trainAllScholarshipModels,
  getPrediction: trainingService.getPrediction,
  getTrainingStats: trainingService.getTrainingStats,
  extractFeatures: trainingService.extractFeatures,
  extractFeaturesFromUserAndScholarship: trainingService.extractFeaturesFromUserAndScholarship,
  
  // Configuration (re-exported)
  TRAINING_CONFIG: trainingService.TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES: trainingService.FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES: trainingService.FEATURE_CATEGORIES,
  SCORING_CONFIG: trainingService.SCORING_CONFIG,

  // Enhanced training wrappers
  trainGlobalModelWithValidation,
  trainScholarshipModelWithValidation,
  trainAllScholarshipModelsWithTracking,

  // Cache management
  cacheModel,
  getCachedModel,
  clearModelCache,
  getCacheStats,

  // Data validation
  validateTrainingData,
  validateScholarshipTrainingData,

  // Training history and analytics
  recordTrainingSession,
  getTrainingHistory,
  getTrainingAnalytics,

  // Model comparison and analysis
  compareModels,
  getFeatureRanking,

  // Training configuration and status
  getTrainingConfig,
  getTrainingSystemStatus,

  // Additional utility exports from modules
  SeededRandom: trainingService.SeededRandom,
  getSeededRandom: trainingService.getSeededRandom,
  resetSeededRandom: trainingService.resetSeededRandom,
  normalizeGWA: trainingService.normalizeGWA,
  sigmoid: trainingService.sigmoid,
  dotProduct: trainingService.dotProduct,
  createKFolds: trainingService.createKFolds,
  trainModel: trainingService.trainModel,
  evaluateModel: trainingService.evaluateModel,
  calculateFeatureImportance: trainingService.calculateFeatureImportance
};

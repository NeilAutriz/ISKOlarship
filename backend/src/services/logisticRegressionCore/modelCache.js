// =============================================================================
// ISKOlarship - Model Cache Service
// Cache management and model weight loading from database
// =============================================================================

const { TrainedModel } = require('../../models');

// =============================================================================
// Cache Configuration
// =============================================================================

/**
 * Cache for loaded model weights
 * Key: 'global' or 'scholarship_{id}'
 * Value: { weights, expiry, modelId, modelType, accuracy }
 */
const modelWeightsCache = new Map();

/**
 * Cache time-to-live in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

// =============================================================================
// Cache Management Functions
// =============================================================================

/**
 * Clear the model weights cache
 * Useful when new models are trained
 */
function clearModelWeightsCache() {
  modelWeightsCache.clear();
  console.log('✅ Model weights cache cleared');
}

/**
 * Get cached weights for a key
 * @param {string} cacheKey - 'global' or 'scholarship_{id}'
 * @returns {object|null} Cached data or null if not found/expired
 */
function getCachedWeights(cacheKey) {
  const cached = modelWeightsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached;
  }
  return null;
}

/**
 * Set cached weights for a key
 * @param {string} cacheKey - 'global' or 'scholarship_{id}'
 * @param {object} data - { weights, modelId, modelType, accuracy }
 */
function setCachedWeights(cacheKey, data) {
  modelWeightsCache.set(cacheKey, {
    ...data,
    expiry: Date.now() + CACHE_TTL
  });
}

// =============================================================================
// Model Weight Loading (Two-Case Strategy)
// =============================================================================

/**
 * MODEL LOADING STRATEGY (Two Cases Only)
 * 1. PRIMARY: Scholarship-specific model (if scholarship has sufficient historical data)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * NO neutral/default weights - a trained model MUST exist for predictions.
 * Run: node scripts/train-all-scholarships.js to train models.
 */

/**
 * Load trained model weights from database
 * 
 * Two-case priority system:
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data was used to train it)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * @param {string|null} scholarshipId - Scholarship ID for specific model, null for global
 * @returns {Promise<{weights: object, modelType: string, modelId: string}>}
 * @throws {Error} If no trained model exists (global model must be trained first)
 */
async function loadModelWeights(scholarshipId = null) {
  const cacheKey = scholarshipId ? `scholarship_${scholarshipId}` : 'global';
  
  // Check cache first
  const cached = getCachedWeights(cacheKey);
  if (cached) {
    return { 
      weights: cached.weights, 
      modelType: cached.modelType, 
      modelId: cached.modelId 
    };
  }
  
  try {
    let model = null;
    let usedModelType = 'global';
    
    // CASE 1 (PRIMARY): Try scholarship-specific model first
    if (scholarshipId) {
      model = await TrainedModel.findOne({
        scholarshipId: scholarshipId,
        modelType: 'scholarship_specific',
        isActive: true
      });
      
      if (model) {
        usedModelType = 'scholarship_specific';
        console.log(`✅ Using scholarship-specific model for: ${scholarshipId}`);
      }
    }
    
    // CASE 2 (FALLBACK): Fall back to global model trained on ALL scholarships
    if (!model) {
      model = await TrainedModel.findOne({ 
        modelType: 'global', 
        isActive: true 
      }).sort({ trainedAt: -1 });
      
      if (model) {
        usedModelType = 'global';
        console.log(`📊 Using global model (fallback) for prediction`);
      }
    }
    
    // NO OTHER CASES: If no model exists, we cannot make predictions
    if (!model || !model.weights) {
      throw new Error('No trained model available. Please train a global model first using: npm run train:global');
    }
    
    // Combine weights with bias as intercept
    const weightsWithIntercept = {
      ...model.weights,
      intercept: model.bias ?? 0.0
    };
    
    // Cache the weights
    setCachedWeights(cacheKey, {
      weights: weightsWithIntercept,
      modelId: model._id,
      modelType: usedModelType,
      accuracy: model.metrics?.accuracy
    });
    
    return { 
      weights: weightsWithIntercept, 
      modelType: usedModelType, 
      modelId: model._id 
    };
  } catch (error) {
    console.error('Error loading trained model weights:', error.message);
    throw error; // Re-throw - no fallback to neutral weights
  }
}

/**
 * Get global model from cache (for model state inspection)
 * @returns {object|null} Cached global model data or null
 */
function getGlobalModelFromCache() {
  return modelWeightsCache.get('global') || null;
}

module.exports = {
  loadModelWeights,
  clearModelWeightsCache,
  getCachedWeights,
  setCachedWeights,
  getGlobalModelFromCache,
  CACHE_TTL
};

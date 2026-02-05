// =============================================================================
// ISKOlarship - Model Management
// Functions for inspecting and managing model state
// =============================================================================

const { MODEL_CONFIG } = require('./constants');
const { getGlobalModelFromCache, clearModelWeightsCache } = require('./modelCache');

// =============================================================================
// Model State Inspection
// =============================================================================

/**
 * Get current model state from cache
 * Provides information about whether a model is loaded and its configuration
 * 
 * @returns {object} Model state information
 */
function getModelState() {
  const cached = getGlobalModelFromCache();
  
  return {
    trained: !!cached,
    trainingDate: cached ? new Date() : null,
    trainingSize: 0,
    metrics: cached ? { accuracy: cached.accuracy } : null,
    version: '3.0.0',
    source: cached ? 'database' : 'none',
    config: MODEL_CONFIG
  };
}

/**
 * Get feature importance rankings from cached weights
 * Returns null if no trained model is cached
 * 
 * @returns {Array|null} Array of feature importance objects or null
 */
function getFeatureImportance() {
  // Use cached weights if available
  const cached = getGlobalModelFromCache();
  
  if (!cached?.weights) {
    return null; // No trained model available
  }
  
  const weights = cached.weights;
  
  let totalAbsolute = 0;
  const absoluteWeights = {};
  
  for (const [name, weight] of Object.entries(weights)) {
    if (name === 'intercept') continue;
    const absWeight = Math.abs(weight);
    absoluteWeights[name] = absWeight;
    totalAbsolute += absWeight;
  }
  
  return Object.entries(absoluteWeights)
    .map(([name, absWeight]) => ({
      feature: name,
      weight: weights[name],
      absoluteWeight: absWeight,
      importance: totalAbsolute > 0 ? absWeight / totalAbsolute : 0,
      direction: weights[name] > 0 ? 'positive' : 'negative'
    }))
    .sort((a, b) => b.absoluteWeight - a.absoluteWeight);
}

/**
 * Reset model cache
 * Clears all cached model weights
 * 
 * @returns {object} Reset confirmation message
 */
function resetModel() {
  clearModelWeightsCache();
  return {
    trained: false,
    message: 'Cache cleared. Run training script to train new model.',
    version: '3.0.0'
  };
}

module.exports = {
  getModelState,
  getFeatureImportance,
  resetModel
};

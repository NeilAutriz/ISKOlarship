// =============================================================================
// ISKOlarship - Logistic Regression Service
// Wrapper and re-export for the modular logistic regression core system
// Training is done via training.service.js
// =============================================================================

/**
 * LOGISTIC REGRESSION CORE MODULE STRUCTURE
 * 
 * This file provides convenience wrappers and re-exports from the modular 
 * logisticRegressionCore/ folder. See that folder for the organized implementation:
 * 
 * logisticRegressionCore/
 * ├── constants.js       - SCORING constants and MODEL_CONFIG
 * ├── modelCache.js      - Cache management and model weight loading
 * ├── normalizers.js     - Mathematical functions (sigmoid, normalizers)
 * ├── features.js        - Feature extraction from user/scholarship data
 * ├── factors.js         - Factor generation for human-readable output
 * ├── prediction.js      - Main predictAsync function
 * ├── modelManagement.js - Model state inspection and reset
 * └── index.js           - Re-exports for backward compatibility
 * 
 * MODEL LOADING STRATEGY (Two Cases Only):
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * NO neutral/default weights - a trained model MUST exist for predictions.
 */

// =============================================================================
// Import from modular logistic regression core system
// =============================================================================

const logisticRegressionCore = require('./logisticRegressionCore');

// Destructure commonly used exports for convenience
const {
  // Main prediction function
  predictAsync,
  getPredictionFactors,
  
  // Model management
  getModelState,
  getFeatureImportance,
  resetModel,
  loadModelWeights,
  clearModelWeightsCache,
  
  // Utilities
  sigmoid,
  normalizeGWA,
  normalizeIncome,
  normalizeSTBracket,
  normalizeYearLevel,
  calculateConfidence,
  
  // Feature extraction
  extractFeatures,
  calculateEligibilityScore,
  
  // Constants
  SCORING,
  MODEL_CONFIG,
  FACTOR_LABELS
} = logisticRegressionCore;

// =============================================================================
// Convenience Wrapper Functions
// =============================================================================

/**
 * Run a complete prediction for a user and scholarship
 * This is the main entry point for making predictions
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Prediction result with probability, factors, and metadata
 * @throws {Error} If no trained model exists
 * 
 * @example
 * const result = await runPrediction(user, scholarship);
 * console.log(result.probabilityPercentage); // e.g., 75
 * console.log(result.modelType); // 'scholarship_specific' or 'global'
 */
async function runPrediction(user, scholarship) {
  return await predictAsync(user, scholarship);
}

/**
 * Get a quick summary of prediction factors without full model evaluation
 * Useful for displaying factor breakdowns in the UI
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Factors grouped by category
 */
function getQuickFactors(user, scholarship) {
  return getPredictionFactors(user, scholarship);
}

/**
 * Check if a trained model is available
 * Returns true if either scholarship-specific or global model exists
 * 
 * @returns {boolean} Whether a trained model is available
 */
function isModelTrained() {
  const state = getModelState();
  return state.trained;
}

/**
 * Get normalized feature values for a user-scholarship pair
 * Useful for debugging and understanding how features are computed
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Extracted and normalized feature values
 */
function getFeatureValues(user, scholarship) {
  return extractFeatures(user, scholarship);
}

/**
 * Calculate the sigmoid probability from a z-score
 * Bounded to 15%-95% range for realistic predictions
 * 
 * @param {number} z - The z-score (linear combination of features and weights)
 * @returns {number} Probability between 0.15 and 0.95
 */
function calculateProbability(z) {
  return sigmoid(z);
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Convenience wrapper functions
  runPrediction,
  getQuickFactors,
  isModelTrained,
  getFeatureValues,
  calculateProbability,
  
  // Main prediction function (from module)
  predictAsync,
  getPredictionFactors,
  
  // Model management (from module)
  getModelState,
  getFeatureImportance,
  resetModel,
  loadModelWeights,
  clearModelWeightsCache,
  
  // Utilities (from module)
  sigmoid,
  normalizeGWA,
  normalizeIncome,
  normalizeSTBracket,
  normalizeYearLevel,
  calculateConfidence,
  
  // Feature extraction (from module)
  extractFeatures,
  calculateEligibilityScore,
  
  // Constants (from module)
  SCORING,
  MODEL_CONFIG,
  FACTOR_LABELS
}; 
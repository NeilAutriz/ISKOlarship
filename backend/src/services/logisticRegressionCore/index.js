// =============================================================================
// ISKOlarship - Prediction Module
// Re-exports all prediction-related functions for backward compatibility
// =============================================================================

/**
 * PREDICTION MODULE STRUCTURE
 * 
 * This module is organized into the following files:
 * 
 * constants.js      - SCORING constants and MODEL_CONFIG
 * modelCache.js     - Cache management and model weight loading
 * normalizers.js    - Mathematical functions (sigmoid, normalizers)
 * features.js       - Feature extraction from user/scholarship data
 * factors.js        - Factor generation for human-readable output
 * prediction.js     - Main predictAsync function
 * modelManagement.js - Model state inspection and reset
 * index.js          - This file, re-exports for backward compatibility
 * 
 * MODEL LOADING STRATEGY (Two Cases Only):
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * NO neutral/default weights - a trained model MUST exist for predictions.
 */

// =============================================================================
// Imports
// =============================================================================

const { SCORING, MODEL_CONFIG, FACTOR_LABELS } = require('./constants');
const { 
  loadModelWeights, 
  clearModelWeightsCache, 
  getCachedWeights,
  getGlobalModelFromCache 
} = require('./modelCache');
const { 
  sigmoid, 
  normalizeGWA, 
  normalizeYearLevel, 
  normalizeIncome, 
  normalizeSTBracket,
  calculateConfidence 
} = require('./normalizers');
const { 
  extractFeatures, 
  calculateEligibilityScore, 
  getSimplifiedFeatures 
} = require('./features');
const { 
  generateFactors, 
  generateFactorDescription, 
  formatFactorName, 
  getPredictionFactors 
} = require('./factors');
const { predictAsync } = require('./prediction');
const { 
  getModelState, 
  getFeatureImportance, 
  resetModel 
} = require('./modelManagement');

// =============================================================================
// Exports (Backward Compatible)
// =============================================================================

module.exports = {
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
  getSimplifiedFeatures,
  
  // Factor generation
  generateFactors,
  generateFactorDescription,
  formatFactorName,
  
  // Constants
  SCORING,
  MODEL_CONFIG,
  FACTOR_LABELS
};

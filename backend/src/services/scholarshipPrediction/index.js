// =============================================================================
// ISKOlarship - Prediction Service Module
// Re-exports all prediction service functions for backward compatibility
// =============================================================================

/**
 * PREDICTION SERVICE MODULE STRUCTURE
 * 
 * This module is organized into the following files:
 * 
 * constants.js       - MODEL_VERSION, field mappings, match level thresholds
 * features.js        - Feature extraction and normalization
 * eligibility.js     - Eligibility checking wrapper
 * factors.js         - Detailed factor analysis and recommendations
 * prediction.js      - Main prediction function using logistic regression
 * recommendations.js - Scholarship recommendation system
 * analytics.js       - Model statistics, feature importance, training
 * index.js           - This file, re-exports for backward compatibility
 * 
 * HYBRID MATCHING APPROACH:
 * 1. Rule-based filtering (eligibility checks)
 * 2. Logistic regression prediction (probability scoring)
 * 
 * MODEL LOADING STRATEGY (Two Cases Only):
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 */

// =============================================================================
// Imports
// =============================================================================

const { MODEL_VERSION, MATCH_LEVELS, YEAR_LEVEL_MAP, ST_BRACKET_MAP, FIELD_NAME_MAP } = require('./constants');
const { sigmoid, extractFeatures } = require('./features');
const { checkEligibility } = require('./eligibility');
const { formatFactorName, analyzeDetailedFactors, generateRecommendation } = require('./factors');
const { predictApprovalProbability, getMatchLevel } = require('./prediction');
const { getRecommendations } = require('./recommendations');
const { getModelStats, getFeatureImportance, trainModel } = require('./analytics');

// Import logistic regression for re-export
const logisticRegression = require('../logisticRegression.service');

// =============================================================================
// Exports (Backward Compatible)
// =============================================================================

module.exports = {
  // Main functions (matching original prediction.service.js exports)
  checkEligibility,
  predictApprovalProbability,
  getRecommendations,
  getModelStats,
  getFeatureImportance,
  trainModel,
  MODEL_VERSION,
  
  // Re-export logistic regression utilities for backward compatibility
  logisticRegression: {
    getModelState: logisticRegression.getModelState,
    resetModel: logisticRegression.resetModel,
    clearModelWeightsCache: logisticRegression.clearModelWeightsCache
  },
  
  // Additional utilities (not in original but useful)
  sigmoid,
  extractFeatures,
  formatFactorName,
  analyzeDetailedFactors,
  generateRecommendation,
  getMatchLevel,
  
  // Constants
  MATCH_LEVELS,
  YEAR_LEVEL_MAP,
  ST_BRACKET_MAP,
  FIELD_NAME_MAP
};

// =============================================================================
// ISKOlarship - Prediction Service
// Wrapper and re-export for the modular scholarship prediction system
// 
// Implements Hybrid Matching: Rule-Based Filtering + Logistic Regression
// Based on Research Paper: "ISKOlarship: Web-Based Scholarship Platform"
// 
// Two-Stage Approach:
// 1. RULE-BASED FILTERING: Binary eligibility checks (pass/fail)
//    - Range-based: GWA, Income, Units (min/max comparisons)
//    - List-based: Year Level, College, Course, ST Bracket (must be in list)
//    - Boolean: Has Thesis, No Other Scholarship, etc. (true/false)
//
// 2. LOGISTIC REGRESSION: Success probability prediction (0-100%)
//    - Uses 7 continuous features from eligible applications
//    - Trained on historical UPLB scholarship data
//    - Accuracy: 91% (Philippine education context)
//
// =============================================================================

/**
 * SCHOLARSHIP PREDICTION MODULE STRUCTURE
 * 
 * This file provides convenience wrappers and re-exports from the modular 
 * scholarshipPrediction/ folder. See scholarshipPrediction/ folder for organization:
 * 
 * scholarshipPrediction/
 * ├── constants.js       - MODEL_VERSION, field mappings, thresholds
 * ├── features.js        - Feature extraction and normalization
 * ├── eligibility.js     - Eligibility checking wrapper
 * ├── factors.js         - Detailed factor analysis and recommendations
 * ├── prediction.js      - Main prediction function
 * ├── recommendations.js - Scholarship recommendation system
 * ├── analytics.js       - Model statistics, feature importance, training
 * └── index.js           - Re-exports for backward compatibility
 * 
 * CANONICAL FIELD NAMES (from User.model.js - studentProfile):
 * - studentProfile.gwa (General Weighted Average, 1.0-5.0)
 * - studentProfile.classification (Year level)
 * - studentProfile.college (Full college name)
 * - studentProfile.course (Course/program name)
 * - studentProfile.annualFamilyIncome (Annual family income in PHP)
 * - studentProfile.stBracket (ST bracket)
 * - studentProfile.unitsEnrolled (Current units enrolled)
 * - studentProfile.unitsPassed (Total units passed)
 */

// =============================================================================
// Import from modular scholarship prediction system
// =============================================================================

const scholarshipPrediction = require('./scholarshipPrediction');

// Destructure all exports for convenience and backward compatibility
const {
  // Main functions
  checkEligibility,
  predictApprovalProbability,
  getRecommendations,
  getModelStats,
  getFeatureImportance,
  trainModel,
  MODEL_VERSION,
  logisticRegression,
  
  // Additional utilities
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
} = scholarshipPrediction;

// =============================================================================
// Convenience Wrapper Functions
// =============================================================================

/**
 * Run a complete eligibility check and prediction for a user and scholarship
 * Combines both stages of the hybrid matching approach
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Combined eligibility and prediction result
 * 
 * @example
 * const result = await runFullAnalysis(user, scholarship);
 * console.log(result.eligible); // true/false
 * console.log(result.prediction.probabilityPercentage); // 0-100
 */
async function runFullAnalysis(user, scholarship) {
  const eligibility = await checkEligibility(user, scholarship);
  
  if (eligibility.passed) {
    const prediction = await predictApprovalProbability(user, scholarship);
    return {
      eligible: true,
      eligibility,
      prediction,
      recommendation: prediction.recommendation
    };
  }
  
  return {
    eligible: false,
    eligibility,
    prediction: null,
    recommendation: 'You do not meet the eligibility requirements for this scholarship.'
  };
}

/**
 * Get a quick eligibility summary without full prediction
 * Useful for listing scholarships with eligibility status
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Quick eligibility summary
 */
async function getQuickEligibility(user, scholarship) {
  const eligibility = await checkEligibility(user, scholarship);
  return {
    passed: eligibility.passed,
    score: eligibility.score,
    failedChecks: eligibility.checks.filter(c => !c.passed).length,
    totalChecks: eligibility.checks.length
  };
}

/**
 * Check if the prediction model is ready for use
 * 
 * @returns {boolean} Whether a trained model is available
 */
function isModelReady() {
  const state = logisticRegression.getModelState();
  return state.trained;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Convenience wrapper functions
  runFullAnalysis,
  getQuickEligibility,
  isModelReady,
  
  // Main functions (from module)
  checkEligibility,
  predictApprovalProbability,
  getRecommendations,
  getModelStats,
  getFeatureImportance,
  trainModel,
  MODEL_VERSION,
  
  // Re-export logistic regression utilities for backward compatibility
  logisticRegression,
  
  // Additional utilities (from module)
  sigmoid,
  extractFeatures,
  formatFactorName,
  analyzeDetailedFactors,
  generateRecommendation,
  getMatchLevel,
  
  // Constants (from module)
  MATCH_LEVELS,
  YEAR_LEVEL_MAP,
  ST_BRACKET_MAP,
  FIELD_NAME_MAP
};

// =============================================================================
// ISKOlarship - Eligibility Service
// Backward compatibility wrapper for the modular eligibility system
// 
// NOTE: This file exists for backward compatibility with routes that import
// from 'eligibility.service'. All actual logic is in:
// - ./eligibility/ (modular system)
// - ./prediction.service.js (combined eligibility + prediction)
// =============================================================================

const predictionService = require('./prediction.service');

/**
 * Calculate eligibility for a user and scholarship
 * Delegates to prediction service which uses the modular eligibility system
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Eligibility result with passed status, score, and checks
 */
async function calculateEligibility(user, scholarship) {
  return await predictionService.checkEligibility(user, scholarship);
}

/**
 * Run prediction for a user and scholarship
 * Returns both eligibility and success probability
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Prediction result with probability and factors
 */
async function runPrediction(user, scholarship) {
  return await predictionService.predictApprovalProbability(user, scholarship);
}

module.exports = {
  calculateEligibility,
  runPrediction
};

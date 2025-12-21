// =============================================================================
// ISKOlarship - Eligibility Service
// Rule-based filtering for scholarship eligibility
// =============================================================================

const predictionService = require('./prediction.service');

/**
 * Calculate eligibility for a user and scholarship
 * Wrapper around prediction service for compatibility
 */
async function calculateEligibility(user, scholarship) {
  return await predictionService.checkEligibility(user, scholarship);
}

/**
 * Run prediction for a user and scholarship
 * Wrapper around prediction service for compatibility
 */
async function runPrediction(user, scholarship) {
  return await predictionService.predictApprovalProbability(user, scholarship);
}

module.exports = {
  calculateEligibility,
  runPrediction
};

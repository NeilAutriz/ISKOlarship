// =============================================================================
// ISKOlarship - Eligibility Wrapper
// Wrapper for the modular eligibility system with backward compatibility
// =============================================================================

const eligibilityModule = require('../eligibility');

/**
 * Complete Eligibility Check - Uses new modular system
 * Combines range-based, list-based, and boolean checks
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Eligibility result with checks and stages
 */
async function checkEligibility(user, scholarship) {
  // Use the new modular eligibility system
  const result = await eligibilityModule.checkEligibility(user, scholarship);
  
  // Transform to legacy format for backward compatibility
  return {
    passed: result.passed,
    score: result.score,
    checks: result.checks,
    summary: result.summary,
    stages: {
      academic: {
        checks: result.checks.filter(c => c.category === 'academic'),
        passed: result.checks.filter(c => c.category === 'academic').every(c => c.passed)
      },
      financial: {
        checks: result.checks.filter(c => c.category === 'financial'),
        passed: result.checks.filter(c => c.category === 'financial').every(c => c.passed)
      },
      additional: {
        checks: result.checks.filter(c => c.category === 'status' || c.category === 'location' || c.category === 'personal'),
        passed: result.checks.filter(c => c.category === 'status' || c.category === 'location' || c.category === 'personal').every(c => c.passed)
      }
    },
    // New: detailed breakdown by check type
    breakdown: result.breakdown
  };
}

module.exports = {
  checkEligibility
};

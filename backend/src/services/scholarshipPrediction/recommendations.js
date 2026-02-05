// =============================================================================
// ISKOlarship - Recommendation System
// Scholarship recommendations for users
// =============================================================================

const { Scholarship } = require('../../models');
const { checkEligibility } = require('./eligibility');
const { predictApprovalProbability } = require('./prediction');

/**
 * Get scholarship recommendations for a user
 * Returns both fully eligible and partial matches (>= 50% eligibility score)
 * 
 * @param {Object} user - User object with studentProfile
 * @param {number} limit - Maximum number of recommendations to return (default: 10)
 * @param {boolean} includePartial - Include partial matches (default: true)
 * @param {number} minEligibilityScore - Minimum eligibility score for partial matches (default: 50)
 * @returns {Promise<Array>} Array of scored scholarship recommendations
 */
async function getRecommendations(user, limit = 10, includePartial = true, minEligibilityScore = 50) {
  // Get active scholarships
  const scholarships = await Scholarship.findActive();

  // Score each scholarship
  const scored = await Promise.all(
    scholarships.map(async (scholarship) => {
      const eligibility = await checkEligibility(user, scholarship);
      
      // Calculate overall eligibility score percentage
      const eligibilityScore = eligibility.score || 0;
      
      // For fully eligible scholarships, get ML prediction
      if (eligibility.passed) {
        const prediction = await predictApprovalProbability(user, scholarship);
        
        return {
          scholarship: {
            _id: scholarship._id,
            name: scholarship.name,
            type: scholarship.type,
            sponsor: scholarship.sponsor,
            awardAmount: scholarship.awardAmount,
            applicationDeadline: scholarship.applicationDeadline,
            daysUntilDeadline: scholarship.daysUntilDeadline,
            description: scholarship.description
          },
          score: prediction.probability,
          eligibilityScore: 100,
          eligible: true,
          matchType: 'full',
          eligibility,
          prediction
        };
      }
      
      // For partial matches, use eligibility score
      if (includePartial && eligibilityScore >= minEligibilityScore) {
        // Get the failed checks for display
        const failedChecks = eligibility.checks.filter(c => !c.passed);
        
        return {
          scholarship: {
            _id: scholarship._id,
            name: scholarship.name,
            type: scholarship.type,
            sponsor: scholarship.sponsor,
            awardAmount: scholarship.awardAmount,
            applicationDeadline: scholarship.applicationDeadline,
            daysUntilDeadline: scholarship.daysUntilDeadline,
            description: scholarship.description
          },
          score: eligibilityScore,
          eligibilityScore: eligibilityScore,
          eligible: false,
          matchType: 'partial',
          eligibility,
          failedChecks: failedChecks.map(c => ({
            criterion: c.criterion,
            applicantValue: c.applicantValue,
            requiredValue: c.requiredValue,
            notes: c.notes
          }))
        };
      }
      
      // Not eligible and doesn't meet partial match threshold
      return null;
    })
  );

  // Filter out nulls, sort by score, and return top recommendations
  // Prioritize full matches over partial matches
  return scored
    .filter(s => s !== null)
    .sort((a, b) => {
      // Full matches come first
      if (a.matchType === 'full' && b.matchType !== 'full') return -1;
      if (a.matchType !== 'full' && b.matchType === 'full') return 1;
      // Then sort by score
      return b.score - a.score;
    })
    .slice(0, limit);
}

module.exports = {
  getRecommendations
};

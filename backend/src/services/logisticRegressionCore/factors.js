// =============================================================================
// ISKOlarship - Factor Generation
// Generate human-readable prediction factors for display
// =============================================================================

const { MODEL_CONFIG, FACTOR_LABELS } = require('./constants');
const { getSimplifiedFeatures } = require('./features');

// =============================================================================
// Factor Generation
// =============================================================================

/**
 * Generate factor descriptions based on contributions and student data
 * 
 * @param {object} contributions - Object with feature contributions { featureName: { value, weight, contribution } }
 * @param {object} studentProfile - Student profile data
 * @param {object} criteria - Scholarship eligibility criteria
 * @param {object} matchData - Match data { yearLevels, stBrackets, collegeMatch, courseMatch, eligibilityScore, matchedCriteria, totalCriteria }
 * @returns {Array} Array of factor objects with descriptions
 */
function generateFactors(contributions, studentProfile, criteria, matchData) {
  const { 
    yearLevels, 
    stBrackets, 
    collegeMatch, 
    courseMatch, 
    eligibilityScore, 
    matchedCriteria, 
    totalCriteria 
  } = matchData;
  
  // Calculate total absolute contribution for normalization
  let totalAbsContribution = 0;
  for (const c of Object.values(contributions)) {
    totalAbsContribution += Math.abs(c.contribution);
  }
  
  // Build factors array for display
  const factors = Object.entries(contributions)
    .filter(([name]) => name !== 'applicationTiming') // Don't show timing in prediction
    .map(([name, data]) => {
      const normalizedContribution = totalAbsContribution > 0 
        ? data.contribution / totalAbsContribution 
        : 0;
      
      // Generate personalized description
      const description = generateFactorDescription(
        name, 
        studentProfile, 
        criteria, 
        matchData
      );
      
      return {
        factor: FACTOR_LABELS[name] || name,
        contribution: normalizedContribution,
        rawContribution: data.contribution,
        value: data.value,
        weight: data.weight,
        description: description,
        met: data.value >= 0.5
      };
    })
    .sort((a, b) => Math.abs(b.rawContribution) - Math.abs(a.rawContribution));
  
  return factors;
}

/**
 * Generate human-readable description for a specific factor
 * 
 * @param {string} factorName - Name of the factor (e.g., 'gwaScore')
 * @param {object} studentProfile - Student profile data
 * @param {object} criteria - Scholarship eligibility criteria
 * @param {object} matchData - Match data for contextual descriptions
 * @returns {string} Human-readable description
 */
function generateFactorDescription(factorName, studentProfile, criteria, matchData) {
  const { yearLevels, stBrackets, collegeMatch, courseMatch, eligibilityScore, matchedCriteria, totalCriteria } = matchData;
  
  switch (factorName) {
    case 'gwaScore':
      return studentProfile.gwa
        ? `GWA of ${studentProfile.gwa.toFixed(2)}${criteria.maxGWA ? ` (requires ≤${criteria.maxGWA})` : ''}`
        : 'GWA not provided';
    
    case 'yearLevelMatch':
      return yearLevels.length > 0
        ? (yearLevels.includes(studentProfile.classification) 
            ? `${studentProfile.classification} is eligible` 
            : `Requires: ${yearLevels.join(', ')}`)
        : `${studentProfile.classification || 'Year level not set'}`;
    
    case 'incomeMatch':
      return criteria.maxAnnualFamilyIncome
        ? `₱${(studentProfile.annualFamilyIncome || 0).toLocaleString()} / ₱${criteria.maxAnnualFamilyIncome.toLocaleString()} max`
        : `₱${(studentProfile.annualFamilyIncome || 0).toLocaleString()} annual income`;
    
    case 'stBracketMatch':
      return stBrackets.length > 0
        ? (stBrackets.includes(studentProfile.stBracket) ? `${studentProfile.stBracket} qualifies` : `Requires: ${stBrackets.join(', ')}`)
        : `${studentProfile.stBracket || 'ST bracket not set'}`;
    
    case 'collegeMatch':
      return criteria.eligibleColleges?.length > 0
        ? (collegeMatch === 1 ? `${studentProfile.college} is eligible` : 'College not eligible')
        : 'Open to all colleges';
    
    case 'courseMatch':
      return criteria.eligibleCourses?.length > 0
        ? (courseMatch === 1 ? `${studentProfile.course} matches` : 'Course not in list')
        : 'Open to all courses';
    
    case 'citizenshipMatch':
      return `${studentProfile.citizenship || 'Not specified'}`;
    
    case 'documentCompleteness':
      return studentProfile.profileCompleted ? 'Profile complete' : 'Profile incomplete';
    
    case 'eligibilityScore':
      return `${matchedCriteria}/${totalCriteria || '0'} criteria met (${Math.round(eligibilityScore * 100)}%)`;
    
    default:
      return '';
  }
}

/**
 * Format feature name for display
 * Converts camelCase to Title Case with spaces
 * 
 * @param {string} name - Feature name in camelCase
 * @returns {string} Formatted display name
 */
function formatFactorName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get human-readable prediction factors grouped by category
 * This is a simplified sync version for quick factor display
 * For accurate predictions, use predictAsync
 * 
 * @param {object} user - User object with studentProfile
 * @param {object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {object} Factors grouped by category
 */
function getPredictionFactors(user, scholarship) {
  const features = getSimplifiedFeatures(user, scholarship);
  const categorized = {};
  
  // Group by category
  for (const [category, featureList] of Object.entries(MODEL_CONFIG.featureCategories)) {
    categorized[category] = [];
    
    for (const featureName of featureList) {
      const value = features[featureName];
      if (value === undefined) continue;
      
      const description = MODEL_CONFIG.featureDescriptions[featureName] || '';
      
      categorized[category].push({
        factor: formatFactorName(featureName),
        value: value,
        description: description,
        impact: value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low'
      });
    }
  }
  
  return categorized;
}

module.exports = {
  generateFactors,
  generateFactorDescription,
  formatFactorName,
  getPredictionFactors
};

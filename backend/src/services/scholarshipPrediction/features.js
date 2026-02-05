// =============================================================================
// ISKOlarship - Feature Extraction
// Extract and normalize features from user and scholarship data
// =============================================================================

const { 
  YEAR_LEVEL_MAP, 
  ST_BRACKET_MAP, 
  NORMALIZATION_CONSTANTS 
} = require('./constants');

/**
 * Sigmoid function for logistic regression
 * 
 * @param {number} x - Input value
 * @returns {number} Probability between 0 and 1
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Extract features from user and scholarship for prediction
 * 
 * CANONICAL FIELD NAMES (from User.model.js):
 * - user.studentProfile.gwa (General Weighted Average)
 * - user.studentProfile.classification (Year level)
 * - user.studentProfile.college (Full college name)
 * - user.studentProfile.course (Course/program name)
 * - user.studentProfile.annualFamilyIncome (Annual family income in PHP)
 * - user.studentProfile.stBracket (ST bracket)
 * - user.studentProfile.unitsEnrolled (Current units enrolled)
 * - user.studentProfile.unitsPassed (Total units passed)
 * - user.studentProfile.householdSize (Number of household members)
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Normalized feature values
 */
function extractFeatures(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // Normalize GWA (1.0 is best, 5.0 is worst, so invert)
  const gwaNormalized = profile.gwa 
    ? (5 - profile.gwa) / 4 
    : 0.5;

  // Year level encoding using canonical classification field
  const yearLevelNormalized = YEAR_LEVEL_MAP[profile.classification] || 0.5;

  // Financial need score (inverse of income)
  const financialNeed = profile.annualFamilyIncome 
    ? 1 - (profile.annualFamilyIncome / NORMALIZATION_CONSTANTS.MAX_INCOME)
    : 0.5;

  // ST Bracket encoding (higher need = higher score)
  const stBracketNormalized = ST_BRACKET_MAP[profile.stBracket] || 0.5;

  // College match
  const collegeMatch = !criteria.eligibleColleges?.length ||
    criteria.eligibleColleges.includes(profile.college) ? 1 : 0;

  // Course match
  const courseMatch = !criteria.eligibleCourses?.length ||
    criteria.eligibleCourses.includes(profile.course) ? 1 : 0;

  // Profile completeness - using canonical field names
  const profileFields = [
    profile.gwa,
    profile.classification,
    profile.college,
    profile.course,
    profile.annualFamilyIncome,
    profile.firstName,
    profile.lastName,
    user.email
  ];
  const profileCompleteness = profileFields.filter(f => f != null).length / profileFields.length;

  // Units normalized (assuming 21 is full load)
  const unitsNormalized = profile.unitsEnrolled 
    ? Math.min(profile.unitsEnrolled / NORMALIZATION_CONSTANTS.FULL_LOAD_UNITS, 1)
    : 0.7;

  return {
    gwa: gwaNormalized,
    yearLevel: yearLevelNormalized,
    unitsEnrolled: unitsNormalized,
    financialNeed,
    stBracket: stBracketNormalized,
    collegeMatch,
    courseMatch,
    profileCompleteness,
    documentsComplete: 0.5, // Placeholder - would check actual documents
    previousApprovals: 0,   // Placeholder - would check history
    previousRejections: 0   // Placeholder - would check history
  };
}

module.exports = {
  sigmoid,
  extractFeatures
};

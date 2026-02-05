// =============================================================================
// ISKOlarship - Feature Extraction
// Extract and normalize features from user and scholarship data
// =============================================================================

const { SCORING } = require('./constants');
const { normalizeGWA, normalizeIncome } = require('./normalizers');

// =============================================================================
// Feature Extraction
// =============================================================================

/**
 * Extract features from user profile and scholarship criteria
 * Uses standardized scoring constants for consistent feature values
 * 
 * @param {object} user - User object with studentProfile
 * @param {object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {object} Features object with all normalized feature values
 */
function extractFeatures(user, scholarship) {
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  // Calculate GWA score (normalized 0-1, higher is better GWA)
  const gwaScore = normalizeGWA(studentProfile.gwa);
  
  // Year level match - STANDARDIZED SCORING
  const yearLevels = criteria.eligibleClassifications || [];
  let yearLevelMatch;
  if (yearLevels.length > 0) {
    yearLevelMatch = yearLevels.includes(studentProfile.classification) ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    yearLevelMatch = SCORING.NO_RESTRICTION;
  }
  
  // Income match - STANDARDIZED SCORING
  let incomeMatch;
  if (criteria.maxAnnualFamilyIncome) {
    if (studentProfile.annualFamilyIncome && studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) {
      // Lower income = higher score (0.9 to 1.0 range)
      incomeMatch = 0.9 + (1 - (studentProfile.annualFamilyIncome / criteria.maxAnnualFamilyIncome)) * 0.1;
    } else {
      incomeMatch = SCORING.MISMATCH;
    }
  } else {
    incomeMatch = SCORING.NO_RESTRICTION;
  }
  
  // ST Bracket match - STANDARDIZED SCORING
  const stBrackets = criteria.eligibleSTBrackets || [];
  let stBracketMatch;
  if (stBrackets.length > 0) {
    stBracketMatch = stBrackets.includes(studentProfile.stBracket) ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    stBracketMatch = SCORING.NO_RESTRICTION;
  }
  
  // College match - STANDARDIZED SCORING
  let collegeMatch;
  if (criteria.eligibleColleges?.length > 0) {
    collegeMatch = criteria.eligibleColleges.includes(studentProfile.college) ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    collegeMatch = SCORING.NO_RESTRICTION;
  }
  
  // Course match - STANDARDIZED SCORING
  let courseMatch;
  if (criteria.eligibleCourses?.length > 0) {
    const studentCourse = (studentProfile.course || '').toLowerCase();
    courseMatch = criteria.eligibleCourses.some(c => 
      studentCourse.includes(c.toLowerCase()) || c.toLowerCase().includes(studentCourse)
    ) ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    courseMatch = SCORING.NO_RESTRICTION;
  }
  
  // Citizenship match - STANDARDIZED SCORING
  let citizenshipMatch;
  if (criteria.eligibleCitizenship?.length > 0) {
    citizenshipMatch = criteria.eligibleCitizenship.includes(studentProfile.citizenship) ? SCORING.MATCH : SCORING.MISMATCH;
  } else if (criteria.isFilipinoOnly || criteria.filipinoOnly) {
    citizenshipMatch = studentProfile.citizenship === 'Filipino' ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    citizenshipMatch = SCORING.NO_RESTRICTION;
  }
  
  // Document completeness - STANDARDIZED
  const documentCompleteness = studentProfile.profileCompleted ? SCORING.PROFILE_COMPLETE : SCORING.PROFILE_INCOMPLETE;
  
  // Application timing - STANDARDIZED
  const applicationTiming = SCORING.TIMING_DEFAULT;
  
  return {
    gwaScore,
    yearLevelMatch,
    incomeMatch,
    stBracketMatch,
    collegeMatch,
    courseMatch,
    citizenshipMatch,
    documentCompleteness,
    applicationTiming,
    yearLevels, // Include for factor generation
    stBrackets  // Include for factor generation
  };
}

/**
 * Calculate eligibility score based on explicit criteria matching
 * 
 * @param {object} user - User object with studentProfile
 * @param {object} scholarship - Scholarship object with eligibilityCriteria
 * @param {number} courseMatchScore - Pre-calculated course match score
 * @returns {object} { eligibilityScore, matchedCriteria, totalCriteria }
 */
function calculateEligibilityScore(user, scholarship, courseMatchScore) {
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  const yearLevels = criteria.eligibleClassifications || [];
  
  let matchedCriteria = 0;
  let totalCriteria = 0;
  
  if (criteria.maxGWA) {
    totalCriteria++;
    if (studentProfile.gwa && studentProfile.gwa <= criteria.maxGWA) matchedCriteria++;
  }
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    if (studentProfile.annualFamilyIncome && studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) matchedCriteria++;
  }
  if (yearLevels.length > 0) {
    totalCriteria++;
    if (yearLevels.includes(studentProfile.classification)) matchedCriteria++;
  }
  if (criteria.eligibleColleges?.length > 0) {
    totalCriteria++;
    if (criteria.eligibleColleges.includes(studentProfile.college)) matchedCriteria++;
  }
  if (criteria.eligibleCourses?.length > 0) {
    totalCriteria++;
    if (courseMatchScore === SCORING.MATCH) matchedCriteria++;
  }
  
  // Eligibility score - STANDARDIZED with high floor
  const rawEligibility = totalCriteria > 0 ? matchedCriteria / totalCriteria : 1.0;
  const eligibilityScore = SCORING.ELIGIBILITY_FLOOR + (rawEligibility * SCORING.ELIGIBILITY_RANGE);
  
  return {
    eligibilityScore,
    matchedCriteria,
    totalCriteria
  };
}

/**
 * Get simplified features for sync prediction (without DB lookup)
 * Used for quick factor display without full model evaluation
 * 
 * @param {object} user - User object with studentProfile
 * @param {object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {object} Simplified features object
 */
function getSimplifiedFeatures(user, scholarship) {
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  return {
    gwaScore: normalizeGWA(studentProfile.gwa),
    yearLevelMatch: 1.0,
    incomeMatch: normalizeIncome(studentProfile.annualFamilyIncome, criteria.maxAnnualFamilyIncome || 500000),
    stBracketMatch: require('./normalizers').normalizeSTBracket(studentProfile.stBracket),
    collegeMatch: 1.0,
    courseMatch: 1.0,
    citizenshipMatch: studentProfile.citizenship === 'Filipino' ? 1.0 : 0.85,
    documentCompleteness: studentProfile.profileCompleted ? 1.0 : 0.8,
    eligibilityScore: 0.8
  };
}

module.exports = {
  extractFeatures,
  calculateEligibilityScore,
  getSimplifiedFeatures
};

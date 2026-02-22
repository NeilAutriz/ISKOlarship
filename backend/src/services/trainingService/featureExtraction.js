// =============================================================================
// Training Service - Feature Extraction
// Functions for extracting features from applications and user profiles
// =============================================================================

const { SCORING_CONFIG } = require('./constants');

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Normalize GWA to 0-1 scale (lower GWA is better in Philippine system)
 * @param {number} gwa - Student's GWA (1.0 to 5.0 scale)
 * @param {number} requiredGWA - Required minimum GWA (default: 3.0)
 * @returns {number} Normalized score between 0 and 1
 */
function normalizeGWA(gwa, requiredGWA = 3.0) {
  if (!gwa || gwa < 1 || gwa > 5) return 0.5;
  
  // Convert to 0-1 where higher is better
  // 1.0 GWA = 1.0, 5.0 GWA = 0.0
  const normalized = (5 - gwa) / 4;
  
  // Bonus for meeting/exceeding requirement
  if (gwa <= requiredGWA) {
    const bonus = (requiredGWA - gwa) / requiredGWA * 0.2;
    return Math.min(1, normalized + bonus);
  }
  
  return normalized;
}

// =============================================================================
// Match Checking Functions
// =============================================================================

/**
 * Check year level match - STANDARDIZED SCORING
 * @param {string} studentYearLevel - Student's year level
 * @param {string[]} eligibleYearLevels - List of eligible year levels
 * @returns {number} Match score
 */
function checkYearLevelMatch(studentYearLevel, eligibleYearLevels) {
  if (!eligibleYearLevels || eligibleYearLevels.length === 0) return SCORING_CONFIG.NO_RESTRICTION;
  if (!studentYearLevel) return SCORING_CONFIG.UNKNOWN;
  
  const normalized = studentYearLevel.toLowerCase().replace(/\s+/g, '');
  const isMatch = eligibleYearLevels.some(level => {
    const normalizedLevel = level.toLowerCase().replace(/\s+/g, '');
    return normalized === normalizedLevel || normalized.includes(normalizedLevel);
  });
  
  return isMatch ? SCORING_CONFIG.MATCH : SCORING_CONFIG.MISMATCH;
}

/**
 * Check income eligibility - STANDARDIZED SCORING
 * @param {number} studentIncome - Student's annual family income
 * @param {number} maxIncome - Maximum allowed income
 * @param {string[]} stBrackets - Eligible ST brackets
 * @returns {number} Match score
 */
function checkIncomeMatch(studentIncome, maxIncome, stBrackets) {
  if (!maxIncome && (!stBrackets || stBrackets.length === 0)) return SCORING_CONFIG.NO_RESTRICTION;
  
  // Income-based check
  if (maxIncome) {
    if (!studentIncome) return SCORING_CONFIG.UNKNOWN;
    if (studentIncome <= maxIncome) {
      // Lower income = higher score for need-based (gradient within match range)
      const ratio = studentIncome / maxIncome;
      return SCORING_CONFIG.MATCH + (1 - ratio) * (1.0 - SCORING_CONFIG.MATCH);
    }
    return SCORING_CONFIG.MISMATCH; // Exceeds income limit
  }
  
  return SCORING_CONFIG.NO_RESTRICTION;
}

/**
 * Check ST Bracket match - STANDARDIZED SCORING
 * @param {string} studentBracket - Student's ST bracket
 * @param {string[]} eligibleBrackets - List of eligible ST brackets
 * @returns {number} Match score
 */
function checkSTBracketMatch(studentBracket, eligibleBrackets) {
  if (!eligibleBrackets || eligibleBrackets.length === 0) return SCORING_CONFIG.NO_RESTRICTION;
  if (!studentBracket) return SCORING_CONFIG.UNKNOWN;
  
  const normalized = studentBracket.toLowerCase().replace(/\s+/g, '');
  const isMatch = eligibleBrackets.some(bracket => {
    const normalizedBracket = bracket.toLowerCase().replace(/\s+/g, '');
    return normalized === normalizedBracket || normalized.includes(normalizedBracket);
  });
  
  // ST bracket importance scoring (only when matched)
  const bracketScores = {
    'fulldiscountwithstipend': 1.0,
    'fulldiscount': 0.95,
    'pd80': 0.9,
    'pd60': 0.85,
    'pd40': 0.85,
    'pd20': 0.85,
    'nodiscount': 0.85
  };
  
  return isMatch ? (bracketScores[normalized] || SCORING_CONFIG.MATCH) : SCORING_CONFIG.MISMATCH;
}

/**
 * Check college match - STANDARDIZED SCORING
 * @param {string} studentCollege - Student's college
 * @param {string[]} eligibleColleges - List of eligible colleges
 * @returns {number} Match score
 */
function checkCollegeMatch(studentCollege, eligibleColleges) {
  if (!eligibleColleges || eligibleColleges.length === 0) return SCORING_CONFIG.NO_RESTRICTION;
  if (!studentCollege) return SCORING_CONFIG.UNKNOWN;
  
  const normalized = studentCollege.toLowerCase();
  const isMatch = eligibleColleges.some(college => {
    const normalizedCollege = college.toLowerCase();
    return normalized.includes(normalizedCollege) || normalizedCollege.includes(normalized);
  });
  
  return isMatch ? SCORING_CONFIG.MATCH : SCORING_CONFIG.MISMATCH;
}

/**
 * Check course/program match - STANDARDIZED SCORING
 * @param {string} studentCourse - Student's course
 * @param {string[]} eligibleCourses - List of eligible courses
 * @returns {number} Match score
 */
function checkCourseMatch(studentCourse, eligibleCourses) {
  if (!eligibleCourses || eligibleCourses.length === 0) return SCORING_CONFIG.NO_RESTRICTION;
  if (!studentCourse) return SCORING_CONFIG.UNKNOWN;
  
  const normalized = studentCourse.toLowerCase();
  const isMatch = eligibleCourses.some(course => {
    const normalizedCourse = course.toLowerCase();
    return normalized.includes(normalizedCourse) || normalizedCourse.includes(normalized);
  });
  
  return isMatch ? SCORING_CONFIG.MATCH : SCORING_CONFIG.MISMATCH;
}

/**
 * Check citizenship match - STANDARDIZED SCORING
 * @param {string} studentCitizenship - Student's citizenship
 * @param {string[]} eligibleCitizenship - List of eligible citizenships
 * @returns {number} Match score
 */
function checkCitizenshipMatch(studentCitizenship, eligibleCitizenship) {
  if (!eligibleCitizenship || eligibleCitizenship.length === 0) return SCORING_CONFIG.NO_RESTRICTION;
  if (!studentCitizenship) return SCORING_CONFIG.UNKNOWN;
  
  const normalized = studentCitizenship.toLowerCase();
  const isMatch = eligibleCitizenship.some(citizenship => 
    normalized === citizenship.toLowerCase()
  );
  
  return isMatch ? SCORING_CONFIG.MATCH : SCORING_CONFIG.MISMATCH;
}

// =============================================================================
// Score Calculation Functions
// =============================================================================

/**
 * Calculate application timing score
 * @param {Date} applicationDate - Date of application
 * @param {Date} openDate - Application opening date
 * @param {Date} deadlineDate - Application deadline
 * @returns {number} Timing score between 0 and 1
 */
function calculateApplicationTiming(applicationDate, openDate, deadlineDate) {
  if (!applicationDate || !deadlineDate) return 0.5;
  
  const app = new Date(applicationDate);
  const open = openDate ? new Date(openDate) : new Date(deadlineDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deadline = new Date(deadlineDate);
  
  const totalWindow = deadline.getTime() - open.getTime();
  const timeSinceOpen = app.getTime() - open.getTime();
  
  if (timeSinceOpen < 0) return 0.9; // Before opening - very early
  if (timeSinceOpen > totalWindow) return 0.1; // After deadline
  
  // Earlier = better
  const percentThrough = timeSinceOpen / totalWindow;
  return 1.0 - (percentThrough * 0.8); // 0.2 to 1.0 range
}

// =============================================================================
// Feature Extraction Functions
// =============================================================================

/**
 * Extract features from an application for training/prediction
 * Includes interaction features for better predictive power
 * @param {Object} application - Application document
 * @param {Object} scholarship - Scholarship document
 * @returns {Object} Feature vector with 13 features
 */
function extractFeatures(application, scholarship) {
  const snapshot = application.applicantSnapshot || {};
  const criteria = scholarship?.eligibilityCriteria || {};
  
  // Base features
  const gwaScore = normalizeGWA(snapshot.gwa, criteria.maxGWA || criteria.minGWA || 3.0);
  const yearLevelMatch = checkYearLevelMatch(snapshot.classification, criteria.eligibleClassifications);
  const incomeMatch = checkIncomeMatch(snapshot.annualFamilyIncome, criteria.maxAnnualFamilyIncome, criteria.eligibleSTBrackets);
  const stBracketMatch = checkSTBracketMatch(snapshot.stBracket, criteria.eligibleSTBrackets);
  const collegeMatch = checkCollegeMatch(snapshot.college, criteria.eligibleColleges);
  const courseMatch = checkCourseMatch(snapshot.course, criteria.eligibleCourses);
  const citizenshipMatch = checkCitizenshipMatch(snapshot.citizenship, criteria.eligibleCitizenship);
  const applicationTiming = calculateApplicationTiming(application.createdAt, scholarship?.applicationStartDate, scholarship?.applicationDeadline);
  const eligibilityScore = (application.eligibilityPercentage || 50) / 100;
  
  // Interaction features (capture non-linear relationships)
  const academicStrength = gwaScore * yearLevelMatch;
  const financialNeed = incomeMatch * stBracketMatch;
  const programFit = collegeMatch * courseMatch;
  const overallFit = eligibilityScore * academicStrength;
  
  return {
    gwaScore,
    yearLevelMatch,
    incomeMatch,
    stBracketMatch,
    collegeMatch,
    courseMatch,
    citizenshipMatch,
    applicationTiming,
    eligibilityScore,
    // Interaction features
    academicStrength,
    financialNeed,
    programFit,
    overallFit
  };
}

/**
 * Extract features from user profile and scholarship (for predictions)
 * Uses default values for document and timing since no application exists yet
 * @param {Object} user - User document with studentProfile
 * @param {Object} scholarship - Scholarship document
 * @returns {Object} Feature vector with 13 features
 */
function extractFeaturesFromUserAndScholarship(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship?.eligibilityCriteria || {};
  
  // Base features
  const gwaScore = normalizeGWA(profile.gwa, criteria.maxGWA || criteria.minGWA || 3.0);
  const yearLevelMatch = checkYearLevelMatch(profile.classification, criteria.eligibleClassifications);
  const incomeMatch = checkIncomeMatch(profile.annualFamilyIncome, criteria.maxAnnualFamilyIncome, criteria.eligibleSTBrackets);
  const stBracketMatch = checkSTBracketMatch(profile.stBracket, criteria.eligibleSTBrackets);
  const collegeMatch = checkCollegeMatch(profile.college, criteria.eligibleColleges);
  const courseMatch = checkCourseMatch(profile.course, criteria.eligibleCourses);
  const citizenshipMatch = checkCitizenshipMatch(profile.citizenship, criteria.eligibleCitizenship);
  const applicationTiming = SCORING_CONFIG.TIMING_DEFAULT; // 0.5 for predictions
  const eligibilityScore = 0.5; // 0.5 default (neutral)
  
  // Interaction features
  const academicStrength = gwaScore * yearLevelMatch;
  const financialNeed = incomeMatch * stBracketMatch;
  const programFit = collegeMatch * courseMatch;
  const overallFit = eligibilityScore * academicStrength;
  
  return {
    gwaScore,
    yearLevelMatch,
    incomeMatch,
    stBracketMatch,
    collegeMatch,
    courseMatch,
    citizenshipMatch,
    applicationTiming,
    eligibilityScore,
    // Interaction features
    academicStrength,
    financialNeed,
    programFit,
    overallFit
  };
}

module.exports = {
  // Normalization
  normalizeGWA,
  // Match checking
  checkYearLevelMatch,
  checkIncomeMatch,
  checkSTBracketMatch,
  checkCollegeMatch,
  checkCourseMatch,
  checkCitizenshipMatch,
  // Score calculation
  calculateApplicationTiming,
  // Feature extraction
  extractFeatures,
  extractFeaturesFromUserAndScholarship
};

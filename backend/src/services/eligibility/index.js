/**
 * =============================================================================
 * ISKOlarship - Modular Eligibility Checking System
 * =============================================================================
 * 
 * This module provides a standardized, maintainable approach to scholarship
 * eligibility checking with clear separation of concerns:
 * 
 * 1. RANGE-BASED CRITERIA - Numeric comparisons (min/max)
 *    - GWA (lower is better in Philippine system)
 *    - Annual Family Income
 *    - Units Enrolled/Passed
 *    - Household Size
 * 
 * 2. LIST MEMBERSHIP CRITERIA - Must be in a list of allowed values
 *    - Year Level/Classification
 *    - College
 *    - Course
 *    - Major
 *    - ST Bracket
 *    - Province
 *    - Citizenship
 * 
 * 3. BOOLEAN CRITERIA - True/False conditions
 *    - Has Approved Thesis
 *    - Has Other Scholarship (exclusivity)
 *    - Has Disciplinary Action
 *    - Is Graduating
 *    - Has Failing Grade
 *    etc.
 * 
 * USAGE:
 * const eligibility = require('./eligibility');
 * const result = await eligibility.checkEligibility(user, scholarship);
 * 
 * RESULT FORMAT:
 * {
 *   passed: boolean,           // Overall eligibility (all checks must pass)
 *   score: number,             // Percentage of checks passed (0-100)
 *   checks: Array,             // All individual check results
 *   summary: Object,           // Quick summary (total, passed, failed)
 *   breakdown: Object          // Grouped by check type (range, list, boolean)
 * }
 * 
 * =============================================================================
 */

const rangeChecks = require('./rangeChecks');
const listChecks = require('./listChecks');
const booleanChecks = require('./booleanChecks');
const normalizers = require('./normalizers');

// Re-export commonly used normalizers for convenience
const { 
  normalizeSTBracket, 
  stBracketsMatch,
  normalizeYearLevel,
  yearLevelsMatch,
  normalizeCollege,
  collegesMatch,
  normalizeCourse,
  coursesMatch,
  normalizeProvince,
  provincesMatch,
  hasValue,
  formatCurrency,
  formatGWA
} = normalizers;

// =============================================================================
// MAIN ELIGIBILITY CHECK FUNCTION
// =============================================================================

/**
 * Check all eligibility criteria for a student against a scholarship
 * This is the main entry point for eligibility checking.
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Eligibility result with passed status, score, and detailed checks
 * @throws {Error} If user or scholarship is invalid
 */
async function checkEligibility(user, scholarship) {
  // Input validation
  if (!user) {
    throw new Error('User object is required for eligibility check');
  }
  
  if (!scholarship) {
    throw new Error('Scholarship object is required for eligibility check');
  }
  
  // Extract profile and criteria with defaults
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  try {
    // Run all checks in parallel for efficiency
    const [rangeResults, listResults, booleanResults] = await Promise.all([
      Promise.resolve(rangeChecks.checkAll(profile, criteria)),
      Promise.resolve(listChecks.checkAll(profile, criteria)),
      Promise.resolve(booleanChecks.checkAll(profile, criteria))
    ]);
    
    // Combine all checks
    const allChecks = [...rangeResults, ...listResults, ...booleanResults];
    
    // Calculate statistics
    const totalChecks = allChecks.length;
    const passedChecks = allChecks.filter(c => c.passed).length;
    const failedChecks = totalChecks - passedChecks;
    
    // Calculate score (percentage of checks passed)
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
    
    // Determine overall pass (all checks must pass for full eligibility)
    const passed = allChecks.every(c => c.passed);
    
    // Group checks by category for detailed analysis
    const categorizedChecks = categorizeChecks(allChecks);
    
    return {
      passed,
      score,
      checks: allChecks,
      summary: {
        total: totalChecks,
        passed: passedChecks,
        failed: failedChecks,
        percentage: score
      },
      breakdown: {
        range: {
          checks: rangeResults,
          passed: rangeResults.every(c => c.passed),
          count: rangeResults.length,
          passedCount: rangeResults.filter(c => c.passed).length
        },
        list: {
          checks: listResults,
          passed: listResults.every(c => c.passed),
          count: listResults.length,
          passedCount: listResults.filter(c => c.passed).length
        },
        boolean: {
          checks: booleanResults,
          passed: booleanResults.every(c => c.passed),
          count: booleanResults.length,
          passedCount: booleanResults.filter(c => c.passed).length
        }
      },
      categories: categorizedChecks,
      metadata: {
        checkedAt: new Date().toISOString(),
        scholarshipId: scholarship._id?.toString() || null,
        userId: user._id?.toString() || null
      }
    };
  } catch (error) {
    // Log error for debugging but return a safe failure result
    console.error('Eligibility check error:', error);
    
    return {
      passed: false,
      score: 0,
      checks: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        percentage: 0
      },
      breakdown: {
        range: { checks: [], passed: false, count: 0, passedCount: 0 },
        list: { checks: [], passed: false, count: 0, passedCount: 0 },
        boolean: { checks: [], passed: false, count: 0, passedCount: 0 }
      },
      categories: {},
      error: error.message,
      metadata: {
        checkedAt: new Date().toISOString(),
        scholarshipId: scholarship?._id?.toString() || null,
        userId: user?._id?.toString() || null
      }
    };
  }
}

/**
 * Get a quick eligibility summary without detailed checks
 * Useful for filtering/screening large numbers of scholarships
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Quick eligibility summary
 */
function quickCheck(user, scholarship) {
  if (!user || !scholarship) {
    return { passed: false, rangePass: false, listPass: false, booleanPass: false };
  }
  
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  try {
    // Quick checks return boolean for each category
    const rangePass = rangeChecks.quickCheck(profile, criteria);
    const listPass = listChecks.quickCheck(profile, criteria);
    const booleanPass = booleanChecks.quickCheck(profile, criteria);
    
    return {
      passed: rangePass && listPass && booleanPass,
      rangePass,
      listPass,
      booleanPass
    };
  } catch (error) {
    console.error('Quick eligibility check error:', error);
    return { passed: false, rangePass: false, listPass: false, booleanPass: false, error: error.message };
  }
}

/**
 * Get detailed summary for each check category
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Detailed summaries for each category
 */
function getSummaries(user, scholarship) {
  if (!user || !scholarship) {
    return { range: null, list: null, boolean: null };
  }
  
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  return {
    range: rangeChecks.getSummary(profile, criteria),
    list: listChecks.getSummary(profile, criteria),
    boolean: booleanChecks.getSummary(profile, criteria)
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Categorize checks by their category field
 * Useful for UI display grouped by academic/financial/etc.
 * 
 * @param {Array} checks - Array of check results
 * @returns {Object} Checks grouped by category
 */
function categorizeChecks(checks) {
  const categories = {
    academic: [],
    financial: [],
    status: [],
    location: [],
    personal: []
  };
  
  checks.forEach(check => {
    const category = check.category || 'other';
    if (categories[category]) {
      categories[category].push(check);
    } else {
      // Handle unexpected categories
      if (!categories.other) categories.other = [];
      categories.other.push(check);
    }
  });
  
  // Add summary for each category
  Object.keys(categories).forEach(key => {
    const categoryChecks = categories[key];
    if (categoryChecks.length > 0) {
      categories[key] = {
        checks: categoryChecks,
        total: categoryChecks.length,
        passed: categoryChecks.filter(c => c.passed).length,
        failed: categoryChecks.filter(c => !c.passed).length,
        allPassed: categoryChecks.every(c => c.passed)
      };
    } else {
      // Remove empty categories
      delete categories[key];
    }
  });
  
  return categories;
}

/**
 * Get list of failed criteria (useful for UI display)
 * 
 * @param {Object} eligibilityResult - Result from checkEligibility
 * @returns {Array} Array of failed check criterion names
 */
function getFailedCriteria(eligibilityResult) {
  if (!eligibilityResult || !eligibilityResult.checks) {
    return [];
  }
  
  return eligibilityResult.checks
    .filter(c => !c.passed)
    .map(c => ({
      criterion: c.criterion,
      category: c.category,
      type: c.type,
      notes: c.notes,
      applicantValue: c.applicantValue,
      requiredValue: c.requiredValue
    }));
}

/**
 * Get list of passed criteria (useful for positive UI display)
 * 
 * @param {Object} eligibilityResult - Result from checkEligibility
 * @returns {Array} Array of passed check criterion names
 */
function getPassedCriteria(eligibilityResult) {
  if (!eligibilityResult || !eligibilityResult.checks) {
    return [];
  }
  
  return eligibilityResult.checks
    .filter(c => c.passed)
    .map(c => ({
      criterion: c.criterion,
      category: c.category,
      type: c.type,
      notes: c.notes,
      applicantValue: c.applicantValue,
      requiredValue: c.requiredValue
    }));
}

/**
 * Calculate match level based on eligibility score
 * 
 * @param {number} score - Eligibility score (0-100)
 * @returns {string} Match level description
 */
function getMatchLevel(score) {
  if (score === 100) return 'Perfect Match';
  if (score >= 80) return 'Strong Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Partial Match';
  if (score >= 20) return 'Weak Match';
  return 'Poor Match';
}

/**
 * Check if a scholarship has any eligibility requirements
 * Some scholarships may be open to all students
 * 
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {boolean} True if scholarship has criteria
 */
function hasEligibilityCriteria(scholarship) {
  if (!scholarship || !scholarship.eligibilityCriteria) {
    return false;
  }
  
  const criteria = scholarship.eligibilityCriteria;
  
  // Check if any criteria fields have values
  const criteriaFields = [
    // Range criteria
    'minGWA', 'maxGWA',
    'minAnnualFamilyIncome', 'maxAnnualFamilyIncome',
    'minUnitsEnrolled', 'minUnitsPassed',
    'minHouseholdSize', 'maxHouseholdSize',
    // List criteria
    'eligibleClassifications', 'requiredYearLevels',
    'eligibleColleges', 'eligibleCourses', 'eligibleMajors',
    'eligibleSTBrackets', 'requiredSTBrackets',
    'eligibleProvinces', 'eligibleCitizenship',
    // Boolean criteria
    'requiresApprovedThesisOutline', 'requiresApprovedThesis',
    'mustNotHaveOtherScholarship', 'mustNotHaveThesisGrant',
    'mustNotHaveDisciplinaryAction', 'mustNotHaveFailingGrade',
    'mustNotHaveGradeOf4', 'mustNotHaveIncompleteGrade',
    'mustBeGraduating', 'isFilipinoOnly', 'filipinoOnly',
    'mustBeRegularStudent', 'mustBeFullTime'
  ];
  
  return criteriaFields.some(field => {
    const value = criteria[field];
    if (value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (value === false) return false; // Boolean false means not required
    return true;
  });
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  // Main functions
  checkEligibility,
  quickCheck,
  getSummaries,
  
  // Helper functions
  categorizeChecks,
  getFailedCriteria,
  getPassedCriteria,
  getMatchLevel,
  hasEligibilityCriteria,
  
  // Sub-modules (for advanced usage)
  rangeChecks,
  listChecks,
  booleanChecks,
  normalizers,
  
  // Commonly used normalizers (re-exported for convenience)
  normalizeSTBracket,
  stBracketsMatch,
  normalizeYearLevel,
  yearLevelsMatch,
  normalizeCollege,
  collegesMatch,
  normalizeCourse,
  coursesMatch,
  normalizeProvince,
  provincesMatch,
  hasValue,
  formatCurrency,
  formatGWA
};

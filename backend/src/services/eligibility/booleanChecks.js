/**
 * =============================================================================
 * ISKOlarship - Boolean Eligibility Checks
 * =============================================================================
 * 
 * Handles true/false condition checks:
 * - Has Approved Thesis Outline
 * - Must Not Have Other Scholarship
 * - Must Not Have Thesis Grant
 * - Must Not Have Disciplinary Action
 * - Must Not Have Failing Grade
 * - Must Not Have Grade of 4 (conditional passing)
 * - Must Not Have Incomplete Grade
 * - Must Be Graduating
 * - Filipino Only
 * 
 * These checks typically require the student to meet or NOT meet certain 
 * conditions (restrictions). Many scholarships have exclusivity requirements.
 * 
 * Each check returns a standardized result object:
 * {
 *   criterion: string,      // Display name
 *   passed: boolean,        // Whether check passed
 *   applicantValue: any,    // Student's value
 *   requiredValue: string,  // Requirement description
 *   notes: string,          // Additional context
 *   type: 'boolean',        // Check type identifier
 *   category: string        // 'academic' | 'status' | 'personal'
 * }
 * 
 * Returns null when criteria is not specified (skip check)
 * =============================================================================
 */

const { hasValue, normalizeCitizenship } = require('./normalizers');

// =============================================================================
// ACADEMIC BOOLEAN CHECKS
// =============================================================================

/**
 * Check if student has approved thesis outline
 * Required for thesis grants/research scholarships
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkApprovedThesis(profile, criteria) {
  // Check both field names for backward compatibility
  if (!criteria.requiresApprovedThesisOutline && !criteria.requiresApprovedThesis) return null;
  
  // Check multiple possible profile field names
  const hasThesis = profile.hasApprovedThesisOutline || 
                    profile.hasApprovedThesis || 
                    profile.approvedThesisOutline;
  
  const passed = hasThesis === true;
  
  return {
    criterion: 'Approved Thesis Outline',
    passed,
    applicantValue: passed ? 'Yes' : 'No',
    requiredValue: 'Required',
    notes: passed 
      ? 'Has an approved thesis outline'
      : 'Thesis outline approval not yet obtained or not indicated in profile',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student has failing grade (grade of 5)
 * Many scholarships require no failing grades
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkNoFailingGrade(profile, criteria) {
  if (!criteria.mustNotHaveFailingGrade) return null;
  
  const hasFailing = profile.hasFailingGrade || profile.hasGradeOf5;
  const passed = !hasFailing;
  
  return {
    criterion: 'No Failing Grade',
    passed,
    applicantValue: passed ? 'No failing grades' : 'Has failing grade(s)',
    requiredValue: 'Must not have any failing grades (5.0)',
    notes: passed 
      ? 'Academic record shows no failing grades'
      : 'Academic record indicates one or more failing grades',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student has grade of 4 (conditional passing)
 * Some scholarships require no conditional grades
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkNoGradeOf4(profile, criteria) {
  if (!criteria.mustNotHaveGradeOf4) return null;
  
  const hasGrade4 = profile.hasGradeOf4 || profile.hasConditionalGrade;
  const passed = !hasGrade4;
  
  return {
    criterion: 'No Grade of 4',
    passed,
    applicantValue: passed ? 'No conditional grades' : 'Has grade of 4',
    requiredValue: 'Must not have any conditional passing grades (4.0)',
    notes: passed 
      ? 'Academic record shows no conditional passing grades'
      : 'Academic record indicates one or more conditional passing grades',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student has incomplete grade (INC)
 * Some scholarships require all grades to be complete
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkNoIncompleteGrade(profile, criteria) {
  if (!criteria.mustNotHaveIncompleteGrade) return null;
  
  const hasIncomplete = profile.hasIncompleteGrade || profile.hasINC;
  const passed = !hasIncomplete;
  
  return {
    criterion: 'No Incomplete Grade',
    passed,
    applicantValue: passed ? 'No incomplete grades' : 'Has incomplete grade(s)',
    requiredValue: 'Must not have any incomplete grades (INC)',
    notes: passed 
      ? 'All grades are complete'
      : 'One or more subjects have incomplete grades',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student is graduating this semester
 * Required for thesis grants and graduating student scholarships
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkMustBeGraduating(profile, criteria) {
  if (!criteria.mustBeGraduating) return null;
  
  const isGraduating = profile.isGraduating || profile.graduatingThisSemester;
  const passed = isGraduating === true;
  
  return {
    criterion: 'Graduating Student',
    passed,
    applicantValue: passed ? 'Yes, graduating' : 'Not graduating',
    requiredValue: 'Must be graduating this academic term',
    notes: passed 
      ? 'Student is expected to graduate this academic term'
      : 'Student is not graduating this academic term',
    type: 'boolean',
    category: 'academic'
  };
}

// =============================================================================
// STATUS BOOLEAN CHECKS
// =============================================================================

/**
 * Check if student has other scholarship
 * Many scholarships require exclusivity (no other scholarships)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkNoOtherScholarship(profile, criteria) {
  if (!criteria.mustNotHaveOtherScholarship) return null;
  
  // Check multiple possible field names
  const hasScholarship = profile.hasExistingScholarship || 
                         profile.hasOtherScholarship || 
                         profile.isScholarshipRecipient ||
                         profile.currentScholarship;
  
  const passed = !hasScholarship;
  
  let notes = '';
  if (passed) {
    notes = 'No conflicting scholarship on record';
  } else if (profile.existingScholarshipName) {
    notes = `Already receiving: ${profile.existingScholarshipName}`;
  } else {
    notes = 'Currently receiving another scholarship';
  }
  
  return {
    criterion: 'No Other Scholarship',
    passed,
    applicantValue: passed ? 'No current scholarship' : 'Has existing scholarship',
    requiredValue: 'Must not be receiving another scholarship',
    notes,
    type: 'boolean',
    category: 'status'
  };
}

/**
 * Check if student has thesis grant
 * Some non-thesis scholarships require no existing thesis grant
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkNoThesisGrant(profile, criteria) {
  if (!criteria.mustNotHaveThesisGrant) return null;
  
  const hasThesisGrant = profile.hasThesisGrant || profile.thesisGrantRecipient;
  const passed = !hasThesisGrant;
  
  return {
    criterion: 'No Thesis Grant',
    passed,
    applicantValue: passed ? 'No thesis grant' : 'Has thesis grant',
    requiredValue: 'Must not be receiving a thesis/research grant',
    notes: passed 
      ? 'Not currently receiving a thesis grant'
      : 'Currently receiving a thesis/research grant',
    type: 'boolean',
    category: 'status'
  };
}

/**
 * Check if student has disciplinary action
 * Most scholarships require good standing (no disciplinary records)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkNoDisciplinaryAction(profile, criteria) {
  if (!criteria.mustNotHaveDisciplinaryAction) return null;
  
  const hasAction = profile.hasDisciplinaryAction || 
                    profile.disciplinaryRecord ||
                    profile.hasViolation;
  
  const passed = !hasAction;
  
  return {
    criterion: 'No Disciplinary Action',
    passed,
    applicantValue: passed ? 'Clean record' : 'Has disciplinary record',
    requiredValue: 'Must be in good standing (no disciplinary action)',
    notes: passed 
      ? 'No disciplinary records on file'
      : 'Has pending or resolved disciplinary action',
    type: 'boolean',
    category: 'status'
  };
}

// =============================================================================
// PERSONAL BOOLEAN CHECKS
// =============================================================================

/**
 * Check Filipino citizenship requirement
 * For scholarships exclusively for Filipino citizens
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkFilipinoOnly(profile, criteria) {
  // Check both field names
  if (!criteria.isFilipinoOnly && !criteria.filipinoOnly) return null;
  
  const citizenship = profile.citizenship;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(citizenship)) {
    passed = false;
    notes = 'Citizenship not provided in profile';
  } else {
    const normalizedCitizenship = normalizeCitizenship(citizenship);
    passed = normalizedCitizenship === 'Filipino';
    notes = passed 
      ? 'Filipino citizenship verified'
      : 'This scholarship is exclusively for Filipino citizens';
  }
  
  return {
    criterion: 'Filipino Citizenship',
    passed,
    applicantValue: hasValue(citizenship) ? normalizeCitizenship(citizenship) : 'Not provided',
    requiredValue: 'Must be a Filipino citizen',
    notes,
    type: 'boolean',
    category: 'personal'
  };
}

/**
 * Check if student is a regular (not irregular) student
 * Some scholarships are only for regular students
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkRegularStudent(profile, criteria) {
  if (!criteria.mustBeRegularStudent) return null;
  
  const isRegular = profile.isRegularStudent || profile.studentStatus === 'Regular';
  const passed = isRegular === true;
  
  return {
    criterion: 'Regular Student',
    passed,
    applicantValue: passed ? 'Regular student' : 'Irregular student',
    requiredValue: 'Must be a regular (not irregular) student',
    notes: passed 
      ? 'Enrolled as a regular student'
      : 'Not enrolled as a regular student or status not specified',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student is a full-time student
 * Some scholarships require full-time enrollment
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkFullTimeStudent(profile, criteria) {
  if (!criteria.mustBeFullTime) return null;
  
  const isFullTime = profile.isFullTimeStudent || profile.enrollmentStatus === 'Full-time';
  const passed = isFullTime === true;
  
  return {
    criterion: 'Full-Time Student',
    passed,
    applicantValue: passed ? 'Full-time' : 'Part-time or not specified',
    requiredValue: 'Must be enrolled full-time',
    notes: passed 
      ? 'Enrolled as a full-time student'
      : 'Not enrolled full-time or enrollment status not specified',
    type: 'boolean',
    category: 'academic'
  };
}

// =============================================================================
// AGGREGATE FUNCTIONS
// =============================================================================

/**
 * Run all boolean checks
 * Returns array of check results (excludes null/skipped checks)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Array} Array of check results
 */
function checkAll(profile, criteria) {
  const checks = [
    // Academic checks
    checkApprovedThesis(profile, criteria),
    checkNoFailingGrade(profile, criteria),
    checkNoGradeOf4(profile, criteria),
    checkNoIncompleteGrade(profile, criteria),
    checkMustBeGraduating(profile, criteria),
    checkRegularStudent(profile, criteria),
    checkFullTimeStudent(profile, criteria),
    
    // Status checks
    checkNoOtherScholarship(profile, criteria),
    checkNoThesisGrant(profile, criteria),
    checkNoDisciplinaryAction(profile, criteria),
    
    // Personal checks
    checkFilipinoOnly(profile, criteria)
  ];
  
  // Filter out null checks (criteria not specified)
  return checks.filter(c => c !== null);
}

/**
 * Quick check - returns true if all boolean checks pass
 * Useful for fast eligibility pre-screening
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {boolean} True if all boolean checks pass
 */
function quickCheck(profile, criteria) {
  const checks = checkAll(profile, criteria);
  return checks.every(c => c.passed);
}

/**
 * Get summary of boolean check results
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object} Summary object
 */
function getSummary(profile, criteria) {
  const checks = checkAll(profile, criteria);
  const passed = checks.filter(c => c.passed);
  const failed = checks.filter(c => !c.passed);
  
  return {
    total: checks.length,
    passed: passed.length,
    failed: failed.length,
    allPassed: failed.length === 0,
    passedChecks: passed.map(c => c.criterion),
    failedChecks: failed.map(c => c.criterion)
  };
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  // Academic checks
  checkApprovedThesis,
  checkNoFailingGrade,
  checkNoGradeOf4,
  checkNoIncompleteGrade,
  checkMustBeGraduating,
  checkRegularStudent,
  checkFullTimeStudent,
  
  // Status checks
  checkNoOtherScholarship,
  checkNoThesisGrant,
  checkNoDisciplinaryAction,
  
  // Personal checks
  checkFilipinoOnly,
  
  // Aggregate functions
  checkAll,
  quickCheck,
  getSummary
};

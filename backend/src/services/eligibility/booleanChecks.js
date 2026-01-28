/**
 * =============================================================================
 * Boolean Eligibility Checks
 * =============================================================================
 * 
 * Handles true/false condition checks:
 * - Has Approved Thesis Outline
 * - Must Not Have Other Scholarship
 * - Must Not Have Thesis Grant
 * - Must Not Have Disciplinary Action
 * - Must Not Have Failing Grade
 * - Must Not Have Grade of 4
 * - Must Not Have Incomplete Grade
 * - Must Be Graduating
 * 
 * Each check returns:
 * {
 *   criterion: string,      // Display name
 *   passed: boolean,        // Whether check passed
 *   applicantValue: any,    // Student's value
 *   requiredValue: string,  // Requirement description
 *   notes: string,          // Additional context
 *   type: 'boolean',        // Check type identifier
 *   category: string        // 'academic' | 'status'
 * }
 * =============================================================================
 */

/**
 * Check if student has approved thesis outline
 */
function checkApprovedThesis(profile, criteria) {
  // Check both field names
  if (!criteria.requiresApprovedThesisOutline && !criteria.requiresApprovedThesis) return null;
  
  const hasThesis = profile.hasApprovedThesisOutline || profile.hasApprovedThesis;
  const passed = hasThesis === true;
  
  return {
    criterion: 'Approved Thesis Outline',
    passed,
    applicantValue: passed ? 'Yes' : 'No',
    requiredValue: 'Required',
    notes: passed ? 'Has approved thesis outline' : 'No approved thesis outline',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student has other scholarship
 */
function checkNoOtherScholarship(profile, criteria) {
  if (!criteria.mustNotHaveOtherScholarship) return null;
  
  const hasScholarship = profile.hasExistingScholarship || profile.hasOtherScholarship || profile.isScholarshipRecipient;
  const passed = !hasScholarship;
  
  return {
    criterion: 'No Other Scholarship',
    passed,
    applicantValue: passed ? 'No current scholarship' : 'Has existing scholarship',
    requiredValue: 'Must not have other scholarship',
    notes: passed ? 'No conflicting scholarship' : 'Already has a scholarship',
    type: 'boolean',
    category: 'status'
  };
}

/**
 * Check if student has thesis grant
 */
function checkNoThesisGrant(profile, criteria) {
  if (!criteria.mustNotHaveThesisGrant) return null;
  
  const hasThesisGrant = profile.hasThesisGrant;
  const passed = !hasThesisGrant;
  
  return {
    criterion: 'No Thesis Grant',
    passed,
    applicantValue: passed ? 'No thesis grant' : 'Has thesis grant',
    requiredValue: 'Must not have thesis grant',
    notes: passed ? 'No existing thesis grant' : 'Already has a thesis grant',
    type: 'boolean',
    category: 'status'
  };
}

/**
 * Check if student has disciplinary action
 */
function checkNoDisciplinaryAction(profile, criteria) {
  if (!criteria.mustNotHaveDisciplinaryAction) return null;
  
  const hasAction = profile.hasDisciplinaryAction;
  const passed = !hasAction;
  
  return {
    criterion: 'No Disciplinary Action',
    passed,
    applicantValue: passed ? 'Clean record' : 'Has disciplinary record',
    requiredValue: 'Must not have disciplinary action',
    notes: passed ? 'No disciplinary record' : 'Has disciplinary record',
    type: 'boolean',
    category: 'status'
  };
}

/**
 * Check if student has failing grade
 */
function checkNoFailingGrade(profile, criteria) {
  if (!criteria.mustNotHaveFailingGrade) return null;
  
  const hasFailing = profile.hasFailingGrade;
  const passed = !hasFailing;
  
  return {
    criterion: 'No Failing Grade',
    passed,
    applicantValue: passed ? 'No failing grades' : 'Has failing grade(s)',
    requiredValue: 'Must not have failing grades',
    notes: passed ? 'No failing grades' : 'Has one or more failing grades',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student has grade of 4 (conditional)
 */
function checkNoGradeOf4(profile, criteria) {
  if (!criteria.mustNotHaveGradeOf4) return null;
  
  const hasGrade4 = profile.hasGradeOf4;
  const passed = !hasGrade4;
  
  return {
    criterion: 'No Grade of 4',
    passed,
    applicantValue: passed ? 'No conditional grades' : 'Has grade of 4',
    requiredValue: 'Must not have grade of 4',
    notes: passed ? 'No conditional passing grades' : 'Has conditional passing grade(s)',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student has incomplete grade
 */
function checkNoIncompleteGrade(profile, criteria) {
  if (!criteria.mustNotHaveIncompleteGrade) return null;
  
  const hasIncomplete = profile.hasIncompleteGrade;
  const passed = !hasIncomplete;
  
  return {
    criterion: 'No Incomplete Grade',
    passed,
    applicantValue: passed ? 'No incomplete grades' : 'Has incomplete grade(s)',
    requiredValue: 'Must not have incomplete grades',
    notes: passed ? 'No incomplete grades' : 'Has one or more incomplete grades',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check if student is graduating
 */
function checkMustBeGraduating(profile, criteria) {
  if (!criteria.mustBeGraduating) return null;
  
  const isGraduating = profile.isGraduating;
  const passed = isGraduating === true;
  
  return {
    criterion: 'Graduating Student',
    passed,
    applicantValue: passed ? 'Yes, graduating' : 'Not graduating',
    requiredValue: 'Must be graduating',
    notes: passed ? 'Is a graduating student' : 'Not a graduating student',
    type: 'boolean',
    category: 'academic'
  };
}

/**
 * Check Filipino citizenship requirement
 */
function checkFilipinoOnly(profile, criteria) {
  // Check both field names
  if (!criteria.isFilipinoOnly && !criteria.filipinoOnly) return null;
  
  const citizenship = profile.citizenship;
  const passed = citizenship === 'Filipino';
  
  return {
    criterion: 'Filipino Citizenship',
    passed,
    applicantValue: citizenship || 'Not provided',
    requiredValue: 'Must be Filipino',
    notes: passed ? 'Is a Filipino citizen' : 'Must be a Filipino citizen',
    type: 'boolean',
    category: 'personal'
  };
}

/**
 * Run all boolean checks
 */
function checkAll(profile, criteria) {
  const checks = [
    checkApprovedThesis(profile, criteria),
    checkNoOtherScholarship(profile, criteria),
    checkNoThesisGrant(profile, criteria),
    checkNoDisciplinaryAction(profile, criteria),
    checkNoFailingGrade(profile, criteria),
    checkNoGradeOf4(profile, criteria),
    checkNoIncompleteGrade(profile, criteria),
    checkMustBeGraduating(profile, criteria),
    checkFilipinoOnly(profile, criteria)
  ];
  
  // Filter out null checks (criteria not specified)
  return checks.filter(c => c !== null);
}

/**
 * Quick check - returns true if all boolean checks pass
 */
function quickCheck(profile, criteria) {
  const checks = checkAll(profile, criteria);
  return checks.every(c => c.passed);
}

module.exports = {
  checkApprovedThesis,
  checkNoOtherScholarship,
  checkNoThesisGrant,
  checkNoDisciplinaryAction,
  checkNoFailingGrade,
  checkNoGradeOf4,
  checkNoIncompleteGrade,
  checkMustBeGraduating,
  checkFilipinoOnly,
  checkAll,
  quickCheck
};

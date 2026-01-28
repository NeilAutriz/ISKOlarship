/**
 * =============================================================================
 * ISKOlarship - Modular Eligibility Checking System
 * =============================================================================
 * 
 * This module provides a standardized, maintainable approach to scholarship
 * eligibility checking with clear separation of:
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
 *    - Has Other Scholarship
 *    - Has Disciplinary Action
 *    - Is Graduating
 *    - Has Failing Grade
 *    etc.
 * 
 * =============================================================================
 */

const rangeChecks = require('./rangeChecks');
const listChecks = require('./listChecks');
const booleanChecks = require('./booleanChecks');
const { normalizeSTBracket, stBracketsMatch } = require('./normalizers');

/**
 * Check all eligibility criteria for a student against a scholarship
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Eligibility result with passed status, score, and detailed checks
 */
async function checkEligibility(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  // Run all checks
  const rangeResults = rangeChecks.checkAll(profile, criteria);
  const listResults = listChecks.checkAll(profile, criteria);
  const booleanResults = booleanChecks.checkAll(profile, criteria);
  
  // Combine all checks
  const allChecks = [...rangeResults, ...listResults, ...booleanResults];
  const passedChecks = allChecks.filter(c => c.passed).length;
  const totalChecks = allChecks.length;
  
  // Calculate score
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
  
  // Determine overall pass (all checks must pass)
  const passed = allChecks.every(c => c.passed);
  
  return {
    passed,
    score,
    checks: allChecks,
    summary: {
      total: totalChecks,
      passed: passedChecks,
      failed: totalChecks - passedChecks
    },
    breakdown: {
      range: {
        checks: rangeResults,
        passed: rangeResults.every(c => c.passed),
        count: rangeResults.length
      },
      list: {
        checks: listResults,
        passed: listResults.every(c => c.passed),
        count: listResults.length
      },
      boolean: {
        checks: booleanResults,
        passed: booleanResults.every(c => c.passed),
        count: booleanResults.length
      }
    }
  };
}

/**
 * Get a quick eligibility summary without detailed checks
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Quick eligibility summary
 */
function quickCheck(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  // Quick range checks
  const rangePass = rangeChecks.quickCheck(profile, criteria);
  const listPass = listChecks.quickCheck(profile, criteria);
  const booleanPass = booleanChecks.quickCheck(profile, criteria);
  
  return {
    passed: rangePass && listPass && booleanPass,
    rangePass,
    listPass,
    booleanPass
  };
}

module.exports = {
  checkEligibility,
  quickCheck,
  rangeChecks,
  listChecks,
  booleanChecks,
  normalizeSTBracket,
  stBracketsMatch
};

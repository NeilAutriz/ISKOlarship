/**
 * =============================================================================
 * ISKOlarship - Range-Based Eligibility Checks
 * =============================================================================
 * 
 * Handles numeric comparisons with min/max thresholds:
 * - GWA: Lower is better (1.0 = highest, 5.0 = lowest in UP system)
 * - Income: Must be within min-max range
 * - Units: Must meet minimum requirements
 * - Household Size: Must be within range (if specified)
 * 
 * Each check returns a standardized result object:
 * {
 *   criterion: string,      // Display name
 *   passed: boolean,        // Whether check passed
 *   applicantValue: any,    // Student's value
 *   requiredValue: string,  // Requirement description
 *   notes: string,          // Additional context
 *   type: 'range',          // Check type identifier
 *   category: string        // 'academic' | 'financial'
 * }
 * 
 * Returns null when criteria is not specified (skip check)
 * =============================================================================
 */

const { formatCurrency, formatGWA, hasValue } = require('./normalizers');

// =============================================================================
// ACADEMIC RANGE CHECKS
// =============================================================================

/**
 * Check GWA requirement
 * In UP system: 1.0 = highest, 5.0 = lowest
 * Scholarship specifies maxGWA (student GWA must be <= maxGWA)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkGWA(profile, criteria) {
  // Skip if no GWA requirement
  if (!hasValue(criteria.minGWA) && !hasValue(criteria.maxGWA)) return null;
  
  const studentGWA = profile.gwa;
  const maxGWA = criteria.maxGWA || 5.0;  // Default to passing all
  const minGWA = criteria.minGWA || 1.0;  // Default to 1.0 (best possible)
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentGWA)) {
    passed = false;
    notes = 'GWA not provided in profile';
  } else if (studentGWA < minGWA) {
    // GWA is better than expected (unusual case)
    passed = true;
    notes = 'Exceeds GWA requirement';
  } else if (studentGWA > maxGWA) {
    passed = false;
    notes = `GWA ${formatGWA(studentGWA)} does not meet the maximum requirement of ${formatGWA(maxGWA)}`;
  } else {
    passed = true;
    notes = 'Meets GWA requirement';
  }
  
  // Build requirement string
  let requiredValue = '';
  if (minGWA === 1.0 || !hasValue(criteria.minGWA)) {
    requiredValue = `≤ ${formatGWA(maxGWA)}`;
  } else {
    requiredValue = `${formatGWA(minGWA)} - ${formatGWA(maxGWA)}`;
  }
  
  return {
    criterion: 'GWA Requirement',
    passed,
    applicantValue: hasValue(studentGWA) ? formatGWA(studentGWA) : 'Not provided',
    requiredValue,
    notes,
    type: 'range',
    category: 'academic'
  };
}

/**
 * Check Minimum Units Enrolled requirement
 * Student must be enrolled in at least the minimum required units
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkUnitsEnrolled(profile, criteria) {
  if (!hasValue(criteria.minUnitsEnrolled)) return null;
  
  const units = profile.unitsEnrolled;
  const minUnits = criteria.minUnitsEnrolled;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(units)) {
    passed = false;
    notes = 'Units enrolled not provided in profile';
  } else if (units >= minUnits) {
    passed = true;
    notes = 'Meets minimum units enrolled requirement';
  } else {
    passed = false;
    notes = `Only ${units} units enrolled, need at least ${minUnits} units`;
  }
  
  return {
    criterion: 'Units Enrolled',
    passed,
    applicantValue: hasValue(units) ? `${units} units` : 'Not provided',
    requiredValue: `≥ ${minUnits} units`,
    notes,
    type: 'range',
    category: 'academic'
  };
}

/**
 * Check Minimum Units Passed requirement (commonly for thesis grants)
 * Student must have passed at least the minimum required units
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkUnitsPassed(profile, criteria) {
  if (!hasValue(criteria.minUnitsPassed)) return null;
  
  const units = profile.unitsPassed;
  const minUnits = criteria.minUnitsPassed;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(units)) {
    passed = false;
    notes = 'Units passed not provided in profile';
  } else if (units >= minUnits) {
    passed = true;
    notes = 'Meets minimum units passed requirement';
  } else {
    passed = false;
    notes = `Only ${units} units passed, need at least ${minUnits} units`;
  }
  
  return {
    criterion: 'Units Passed',
    passed,
    applicantValue: hasValue(units) ? `${units} units` : 'Not provided',
    requiredValue: `≥ ${minUnits} units`,
    notes,
    type: 'range',
    category: 'academic'
  };
}

// =============================================================================
// FINANCIAL RANGE CHECKS
// =============================================================================

/**
 * Check Annual Family Income requirement
 * Student income must be within min-max range (if specified)
 * Most scholarships specify only maximum income (need-based)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkAnnualFamilyIncome(profile, criteria) {
  // Skip if no income requirement
  if (!hasValue(criteria.maxAnnualFamilyIncome) && !hasValue(criteria.minAnnualFamilyIncome)) return null;
  
  const income = profile.annualFamilyIncome;
  const maxIncome = criteria.maxAnnualFamilyIncome;
  const minIncome = criteria.minAnnualFamilyIncome || 0;
  
  let passed = true;
  let notes = '';
  
  if (!hasValue(income)) {
    passed = false;
    notes = 'Annual family income not provided in profile';
  } else {
    // Check minimum income (if specified - rare)
    if (minIncome > 0 && income < minIncome) {
      passed = false;
      notes = `Family income ${formatCurrency(income)} is below minimum ${formatCurrency(minIncome)}`;
    }
    // Check maximum income (common for need-based scholarships)
    else if (hasValue(maxIncome) && income > maxIncome) {
      passed = false;
      notes = `Family income ${formatCurrency(income)} exceeds maximum ${formatCurrency(maxIncome)}`;
    } else {
      notes = 'Within eligible income range';
    }
  }
  
  // Build requirement string
  let requiredValue = '';
  if (minIncome > 0 && hasValue(maxIncome)) {
    requiredValue = `${formatCurrency(minIncome)} - ${formatCurrency(maxIncome)}`;
  } else if (hasValue(maxIncome)) {
    requiredValue = `≤ ${formatCurrency(maxIncome)}`;
  } else if (minIncome > 0) {
    requiredValue = `≥ ${formatCurrency(minIncome)}`;
  }
  
  return {
    criterion: 'Annual Family Income',
    passed,
    applicantValue: hasValue(income) ? formatCurrency(income) : 'Not provided',
    requiredValue,
    notes,
    type: 'range',
    category: 'financial'
  };
}

/**
 * Check Household Size requirement (if specified)
 * Some scholarships consider per-capita income, requiring household size
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkHouseholdSize(profile, criteria) {
  if (!hasValue(criteria.minHouseholdSize) && !hasValue(criteria.maxHouseholdSize)) return null;
  
  const size = profile.householdSize;
  const minSize = criteria.minHouseholdSize || 1;
  const maxSize = criteria.maxHouseholdSize;
  
  let passed = true;
  let notes = '';
  
  if (!hasValue(size)) {
    passed = false;
    notes = 'Household size not provided in profile';
  } else if (size < minSize) {
    passed = false;
    notes = `Household size ${size} is below minimum ${minSize}`;
  } else if (hasValue(maxSize) && size > maxSize) {
    passed = false;
    notes = `Household size ${size} exceeds maximum ${maxSize}`;
  } else {
    notes = 'Household size within eligible range';
  }
  
  // Build requirement string
  let requiredValue = '';
  if (hasValue(maxSize)) {
    requiredValue = `${minSize} - ${maxSize} members`;
  } else {
    requiredValue = `≥ ${minSize} members`;
  }
  
  return {
    criterion: 'Household Size',
    passed,
    applicantValue: hasValue(size) ? `${size} members` : 'Not provided',
    requiredValue,
    notes,
    type: 'range',
    category: 'financial'
  };
}

// =============================================================================
// AGGREGATE FUNCTIONS
// =============================================================================

/**
 * Run all range-based checks
 * Returns array of check results (excludes null/skipped checks)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Array} Array of check results
 */
function checkAll(profile, criteria) {
  const checks = [
    checkGWA(profile, criteria),
    checkAnnualFamilyIncome(profile, criteria),
    checkUnitsEnrolled(profile, criteria),
    checkUnitsPassed(profile, criteria),
    checkHouseholdSize(profile, criteria)
  ];
  
  // Filter out null checks (criteria not specified)
  return checks.filter(c => c !== null);
}

/**
 * Quick check - returns true if all range checks pass
 * Useful for fast eligibility pre-screening
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {boolean} True if all range checks pass
 */
function quickCheck(profile, criteria) {
  const checks = checkAll(profile, criteria);
  return checks.every(c => c.passed);
}

/**
 * Get summary of range check results
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
  // Individual checks
  checkGWA,
  checkAnnualFamilyIncome,
  checkUnitsEnrolled,
  checkUnitsPassed,
  checkHouseholdSize,
  
  // Aggregate functions
  checkAll,
  quickCheck,
  getSummary
};

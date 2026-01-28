/**
 * =============================================================================
 * Range-Based Eligibility Checks
 * =============================================================================
 * 
 * Handles numeric comparisons with min/max thresholds:
 * - GWA: Lower is better (1.0 = highest, 5.0 = lowest in UP system)
 * - Income: Must be within min-max range
 * - Units: Must meet minimum requirements
 * 
 * Each check returns:
 * {
 *   criterion: string,      // Display name
 *   passed: boolean,        // Whether check passed
 *   applicantValue: any,    // Student's value
 *   requiredValue: string,  // Requirement description
 *   notes: string,          // Additional context
 *   type: 'range',          // Check type identifier
 *   category: string        // 'academic' | 'financial'
 * }
 * =============================================================================
 */

/**
 * Check GWA requirement
 * In UP system: 1.0 = highest, 5.0 = lowest
 * Scholarship specifies maxGWA (student GWA must be <= maxGWA)
 */
function checkGWA(profile, criteria) {
  // Skip if no GWA requirement
  if (!criteria.minGWA && !criteria.maxGWA) return null;
  
  const studentGWA = profile.gwa;
  const maxGWA = criteria.maxGWA || 5.0;  // Default to passing all
  const minGWA = criteria.minGWA || 1.0;  // Default to 1.0
  
  // Student GWA must be >= minGWA (best) and <= maxGWA (threshold)
  // In UP: lower GWA is better, so student's GWA should be <= maxGWA
  const passed = studentGWA != null && studentGWA >= minGWA && studentGWA <= maxGWA;
  
  return {
    criterion: 'GWA Requirement',
    passed,
    applicantValue: studentGWA != null ? studentGWA.toFixed(2) : 'Not provided',
    requiredValue: minGWA === 1.0 
      ? `≤ ${maxGWA.toFixed(2)}` 
      : `${minGWA.toFixed(2)} - ${maxGWA.toFixed(2)}`,
    notes: passed 
      ? 'Meets GWA requirement' 
      : studentGWA == null 
        ? 'GWA not provided' 
        : `GWA ${studentGWA.toFixed(2)} does not meet requirement`,
    type: 'range',
    category: 'academic'
  };
}

/**
 * Check Annual Family Income requirement
 * Student income must be within min-max range (if specified)
 */
function checkAnnualFamilyIncome(profile, criteria) {
  // Skip if no income requirement
  if (!criteria.maxAnnualFamilyIncome && !criteria.minAnnualFamilyIncome) return null;
  
  const income = profile.annualFamilyIncome;
  const maxIncome = criteria.maxAnnualFamilyIncome;
  const minIncome = criteria.minAnnualFamilyIncome || 0;
  
  let passed = true;
  let notes = '';
  
  if (income == null) {
    passed = false;
    notes = 'Income not provided';
  } else {
    // Check minimum income (if specified)
    if (minIncome > 0 && income < minIncome) {
      passed = false;
      notes = `Income ₱${income.toLocaleString()} is below minimum ₱${minIncome.toLocaleString()}`;
    }
    // Check maximum income
    else if (maxIncome && income > maxIncome) {
      passed = false;
      notes = `Income ₱${income.toLocaleString()} exceeds maximum ₱${maxIncome.toLocaleString()}`;
    } else {
      notes = 'Within income range';
    }
  }
  
  // Build requirement string
  let requiredValue = '';
  if (minIncome > 0 && maxIncome) {
    requiredValue = `₱${minIncome.toLocaleString()} - ₱${maxIncome.toLocaleString()}`;
  } else if (maxIncome) {
    requiredValue = `≤ ₱${maxIncome.toLocaleString()}`;
  } else if (minIncome > 0) {
    requiredValue = `≥ ₱${minIncome.toLocaleString()}`;
  }
  
  return {
    criterion: 'Annual Family Income',
    passed,
    applicantValue: income != null ? `₱${income.toLocaleString()}` : 'Not provided',
    requiredValue,
    notes,
    type: 'range',
    category: 'financial'
  };
}

/**
 * Check Minimum Units Enrolled requirement
 */
function checkUnitsEnrolled(profile, criteria) {
  if (!criteria.minUnitsEnrolled) return null;
  
  const units = profile.unitsEnrolled;
  const minUnits = criteria.minUnitsEnrolled;
  
  const passed = units != null && units >= minUnits;
  
  return {
    criterion: 'Units Enrolled',
    passed,
    applicantValue: units != null ? `${units} units` : 'Not provided',
    requiredValue: `≥ ${minUnits} units`,
    notes: passed 
      ? 'Meets minimum units enrolled' 
      : units == null 
        ? 'Units enrolled not provided' 
        : `Only ${units} units enrolled (need ${minUnits})`,
    type: 'range',
    category: 'academic'
  };
}

/**
 * Check Minimum Units Passed requirement (for thesis grants)
 */
function checkUnitsPassed(profile, criteria) {
  if (!criteria.minUnitsPassed) return null;
  
  const units = profile.unitsPassed;
  const minUnits = criteria.minUnitsPassed;
  
  const passed = units != null && units >= minUnits;
  
  return {
    criterion: 'Units Passed',
    passed,
    applicantValue: units != null ? `${units} units` : 'Not provided',
    requiredValue: `≥ ${minUnits} units`,
    notes: passed 
      ? 'Meets minimum units passed' 
      : units == null 
        ? 'Units passed not provided' 
        : `Only ${units} units passed (need ${minUnits})`,
    type: 'range',
    category: 'academic'
  };
}

/**
 * Check Household Size requirement (if specified)
 */
function checkHouseholdSize(profile, criteria) {
  if (!criteria.minHouseholdSize && !criteria.maxHouseholdSize) return null;
  
  const size = profile.householdSize;
  const minSize = criteria.minHouseholdSize || 1;
  const maxSize = criteria.maxHouseholdSize;
  
  let passed = true;
  let notes = '';
  
  if (size == null) {
    passed = false;
    notes = 'Household size not provided';
  } else if (size < minSize) {
    passed = false;
    notes = `Household size ${size} is below minimum ${minSize}`;
  } else if (maxSize && size > maxSize) {
    passed = false;
    notes = `Household size ${size} exceeds maximum ${maxSize}`;
  } else {
    notes = 'Household size within range';
  }
  
  let requiredValue = '';
  if (maxSize) {
    requiredValue = `${minSize} - ${maxSize} members`;
  } else {
    requiredValue = `≥ ${minSize} members`;
  }
  
  return {
    criterion: 'Household Size',
    passed,
    applicantValue: size != null ? `${size} members` : 'Not provided',
    requiredValue,
    notes,
    type: 'range',
    category: 'financial'
  };
}

/**
 * Run all range-based checks
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
 */
function quickCheck(profile, criteria) {
  const checks = checkAll(profile, criteria);
  return checks.every(c => c.passed);
}

module.exports = {
  checkGWA,
  checkAnnualFamilyIncome,
  checkUnitsEnrolled,
  checkUnitsPassed,
  checkHouseholdSize,
  checkAll,
  quickCheck
};

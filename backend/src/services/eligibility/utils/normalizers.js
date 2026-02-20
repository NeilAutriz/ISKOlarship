/**
 * =============================================================================
 * ISKOlarship - Value Normalizers
 * =============================================================================
 * 
 * Utility functions for normalizing values between different formats.
 * Used by eligibility conditions to handle format variations.
 * 
 * =============================================================================
 */

// =============================================================================
// UPLB GRADING SYSTEM CONSTANTS
// Modify these values if deploying to a different institution
// =============================================================================

const GWA_RANGE = {
  MIN: 1.0,   // Highest/best GWA (UP system uses 1.0 as highest)
  MAX: 5.0    // Lowest/worst GWA
};

// =============================================================================
// ST BRACKET NORMALIZATION
// Backend stores full names, frontend uses short codes
// =============================================================================

const ST_BRACKET_MAP = {
  // Short codes -> Full names
  'FDS': 'Full Discount with Stipend',
  'FD': 'Full Discount',
  'PD80': 'PD80',
  'PD60': 'PD60',
  'PD40': 'PD40',
  'PD20': 'PD20',
  'ND': 'No Discount',
  // Full names (normalized)
  'FULL DISCOUNT WITH STIPEND': 'Full Discount with Stipend',
  'FULL DISCOUNT': 'Full Discount',
  'NO DISCOUNT': 'No Discount'
};

/**
 * Normalize ST Bracket to canonical form
 * @param {string} bracket - ST bracket code or full name
 * @returns {string} Normalized ST bracket name
 */
function normalizeSTBracket(bracket) {
  if (!bracket) return null;
  const normalized = bracket.toString().trim().toUpperCase();
  return ST_BRACKET_MAP[normalized] || bracket;
}

/**
 * Check if student's ST bracket matches any required brackets
 * @param {string} studentBracket - Student's ST bracket
 * @param {string[]} requiredBrackets - List of acceptable brackets
 * @returns {boolean} Whether there's a match
 */
function stBracketsMatch(studentBracket, requiredBrackets) {
  if (!studentBracket || !requiredBrackets || requiredBrackets.length === 0) {
    return true; // No requirement = pass
  }
  
  const normalizedStudent = normalizeSTBracket(studentBracket);
  return requiredBrackets.some(req => {
    const normalizedReq = normalizeSTBracket(req);
    return normalizedStudent?.toLowerCase() === normalizedReq?.toLowerCase();
  });
}

// =============================================================================
// YEAR LEVEL NORMALIZATION
// =============================================================================

const YEAR_LEVEL_MAP = {
  '1ST YEAR': 'Freshman',
  '2ND YEAR': 'Sophomore',
  '3RD YEAR': 'Junior',
  '4TH YEAR': 'Senior',
  '5TH YEAR': 'Senior',
  'FIRST YEAR': 'Freshman',
  'SECOND YEAR': 'Sophomore',
  'THIRD YEAR': 'Junior',
  'FOURTH YEAR': 'Senior',
  'FIFTH YEAR': 'Senior',
  'FRESHMAN': 'Freshman',
  'SOPHOMORE': 'Sophomore',
  'JUNIOR': 'Junior',
  'SENIOR': 'Senior'
};

/**
 * Normalize year level to canonical form
 * @param {string} yearLevel - Year level string
 * @returns {string} Normalized year level
 */
function normalizeYearLevel(yearLevel) {
  if (!yearLevel) return null;
  const normalized = yearLevel.toString().trim().toUpperCase();
  return YEAR_LEVEL_MAP[normalized] || yearLevel;
}

// =============================================================================
// COLLEGE NORMALIZATION
// =============================================================================

const COLLEGE_CODE_MAP = {
  // Short codes -> Full names
  'CAS': 'College of Arts and Sciences',
  'CAFS': 'College of Agriculture and Food Science',
  'CEM': 'College of Economics and Management',
  'CEAT': 'College of Engineering and Agro-Industrial Technology',
  'CFNR': 'College of Forestry and Natural Resources',
  'CHE': 'College of Human Ecology',
  'CVM': 'College of Veterinary Medicine',
  'CDC': 'College of Development Communication',
  'CPAF': 'College of Public Affairs and Development',
  'GS': 'Graduate School',
  'SESAM': 'School of Environmental Science and Management'
};

/**
 * Normalize college to code or full name
 * @param {string} college - College code or name
 * @param {boolean} toCode - If true, return code; if false, return full name
 * @returns {string} Normalized college
 */
function normalizeCollege(college, toCode = false) {
  if (!college) return null;
  
  const upperCollege = college.toString().trim().toUpperCase();
  
  // If it's already a code
  if (COLLEGE_CODE_MAP[upperCollege]) {
    return toCode ? upperCollege : COLLEGE_CODE_MAP[upperCollege];
  }
  
  // Try to find by full name
  for (const [code, fullName] of Object.entries(COLLEGE_CODE_MAP)) {
    if (fullName.toUpperCase() === upperCollege) {
      return toCode ? code : fullName;
    }
  }
  
  return college;
}

// =============================================================================
// INCOME NORMALIZATION
// =============================================================================

/**
 * Normalize income value (handle different formats)
 * @param {string|number} income - Income value
 * @returns {number} Normalized income
 */
function normalizeIncome(income) {
  if (income == null) return null;
  
  if (typeof income === 'number') return income;
  
  // Remove currency symbols and commas
  const cleaned = income.toString().replace(/[₱$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

// =============================================================================
// GWA NORMALIZATION
// =============================================================================

/**
 * Normalize GWA value
 * @param {string|number} gwa - GWA value
 * @returns {number} Normalized GWA (clamped to valid range)
 */
function normalizeGWA(gwa) {
  if (gwa == null) return null;
  
  const parsed = parseFloat(gwa);
  if (isNaN(parsed)) return null;
  
  // Ensure it's within valid range (using configured constants)
  return Math.max(GWA_RANGE.MIN, Math.min(GWA_RANGE.MAX, parsed));
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  GWA_RANGE,
  
  // ST Bracket
  ST_BRACKET_MAP,
  normalizeSTBracket,
  stBracketsMatch,
  
  // Year Level
  YEAR_LEVEL_MAP,
  normalizeYearLevel,
  
  // College
  COLLEGE_CODE_MAP,
  normalizeCollege,
  
  // Numeric
  normalizeIncome,
  normalizeGWA
};

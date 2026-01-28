/**
 * =============================================================================
 * Data Normalizers
 * =============================================================================
 * 
 * Handles normalization of values that may come in different formats:
 * - ST Bracket: "FDS" vs "Full Discount with Stipend"
 * - Year Level: "1st Year" vs "Freshman"
 * 
 * =============================================================================
 */

/**
 * ST Bracket Mapping
 * Maps both short codes and full names to a canonical form
 */
const ST_BRACKET_MAP = {
  // Short codes -> canonical
  'FDS': 'Full Discount with Stipend',
  'FD': 'Full Discount',
  'PD80': 'PD80',
  'PD60': 'PD60',
  'PD40': 'PD40',
  'PD20': 'PD20',
  'ND': 'No Discount',
  // Full names -> canonical (uppercase for lookup)
  'FULL DISCOUNT WITH STIPEND': 'Full Discount with Stipend',
  'FULL DISCOUNT': 'Full Discount',
  '80% PARTIAL DISCOUNT': 'PD80',
  '60% PARTIAL DISCOUNT': 'PD60',
  '40% PARTIAL DISCOUNT': 'PD40',
  '20% PARTIAL DISCOUNT': 'PD20',
  'NO DISCOUNT': 'No Discount'
};

/**
 * Normalize ST Bracket to canonical form
 * @param {string} bracket - ST bracket value (short code or full name)
 * @returns {string|null} Canonical form or original if not found
 */
function normalizeSTBracket(bracket) {
  if (!bracket) return null;
  const upper = bracket.toString().trim().toUpperCase();
  return ST_BRACKET_MAP[upper] || bracket;
}

/**
 * Check if student's ST bracket matches any in the eligible list
 * Handles both short codes and full names transparently
 * 
 * @param {string} studentBracket - Student's ST bracket
 * @param {string[]} eligibleBrackets - List of eligible brackets
 * @returns {boolean} True if student's bracket is in the eligible list
 */
function stBracketsMatch(studentBracket, eligibleBrackets) {
  if (!studentBracket || !eligibleBrackets || eligibleBrackets.length === 0) {
    return false;
  }
  
  const normalizedStudent = normalizeSTBracket(studentBracket);
  
  return eligibleBrackets.some(bracket => {
    const normalizedRequired = normalizeSTBracket(bracket);
    return (
      normalizedStudent === normalizedRequired ||
      normalizedStudent?.toLowerCase() === normalizedRequired?.toLowerCase()
    );
  });
}

/**
 * Year Level Mapping
 * Maps various formats to canonical form
 */
const YEAR_LEVEL_MAP = {
  // Numeric formats
  '1': 'Freshman',
  '2': 'Sophomore',
  '3': 'Junior',
  '4': 'Senior',
  '5': 'Graduate',
  // Ordinal formats
  '1ST YEAR': 'Freshman',
  '2ND YEAR': 'Sophomore',
  '3RD YEAR': 'Junior',
  '4TH YEAR': 'Senior',
  '5TH YEAR': 'Graduate',
  // Full names (canonical)
  'FRESHMAN': 'Freshman',
  'SOPHOMORE': 'Sophomore',
  'JUNIOR': 'Junior',
  'SENIOR': 'Senior',
  'GRADUATE': 'Graduate',
  'INCOMING FRESHMAN': 'Incoming Freshman'
};

/**
 * Normalize Year Level to canonical form
 * @param {string} yearLevel - Year level value
 * @returns {string|null} Canonical form or original if not found
 */
function normalizeYearLevel(yearLevel) {
  if (!yearLevel) return null;
  const upper = yearLevel.toString().trim().toUpperCase();
  return YEAR_LEVEL_MAP[upper] || yearLevel;
}

/**
 * Check if student's year level matches any in the eligible list
 * 
 * @param {string} studentLevel - Student's year level
 * @param {string[]} eligibleLevels - List of eligible year levels
 * @returns {boolean} True if student's level is in the eligible list
 */
function yearLevelsMatch(studentLevel, eligibleLevels) {
  if (!studentLevel || !eligibleLevels || eligibleLevels.length === 0) {
    return false;
  }
  
  const normalizedStudent = normalizeYearLevel(studentLevel);
  
  return eligibleLevels.some(level => {
    const normalizedRequired = normalizeYearLevel(level);
    return (
      normalizedStudent === normalizedRequired ||
      normalizedStudent?.toLowerCase() === normalizedRequired?.toLowerCase()
    );
  });
}

/**
 * Get ST Bracket value for logistic regression
 * Returns normalized value for ML model (0-1 scale)
 * Higher value = higher financial need
 */
function getSTBracketMLValue(bracket) {
  if (!bracket) return 0.5; // Neutral if unknown
  
  const normalized = normalizeSTBracket(bracket)?.toUpperCase();
  
  const values = {
    'FULL DISCOUNT WITH STIPEND': 1.0,
    'FULL DISCOUNT': 0.85,
    'PD80': 0.7,
    'PD60': 0.55,
    'PD40': 0.4,
    'PD20': 0.25,
    'NO DISCOUNT': 0.1
  };
  
  return values[normalized] || 0.5;
}

module.exports = {
  normalizeSTBracket,
  stBracketsMatch,
  normalizeYearLevel,
  yearLevelsMatch,
  getSTBracketMLValue,
  ST_BRACKET_MAP,
  YEAR_LEVEL_MAP
};

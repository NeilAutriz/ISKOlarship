/**
 * =============================================================================
 * ISKOlarship - Data Normalizers
 * =============================================================================
 * 
 * Handles normalization of values that may come in different formats:
 * - ST Bracket: "FDS" vs "Full Discount with Stipend"
 * - Year Level: "1st Year" vs "Freshman"
 * - College: "CAS" vs "College of Arts and Sciences"
 * - Course names with variations
 * 
 * This module ensures consistent comparisons regardless of input format.
 * =============================================================================
 */

// =============================================================================
// ST BRACKET NORMALIZATION
// =============================================================================

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
  'NO DISCOUNT': 'No Discount',
  // Alternative formats
  'BRACKET A': 'Full Discount with Stipend',
  'BRACKET B': 'Full Discount',
  'BRACKET C': 'PD80',
  'BRACKET D': 'PD60',
  'BRACKET E': 'PD40',
  'BRACKET F': 'PD20',
  'BRACKET G': 'No Discount'
};

/**
 * ST Bracket financial need ordering (for comparison)
 * Higher index = lower financial need
 */
const ST_BRACKET_ORDER = [
  'Full Discount with Stipend',
  'Full Discount',
  'PD80',
  'PD60',
  'PD40',
  'PD20',
  'No Discount'
];

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
 * Get ST Bracket index for comparison (lower index = higher need)
 * @param {string} bracket - ST bracket value
 * @returns {number} Index in order array (-1 if not found)
 */
function getSTBracketIndex(bracket) {
  const normalized = normalizeSTBracket(bracket);
  return ST_BRACKET_ORDER.indexOf(normalized);
}

/**
 * Get ST Bracket value for logistic regression
 * Returns normalized value for ML model (0-1 scale)
 * Higher value = higher financial need
 */
function getSTBracketMLValue(bracket) {
  if (!bracket) return 0.5; // Neutral if unknown
  
  const normalized = normalizeSTBracket(bracket);
  
  const values = {
    'Full Discount with Stipend': 1.0,
    'Full Discount': 0.85,
    'PD80': 0.7,
    'PD60': 0.55,
    'PD40': 0.4,
    'PD20': 0.25,
    'No Discount': 0.1
  };
  
  return values[normalized] || 0.5;
}

// =============================================================================
// YEAR LEVEL / CLASSIFICATION NORMALIZATION
// =============================================================================

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
  'FIRST YEAR': 'Freshman',
  'SECOND YEAR': 'Sophomore',
  'THIRD YEAR': 'Junior',
  'FOURTH YEAR': 'Senior',
  'FIFTH YEAR': 'Graduate',
  // Full names (canonical)
  'FRESHMAN': 'Freshman',
  'SOPHOMORE': 'Sophomore',
  'JUNIOR': 'Junior',
  'SENIOR': 'Senior',
  'GRADUATE': 'Graduate',
  'INCOMING FRESHMAN': 'Incoming Freshman',
  'INCOMING': 'Incoming Freshman',
  // Additional variants
  'GRAD': 'Graduate',
  'GRAD STUDENT': 'Graduate',
  'GRADUATE STUDENT': 'Graduate'
};

/**
 * Year level ordering for comparison
 */
const YEAR_LEVEL_ORDER = [
  'Incoming Freshman',
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate'
];

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
 * Get year level index for comparison
 * @param {string} level - Year level value
 * @returns {number} Index in order array (-1 if not found)
 */
function getYearLevelIndex(level) {
  const normalized = normalizeYearLevel(level);
  return YEAR_LEVEL_ORDER.indexOf(normalized);
}

/**
 * Get year level value for ML model (0-1 scale)
 * @param {string} level - Year level value
 * @returns {number} Normalized value
 */
function getYearLevelMLValue(level) {
  if (!level) return 0.5;
  
  const index = getYearLevelIndex(level);
  if (index === -1) return 0.5;
  
  // Normalize to 0-1 (Incoming Freshman = 0, Graduate = 1)
  return index / (YEAR_LEVEL_ORDER.length - 1);
}

// =============================================================================
// COLLEGE NORMALIZATION
// =============================================================================

/**
 * UPLB College Mapping
 * Maps abbreviations to full names
 */
const COLLEGE_MAP = {
  // Abbreviations -> Full names
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
  // Full names -> Full names (uppercase for lookup)
  'COLLEGE OF ARTS AND SCIENCES': 'College of Arts and Sciences',
  'COLLEGE OF AGRICULTURE AND FOOD SCIENCE': 'College of Agriculture and Food Science',
  'COLLEGE OF ECONOMICS AND MANAGEMENT': 'College of Economics and Management',
  'COLLEGE OF ENGINEERING AND AGRO-INDUSTRIAL TECHNOLOGY': 'College of Engineering and Agro-Industrial Technology',
  'COLLEGE OF FORESTRY AND NATURAL RESOURCES': 'College of Forestry and Natural Resources',
  'COLLEGE OF HUMAN ECOLOGY': 'College of Human Ecology',
  'COLLEGE OF VETERINARY MEDICINE': 'College of Veterinary Medicine',
  'COLLEGE OF DEVELOPMENT COMMUNICATION': 'College of Development Communication',
  'COLLEGE OF PUBLIC AFFAIRS AND DEVELOPMENT': 'College of Public Affairs and Development',
  'GRADUATE SCHOOL': 'Graduate School'
};

/**
 * Normalize college name to canonical form
 * @param {string} college - College name or abbreviation
 * @returns {string|null} Canonical form or original if not found
 */
function normalizeCollege(college) {
  if (!college) return null;
  const upper = college.toString().trim().toUpperCase();
  return COLLEGE_MAP[upper] || college;
}

/**
 * Check if student's college matches any in the eligible list
 * 
 * @param {string} studentCollege - Student's college
 * @param {string[]} eligibleColleges - List of eligible colleges
 * @returns {boolean} True if student's college is in the eligible list
 */
function collegesMatch(studentCollege, eligibleColleges) {
  if (!studentCollege || !eligibleColleges || eligibleColleges.length === 0) {
    return false;
  }
  
  const normalizedStudent = normalizeCollege(studentCollege);
  
  return eligibleColleges.some(college => {
    const normalizedRequired = normalizeCollege(college);
    return (
      normalizedStudent === normalizedRequired ||
      normalizedStudent?.toLowerCase() === normalizedRequired?.toLowerCase()
    );
  });
}

// =============================================================================
// COURSE / PROGRAM NORMALIZATION
// =============================================================================

/**
 * Common course abbreviation patterns
 */
const COURSE_ABBREVIATIONS = {
  'BS': 'Bachelor of Science in',
  'BA': 'Bachelor of Arts in',
  'AB': 'Bachelor of Arts in',
  'BSCS': 'Bachelor of Science in Computer Science',
  'BSIT': 'Bachelor of Science in Information Technology',
  'BSME': 'Bachelor of Science in Mechanical Engineering',
  'BSCE': 'Bachelor of Science in Civil Engineering',
  'BSEE': 'Bachelor of Science in Electrical Engineering',
  'BSA': 'Bachelor of Science in Agriculture',
  'DVM': 'Doctor of Veterinary Medicine'
};

/**
 * Normalize course name for comparison
 * Handles abbreviations and common variations
 * @param {string} course - Course name
 * @returns {string} Normalized course name
 */
function normalizeCourse(course) {
  if (!course) return '';
  
  let normalized = course.toString().trim();
  
  // Check if it's a known abbreviation
  const upper = normalized.toUpperCase();
  if (COURSE_ABBREVIATIONS[upper]) {
    return COURSE_ABBREVIATIONS[upper];
  }
  
  // Normalize common patterns
  normalized = normalized
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/B\.S\./gi, 'BS')      // B.S. -> BS
    .replace(/B\.A\./gi, 'BA')      // B.A. -> BA
    .replace(/A\.B\./gi, 'AB');     // A.B. -> AB
  
  return normalized;
}

/**
 * Check if student's course matches any in the eligible list
 * Uses fuzzy matching to handle variations
 * 
 * @param {string} studentCourse - Student's course
 * @param {string[]} eligibleCourses - List of eligible courses
 * @returns {boolean} True if student's course is in the eligible list
 */
function coursesMatch(studentCourse, eligibleCourses) {
  if (!studentCourse || !eligibleCourses || eligibleCourses.length === 0) {
    return false;
  }
  
  const normalizedStudent = normalizeCourse(studentCourse).toLowerCase();
  
  return eligibleCourses.some(course => {
    const normalizedRequired = normalizeCourse(course).toLowerCase();
    
    // Exact match
    if (normalizedStudent === normalizedRequired) return true;
    
    // Partial match (one contains the other)
    if (normalizedStudent.includes(normalizedRequired)) return true;
    if (normalizedRequired.includes(normalizedStudent)) return true;
    
    return false;
  });
}

// =============================================================================
// PROVINCE NORMALIZATION
// =============================================================================

/**
 * Province name variations
 */
const PROVINCE_ALIASES = {
  'NCR': 'Metro Manila',
  'NATIONAL CAPITAL REGION': 'Metro Manila',
  'MANILA': 'Metro Manila',
  'QUEZON CITY': 'Metro Manila',
  'MAKATI': 'Metro Manila',
  'DAVAO': 'Davao del Sur',
  'CEBU CITY': 'Cebu'
};

/**
 * Normalize province name
 * @param {string} province - Province name
 * @returns {string} Normalized province name
 */
function normalizeProvince(province) {
  if (!province) return '';
  
  const upper = province.toString().trim().toUpperCase();
  return PROVINCE_ALIASES[upper] || province;
}

/**
 * Check if student's province matches any in the eligible list
 * 
 * @param {string} studentProvince - Student's province
 * @param {string[]} eligibleProvinces - List of eligible provinces
 * @returns {boolean} True if student's province is in the eligible list
 */
function provincesMatch(studentProvince, eligibleProvinces) {
  if (!studentProvince || !eligibleProvinces || eligibleProvinces.length === 0) {
    return false;
  }
  
  const normalizedStudent = normalizeProvince(studentProvince).toLowerCase();
  
  return eligibleProvinces.some(province => {
    const normalizedRequired = normalizeProvince(province).toLowerCase();
    return (
      normalizedStudent === normalizedRequired ||
      normalizedStudent.includes(normalizedRequired) ||
      normalizedRequired.includes(normalizedStudent)
    );
  });
}

// =============================================================================
// CITIZENSHIP NORMALIZATION
// =============================================================================

/**
 * Citizenship variations
 */
const CITIZENSHIP_MAP = {
  'FILIPINO': 'Filipino',
  'PHILIPPINE': 'Filipino',
  'PH': 'Filipino',
  'DUAL CITIZEN': 'Dual Citizen',
  'DUAL': 'Dual Citizen',
  'DUAL CITIZENSHIP': 'Dual Citizen',
  'FOREIGN': 'Foreign National',
  'FOREIGN NATIONAL': 'Foreign National',
  'FOREIGNER': 'Foreign National'
};

/**
 * Normalize citizenship value
 * @param {string} citizenship - Citizenship value
 * @returns {string} Normalized citizenship
 */
function normalizeCitizenship(citizenship) {
  if (!citizenship) return '';
  const upper = citizenship.toString().trim().toUpperCase();
  return CITIZENSHIP_MAP[upper] || citizenship;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Safe string comparison (handles null/undefined)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {boolean} caseSensitive - Whether comparison is case sensitive
 * @returns {boolean} True if strings match
 */
function safeStringCompare(a, b, caseSensitive = false) {
  if (!a || !b) return false;
  
  const strA = a.toString().trim();
  const strB = b.toString().trim();
  
  if (caseSensitive) {
    return strA === strB;
  }
  
  return strA.toLowerCase() === strB.toLowerCase();
}

/**
 * Check if a value exists and is not empty
 * @param {any} value - Value to check
 * @returns {boolean} True if value exists and is not empty
 */
function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  if (amount == null) return 'N/A';
  return `₱${amount.toLocaleString()}`;
}

/**
 * Format GWA for display
 * @param {number} gwa - GWA value
 * @returns {string} Formatted GWA string
 */
function formatGWA(gwa) {
  if (gwa == null) return 'N/A';
  return gwa.toFixed(2);
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  // ST Bracket
  normalizeSTBracket,
  stBracketsMatch,
  getSTBracketIndex,
  getSTBracketMLValue,
  ST_BRACKET_MAP,
  ST_BRACKET_ORDER,
  
  // Year Level
  normalizeYearLevel,
  yearLevelsMatch,
  getYearLevelIndex,
  getYearLevelMLValue,
  YEAR_LEVEL_MAP,
  YEAR_LEVEL_ORDER,
  
  // College
  normalizeCollege,
  collegesMatch,
  COLLEGE_MAP,
  
  // Course
  normalizeCourse,
  coursesMatch,
  COURSE_ABBREVIATIONS,
  
  // Province
  normalizeProvince,
  provincesMatch,
  PROVINCE_ALIASES,
  
  // Citizenship
  normalizeCitizenship,
  CITIZENSHIP_MAP,
  
  // Utilities
  safeStringCompare,
  hasValue,
  formatCurrency,
  formatGWA
};

/**
 * =============================================================================
 * ISKOlarship - List Membership Eligibility Checks
 * =============================================================================
 * 
 * Handles checks where student value must be in a list of allowed values:
 * - Year Level/Classification
 * - College
 * - Course
 * - Major
 * - ST Bracket (Socialized Tuition)
 * - Province of Origin
 * - Citizenship
 * 
 * Uses normalizers to handle variations in data entry (e.g., "FDS" vs 
 * "Full Discount with Stipend", "CAS" vs "College of Arts and Sciences")
 * 
 * Each check returns a standardized result object:
 * {
 *   criterion: string,      // Display name
 *   passed: boolean,        // Whether check passed
 *   applicantValue: any,    // Student's value
 *   requiredValue: string,  // Requirement description
 *   notes: string,          // Additional context
 *   type: 'list',           // Check type identifier
 *   category: string        // 'academic' | 'financial' | 'location' | 'personal'
 * }
 * 
 * Returns null when criteria is not specified (skip check)
 * =============================================================================
 */

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
  normalizeCitizenship,
  hasValue
} = require('./normalizers');

// =============================================================================
// ACADEMIC LIST CHECKS
// =============================================================================

/**
 * Check Year Level/Classification requirement
 * Handles both field names: requiredYearLevels and eligibleClassifications
 * Uses normalizer to handle "Freshman" vs "1st Year" variations
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkYearLevel(profile, criteria) {
  // Get the list from either field name (backward compatibility)
  const eligibleLevels = criteria.requiredYearLevels || criteria.eligibleClassifications || [];
  
  // Skip if no requirement
  if (!Array.isArray(eligibleLevels) || eligibleLevels.length === 0) return null;
  
  const studentLevel = profile.classification || profile.yearLevel;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentLevel)) {
    passed = false;
    notes = 'Year level/classification not provided in profile';
  } else {
    // Use normalizer for comparison
    passed = yearLevelsMatch(studentLevel, eligibleLevels);
    notes = passed 
      ? 'Year level is eligible for this scholarship'
      : `${normalizeYearLevel(studentLevel)} is not among the eligible year levels`;
  }
  
  return {
    criterion: 'Year Level',
    passed,
    applicantValue: hasValue(studentLevel) ? normalizeYearLevel(studentLevel) : 'Not provided',
    requiredValue: eligibleLevels.map(l => normalizeYearLevel(l)).join(', '),
    notes,
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check College eligibility
 * Uses normalizer to handle abbreviations (CAS, CAFS, etc.)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkCollege(profile, criteria) {
  const eligibleColleges = criteria.eligibleColleges || [];
  
  if (!Array.isArray(eligibleColleges) || eligibleColleges.length === 0) return null;
  
  const studentCollege = profile.college;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentCollege)) {
    passed = false;
    notes = 'College not provided in profile';
  } else {
    // Use normalizer for comparison
    passed = collegesMatch(studentCollege, eligibleColleges);
    notes = passed 
      ? 'College is eligible for this scholarship'
      : 'College is not in the eligible list';
  }
  
  // Format display value based on number of colleges
  const displayColleges = eligibleColleges.length <= 3 
    ? eligibleColleges.map(c => normalizeCollege(c)).join(', ')
    : `${eligibleColleges.length} eligible colleges`;
  
  return {
    criterion: 'College',
    passed,
    applicantValue: hasValue(studentCollege) ? normalizeCollege(studentCollege) : 'Not provided',
    requiredValue: displayColleges,
    notes,
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check Course eligibility
 * Uses fuzzy matching to handle course name variations
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkCourse(profile, criteria) {
  const eligibleCourses = criteria.eligibleCourses || [];
  
  if (!Array.isArray(eligibleCourses) || eligibleCourses.length === 0) return null;
  
  const studentCourse = profile.course;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentCourse)) {
    passed = false;
    notes = 'Course not provided in profile';
  } else {
    // Use normalizer for comparison (handles abbreviations and variations)
    passed = coursesMatch(studentCourse, eligibleCourses);
    notes = passed 
      ? 'Course is eligible for this scholarship'
      : 'Course is not in the eligible list';
  }
  
  // Format display value based on number of courses
  const displayCourses = eligibleCourses.length <= 3 
    ? eligibleCourses.join(', ')
    : `${eligibleCourses.length} eligible courses`;
  
  return {
    criterion: 'Course',
    passed,
    applicantValue: studentCourse || 'Not provided',
    requiredValue: displayCourses,
    notes,
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check Major/Specialization eligibility
 * Uses fuzzy matching for major name variations
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkMajor(profile, criteria) {
  const eligibleMajors = criteria.eligibleMajors || [];
  
  if (!Array.isArray(eligibleMajors) || eligibleMajors.length === 0) return null;
  
  const studentMajor = profile.major;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentMajor)) {
    passed = false;
    notes = 'Major/specialization not provided in profile';
  } else {
    // Partial match for majors (flexible matching)
    passed = eligibleMajors.some(major => {
      const normalizedMajor = major.toLowerCase().trim();
      const normalizedStudent = studentMajor.toLowerCase().trim();
      return (
        normalizedMajor === normalizedStudent ||
        normalizedMajor.includes(normalizedStudent) ||
        normalizedStudent.includes(normalizedMajor)
      );
    });
    notes = passed 
      ? 'Major is eligible for this scholarship'
      : 'Major is not in the eligible list';
  }
  
  return {
    criterion: 'Major/Specialization',
    passed,
    applicantValue: studentMajor || 'Not provided',
    requiredValue: eligibleMajors.join(', '),
    notes,
    type: 'list',
    category: 'academic'
  };
}

// =============================================================================
// FINANCIAL LIST CHECKS
// =============================================================================

/**
 * Check ST Bracket eligibility
 * Handles both short codes (FDS, FD) and full names (Full Discount with Stipend)
 * Uses normalizer for transparent matching
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkSTBracket(profile, criteria) {
  // Get the list from either field name (backward compatibility)
  const eligibleBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
  
  if (!Array.isArray(eligibleBrackets) || eligibleBrackets.length === 0) return null;
  
  const studentBracket = profile.stBracket;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentBracket)) {
    passed = false;
    notes = 'ST Bracket not provided in profile';
  } else {
    // Use normalizer for comparison (handles FDS vs Full Discount with Stipend)
    passed = stBracketsMatch(studentBracket, eligibleBrackets);
    notes = passed 
      ? 'ST Bracket qualifies for this scholarship'
      : `${normalizeSTBracket(studentBracket)} is not among the eligible brackets`;
  }
  
  // Display normalized bracket names
  const displayBrackets = eligibleBrackets.map(b => normalizeSTBracket(b)).join(', ');
  
  return {
    criterion: 'ST Bracket',
    passed,
    applicantValue: hasValue(studentBracket) ? normalizeSTBracket(studentBracket) : 'Not provided',
    requiredValue: displayBrackets,
    notes,
    type: 'list',
    category: 'financial'
  };
}

// =============================================================================
// LOCATION LIST CHECKS
// =============================================================================

/**
 * Check Province of Origin eligibility
 * For location-based scholarships (e.g., provincial scholarships)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkProvince(profile, criteria) {
  const eligibleProvinces = criteria.eligibleProvinces || [];
  
  if (!Array.isArray(eligibleProvinces) || eligibleProvinces.length === 0) return null;
  
  // Check both provinceOfOrigin and homeAddress.province
  const studentProvince = profile.provinceOfOrigin || profile.homeAddress?.province;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentProvince)) {
    passed = false;
    notes = 'Province of origin not provided in profile';
  } else {
    // Use normalizer for comparison
    passed = provincesMatch(studentProvince, eligibleProvinces);
    notes = passed 
      ? 'Province is eligible for this scholarship'
      : 'Province is not in the eligible list';
  }
  
  // Format display value based on number of provinces
  const displayProvinces = eligibleProvinces.length <= 5 
    ? eligibleProvinces.map(p => normalizeProvince(p)).join(', ')
    : `${eligibleProvinces.length} eligible provinces`;
  
  return {
    criterion: 'Province of Origin',
    passed,
    applicantValue: hasValue(studentProvince) ? normalizeProvince(studentProvince) : 'Not provided',
    requiredValue: displayProvinces,
    notes,
    type: 'list',
    category: 'location'
  };
}

// =============================================================================
// PERSONAL LIST CHECKS
// =============================================================================

/**
 * Check Citizenship eligibility
 * For scholarships restricted to certain citizenship types
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Object|null} Check result or null if no requirement
 */
function checkCitizenship(profile, criteria) {
  const eligibleCitizenship = criteria.eligibleCitizenship || [];
  
  if (!Array.isArray(eligibleCitizenship) || eligibleCitizenship.length === 0) return null;
  
  const studentCitizenship = profile.citizenship;
  
  let passed = false;
  let notes = '';
  
  if (!hasValue(studentCitizenship)) {
    passed = false;
    notes = 'Citizenship not provided in profile';
  } else {
    // Normalize and compare
    const normalizedStudent = normalizeCitizenship(studentCitizenship);
    passed = eligibleCitizenship.some(c => {
      const normalizedRequired = normalizeCitizenship(c);
      return normalizedStudent.toLowerCase() === normalizedRequired.toLowerCase();
    });
    notes = passed 
      ? 'Citizenship is eligible for this scholarship'
      : 'Citizenship is not in the eligible list';
  }
  
  return {
    criterion: 'Citizenship',
    passed,
    applicantValue: hasValue(studentCitizenship) ? normalizeCitizenship(studentCitizenship) : 'Not provided',
    requiredValue: eligibleCitizenship.map(c => normalizeCitizenship(c)).join(', '),
    notes,
    type: 'list',
    category: 'personal'
  };
}

// =============================================================================
// AGGREGATE FUNCTIONS
// =============================================================================

/**
 * Run all list membership checks
 * Returns array of check results (excludes null/skipped checks)
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {Array} Array of check results
 */
function checkAll(profile, criteria) {
  const checks = [
    checkYearLevel(profile, criteria),
    checkCollege(profile, criteria),
    checkCourse(profile, criteria),
    checkMajor(profile, criteria),
    checkSTBracket(profile, criteria),
    checkProvince(profile, criteria),
    checkCitizenship(profile, criteria)
  ];
  
  // Filter out null checks (criteria not specified)
  return checks.filter(c => c !== null);
}

/**
 * Quick check - returns true if all list checks pass
 * Useful for fast eligibility pre-screening
 * 
 * @param {Object} profile - Student profile
 * @param {Object} criteria - Eligibility criteria
 * @returns {boolean} True if all list checks pass
 */
function quickCheck(profile, criteria) {
  const checks = checkAll(profile, criteria);
  return checks.every(c => c.passed);
}

/**
 * Get summary of list check results
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
  checkYearLevel,
  checkCollege,
  checkCourse,
  checkMajor,
  checkSTBracket,
  checkProvince,
  checkCitizenship,
  
  // Aggregate functions
  checkAll,
  quickCheck,
  getSummary
};

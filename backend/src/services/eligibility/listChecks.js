/**
 * =============================================================================
 * List Membership Eligibility Checks
 * =============================================================================
 * 
 * Handles checks where student value must be in a list of allowed values:
 * - Year Level/Classification
 * - College
 * - Course
 * - Major
 * - ST Bracket
 * - Province
 * - Citizenship
 * 
 * Each check returns:
 * {
 *   criterion: string,      // Display name
 *   passed: boolean,        // Whether check passed
 *   applicantValue: any,    // Student's value
 *   requiredValue: string,  // Requirement description
 *   notes: string,          // Additional context
 *   type: 'list',           // Check type identifier
 *   category: string        // 'academic' | 'financial' | 'location'
 * }
 * =============================================================================
 */

const { normalizeSTBracket, stBracketsMatch } = require('./normalizers');

/**
 * Check Year Level/Classification requirement
 * Handles both field names: requiredYearLevels and eligibleClassifications
 */
function checkYearLevel(profile, criteria) {
  // Get the list from either field name
  const eligibleLevels = criteria.requiredYearLevels || criteria.eligibleClassifications || [];
  
  // Skip if no requirement
  if (eligibleLevels.length === 0) return null;
  
  const studentLevel = profile.classification || profile.yearLevel;
  const passed = studentLevel && eligibleLevels.includes(studentLevel);
  
  return {
    criterion: 'Year Level',
    passed,
    applicantValue: studentLevel || 'Not provided',
    requiredValue: eligibleLevels.join(', '),
    notes: passed 
      ? 'Year level is eligible' 
      : studentLevel 
        ? `${studentLevel} is not among eligible levels` 
        : 'Year level not provided',
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check College eligibility
 */
function checkCollege(profile, criteria) {
  const eligibleColleges = criteria.eligibleColleges || [];
  
  if (eligibleColleges.length === 0) return null;
  
  const studentCollege = profile.college;
  const passed = studentCollege && eligibleColleges.includes(studentCollege);
  
  return {
    criterion: 'College',
    passed,
    applicantValue: studentCollege || 'Not provided',
    requiredValue: eligibleColleges.length <= 3 
      ? eligibleColleges.join(', ')
      : `${eligibleColleges.length} eligible colleges`,
    notes: passed 
      ? 'College is eligible' 
      : studentCollege 
        ? 'College is not in eligible list' 
        : 'College not provided',
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check Course eligibility
 */
function checkCourse(profile, criteria) {
  const eligibleCourses = criteria.eligibleCourses || [];
  
  if (eligibleCourses.length === 0) return null;
  
  const studentCourse = profile.course;
  
  // Exact match or partial match
  const passed = studentCourse && eligibleCourses.some(course => 
    course.toLowerCase() === studentCourse.toLowerCase() ||
    course.toLowerCase().includes(studentCourse.toLowerCase()) ||
    studentCourse.toLowerCase().includes(course.toLowerCase())
  );
  
  return {
    criterion: 'Course',
    passed,
    applicantValue: studentCourse || 'Not provided',
    requiredValue: eligibleCourses.length <= 3 
      ? eligibleCourses.join(', ')
      : `${eligibleCourses.length} eligible courses`,
    notes: passed 
      ? 'Course is eligible' 
      : studentCourse 
        ? 'Course is not in eligible list' 
        : 'Course not provided',
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check Major/Specialization eligibility
 */
function checkMajor(profile, criteria) {
  const eligibleMajors = criteria.eligibleMajors || [];
  
  if (eligibleMajors.length === 0) return null;
  
  const studentMajor = profile.major;
  
  // Partial match for majors
  const passed = studentMajor && eligibleMajors.some(major => 
    major.toLowerCase() === studentMajor.toLowerCase() ||
    major.toLowerCase().includes(studentMajor.toLowerCase()) ||
    studentMajor.toLowerCase().includes(major.toLowerCase())
  );
  
  return {
    criterion: 'Major',
    passed,
    applicantValue: studentMajor || 'Not provided',
    requiredValue: eligibleMajors.join(', '),
    notes: passed 
      ? 'Major is eligible' 
      : studentMajor 
        ? 'Major is not in eligible list' 
        : 'Major not provided',
    type: 'list',
    category: 'academic'
  };
}

/**
 * Check ST Bracket eligibility
 * Handles both short codes (FDS, FD) and full names (Full Discount with Stipend)
 */
function checkSTBracket(profile, criteria) {
  // Get the list from either field name
  const eligibleBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
  
  if (eligibleBrackets.length === 0) return null;
  
  const studentBracket = profile.stBracket;
  const passed = studentBracket && stBracketsMatch(studentBracket, eligibleBrackets);
  
  return {
    criterion: 'ST Bracket',
    passed,
    applicantValue: studentBracket || 'Not provided',
    requiredValue: eligibleBrackets.join(', '),
    notes: passed 
      ? 'ST bracket is eligible' 
      : studentBracket 
        ? 'ST bracket is not in eligible list' 
        : 'ST bracket not provided',
    type: 'list',
    category: 'financial'
  };
}

/**
 * Check Province of Origin eligibility
 */
function checkProvince(profile, criteria) {
  const eligibleProvinces = criteria.eligibleProvinces || [];
  
  if (eligibleProvinces.length === 0) return null;
  
  const studentProvince = profile.provinceOfOrigin || profile.homeAddress?.province;
  
  // Partial match for provinces
  const passed = studentProvince && eligibleProvinces.some(province => 
    province.toLowerCase() === studentProvince.toLowerCase() ||
    province.toLowerCase().includes(studentProvince.toLowerCase()) ||
    studentProvince.toLowerCase().includes(province.toLowerCase())
  );
  
  return {
    criterion: 'Province of Origin',
    passed,
    applicantValue: studentProvince || 'Not provided',
    requiredValue: eligibleProvinces.length <= 5 
      ? eligibleProvinces.join(', ')
      : `${eligibleProvinces.length} eligible provinces`,
    notes: passed 
      ? 'Province is eligible' 
      : studentProvince 
        ? 'Province is not in eligible list' 
        : 'Province not provided',
    type: 'list',
    category: 'location'
  };
}

/**
 * Check Citizenship eligibility
 */
function checkCitizenship(profile, criteria) {
  const eligibleCitizenship = criteria.eligibleCitizenship || [];
  
  if (eligibleCitizenship.length === 0) return null;
  
  const studentCitizenship = profile.citizenship;
  const passed = studentCitizenship && eligibleCitizenship.includes(studentCitizenship);
  
  return {
    criterion: 'Citizenship',
    passed,
    applicantValue: studentCitizenship || 'Not provided',
    requiredValue: eligibleCitizenship.join(', '),
    notes: passed 
      ? 'Citizenship is eligible' 
      : studentCitizenship 
        ? 'Citizenship is not in eligible list' 
        : 'Citizenship not provided',
    type: 'list',
    category: 'personal'
  };
}

/**
 * Run all list membership checks
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
 */
function quickCheck(profile, criteria) {
  const checks = checkAll(profile, criteria);
  return checks.every(c => c.passed);
}

module.exports = {
  checkYearLevel,
  checkCollege,
  checkCourse,
  checkMajor,
  checkSTBracket,
  checkProvince,
  checkCitizenship,
  checkAll,
  quickCheck
};

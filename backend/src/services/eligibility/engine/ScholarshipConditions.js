/**
 * =============================================================================
 * ISKOlarship - Pre-configured Scholarship Eligibility Conditions
 * =============================================================================
 * 
 * This file defines all the eligibility conditions used in ISKOlarship.
 * Each condition is configured with:
 * - Field mappings (student profile and criteria fields)
 * - Operators and thresholds
 * - Normalizers for data format variations
 * - Display formatters
 * 
 * TO ADD A NEW CONDITION:
 * 1. Determine the condition type (RANGE, BOOLEAN, or LIST)
 * 2. Add the configuration below
 * 3. The engine will automatically use it
 * 
 * =============================================================================
 */

const { RangeCondition, BooleanCondition, ListCondition } = require('../conditions');
const EligibilityEngine = require('./EligibilityEngine');
const {
  RangeOperator,
  BooleanOperator,
  ListOperator,
  ConditionCategory,
  ImportanceLevel
} = require('../types');

// =============================================================================
// VALUE MAPPINGS (for normalization)
// =============================================================================

const ST_BRACKET_MAP = {
  'FDS': 'Full Discount with Stipend',
  'FD': 'Full Discount',
  'PD80': 'PD80',
  'PD60': 'PD60',
  'PD40': 'PD40',
  'PD20': 'PD20',
  'ND': 'No Discount',
  'FULL DISCOUNT WITH STIPEND': 'Full Discount with Stipend',
  'FULL DISCOUNT': 'Full Discount',
  'NO DISCOUNT': 'No Discount'
};

const YEAR_LEVEL_MAP = {
  '1ST YEAR': 'Freshman',
  '2ND YEAR': 'Sophomore',
  '3RD YEAR': 'Junior',
  '4TH YEAR': 'Senior',
  '5TH YEAR': 'Senior',
  'FRESHMAN': 'Freshman',
  'SOPHOMORE': 'Sophomore',
  'JUNIOR': 'Junior',
  'SENIOR': 'Senior',
  'GRADUATE': 'Graduate'
};

// =============================================================================
// UPLB GRADING SYSTEM CONSTANTS
// These define the grading scale used at UPLB (1.0 = highest, 5.0 = lowest)
// Modify these if deploying to a different institution with a different scale
// =============================================================================

const UPLB_GWA = {
  HIGHEST: 1.0,   // Best possible GWA
  LOWEST: 5.0,    // Worst possible GWA (also means "no restriction" when used as max)
  NO_RESTRICTION: 5.0  // When maxGWA is set to this, it means any GWA is acceptable
};

// =============================================================================
// RANGE CONDITIONS
// =============================================================================

const gwaCondition = new RangeCondition({
  id: 'gwa',
  name: 'GWA Requirement',
  description: `General Weighted Average (${UPLB_GWA.HIGHEST} = highest, ${UPLB_GWA.LOWEST} = lowest in UP system)`,
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  // Field mappings
  studentFields: ['gwa', 'studentProfile.gwa'],
  minFields: ['minGWA'],
  maxFields: ['maxGWA'],
  
  // Operator and defaults - using UPLB constants
  operator: RangeOperator.BETWEEN,
  defaultMin: UPLB_GWA.HIGHEST,
  defaultMax: UPLB_GWA.LOWEST,
  
  // GWA is inverted (lower is better), and maxGWA at NO_RESTRICTION means any GWA
  inverted: true,
  noRestrictionValue: UPLB_GWA.NO_RESTRICTION,
  
  // Display formatters - using UPLB constants
  formatStudentValue: (v) => v != null ? v.toFixed(2) : 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || (v.max >= UPLB_GWA.NO_RESTRICTION && (!v.min || v.min <= UPLB_GWA.HIGHEST))) return 'No requirement';
    if (v.max && v.max < UPLB_GWA.NO_RESTRICTION) return `≤ ${v.max.toFixed(2)}`;
    return 'No requirement';
  }
});

const incomeCondition = new RangeCondition({
  id: 'annualFamilyIncome',
  name: 'Annual Family Income',
  description: 'Maximum annual family income requirement',
  category: ConditionCategory.FINANCIAL,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['annualFamilyIncome', 'familyAnnualIncome', 'studentProfile.annualFamilyIncome'],
  maxFields: ['maxAnnualFamilyIncome'],
  minFields: ['minAnnualFamilyIncome'],
  
  operator: RangeOperator.LESS_THAN_OR_EQUAL,
  
  formatStudentValue: (v) => v != null ? `₱${v.toLocaleString()}` : 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v) return 'No limit';
    if (typeof v === 'object') {
      if (v.max) return `≤ ₱${v.max.toLocaleString()}`;
      return 'No limit';
    }
    return `≤ ₱${v.toLocaleString()}`;
  }
});

const unitsEnrolledCondition = new RangeCondition({
  id: 'unitsEnrolled',
  name: 'Units Enrolled',
  description: 'Minimum units enrolled requirement',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['unitsEnrolled', 'studentProfile.unitsEnrolled'],
  minFields: ['minUnitsEnrolled'],
  
  operator: RangeOperator.GREATER_THAN_OR_EQUAL,
  
  formatStudentValue: (v) => v != null ? `${v} units` : 'Not specified',
  formatCriteriaValue: (v) => v ? `≥ ${v} units` : 'No minimum'
});

const unitsPassedCondition = new RangeCondition({
  id: 'unitsPassed',
  name: 'Units Passed',
  description: 'Minimum units passed requirement (for thesis grants)',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['unitsPassed', 'studentProfile.unitsPassed'],
  minFields: ['minUnitsPassed'],
  
  operator: RangeOperator.GREATER_THAN_OR_EQUAL,
  
  formatStudentValue: (v) => v != null ? `${v} units` : 'Not specified',
  formatCriteriaValue: (v) => v ? `≥ ${v} units` : 'No minimum'
});

// =============================================================================
// BOOLEAN CONDITIONS
// =============================================================================

const noOtherScholarshipCondition = new BooleanCondition({
  id: 'noOtherScholarship',
  name: 'No Other Scholarship',
  description: 'Must not have any other scholarship',
  category: ConditionCategory.STATUS,
  importance: ImportanceLevel.REQUIRED,
  
  // The criteria field (mustNotHaveOtherScholarship: true = requirement is active)
  criteriaFields: ['mustNotHaveOtherScholarship', 'noExistingScholarship'],
  
  // The student field (true = has scholarship, which should FAIL this check)
  studentFields: ['hasExistingScholarship', 'hasOtherScholarship', 'isScholarshipRecipient'],
  
  // We want the student value to be FALSE (no existing scholarship)
  requiresNegation: true,
  
  formatStudentValue: (v) => v ? 'Has scholarship' : 'No scholarship',
  formatCriteriaValue: (v) => v ? 'Must not have other scholarship' : 'Not required'
});

const noDisciplinaryActionCondition = new BooleanCondition({
  id: 'noDisciplinaryAction',
  name: 'No Disciplinary Action',
  description: 'Must have clean disciplinary record',
  category: ConditionCategory.STATUS,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['mustNotHaveDisciplinaryAction', 'noDisciplinaryRecord'],
  studentFields: ['hasDisciplinaryAction', 'studentProfile.hasDisciplinaryAction'],
  
  requiresNegation: true,
  
  formatStudentValue: (v) => v ? 'Has record' : 'Clean record',
  formatCriteriaValue: (v) => v ? 'Required clean record' : 'Not checked'
});

const approvedThesisCondition = new BooleanCondition({
  id: 'approvedThesis',
  name: 'Approved Thesis Outline',
  description: 'Requires approved thesis/SP outline',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['requiresApprovedThesisOutline', 'requiresApprovedThesis', 'requireThesisApproval'],
  studentFields: ['hasApprovedThesisOutline', 'hasApprovedThesis', 'approvedThesisOutline'],
  
  // Student should have thesis = TRUE
  operator: BooleanOperator.IS_TRUTHY,
  
  formatStudentValue: (v) => v ? 'Yes' : 'No',
  formatCriteriaValue: (v) => v ? 'Required' : 'Not required'
});

const noFailingGradeCondition = new BooleanCondition({
  id: 'noFailingGrade',
  name: 'No Failing Grade',
  description: 'Must not have any failing grades (5.0)',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['mustNotHaveFailingGrade'],
  studentFields: ['hasFailingGrade', 'hasGradeOf5'],
  
  requiresNegation: true,
  
  formatStudentValue: (v) => v ? 'Has failing grade(s)' : 'No failing grades',
  formatCriteriaValue: (v) => v ? 'Must not have any failing grades' : 'Not checked'
});

const noGradeOf4Condition = new BooleanCondition({
  id: 'noGradeOf4',
  name: 'No Grade of 4',
  description: 'Must not have any conditional passing grades (4.0)',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['mustNotHaveGradeOf4'],
  studentFields: ['hasGradeOf4', 'hasConditionalGrade'],
  
  requiresNegation: true,
  
  formatStudentValue: (v) => v ? 'Has grade of 4' : 'No conditional grades',
  formatCriteriaValue: (v) => v ? 'Must not have grade of 4' : 'Not checked'
});

const noIncompleteGradeCondition = new BooleanCondition({
  id: 'noIncompleteGrade',
  name: 'No Incomplete Grade',
  description: 'Must not have any incomplete grades (INC)',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['mustNotHaveIncompleteGrade'],
  studentFields: ['hasIncompleteGrade', 'hasINC'],
  
  requiresNegation: true,
  
  formatStudentValue: (v) => v ? 'Has INC' : 'All grades complete',
  formatCriteriaValue: (v) => v ? 'Must not have INC' : 'Not checked'
});

const noThesisGrantCondition = new BooleanCondition({
  id: 'noThesisGrant',
  name: 'No Thesis Grant',
  description: 'Must not have existing thesis grant',
  category: ConditionCategory.STATUS,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['mustNotHaveThesisGrant', 'noExistingThesisGrant'],
  studentFields: ['hasThesisGrant', 'thesisGrantRecipient'],
  
  requiresNegation: true,
  
  formatStudentValue: (v) => v ? 'Has thesis grant' : 'No thesis grant',
  formatCriteriaValue: (v) => v ? 'Must not have thesis grant' : 'Not required'
});

const mustBeGraduatingCondition = new BooleanCondition({
  id: 'mustBeGraduating',
  name: 'Graduating Student',
  description: 'Must be graduating this semester',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  criteriaFields: ['mustBeGraduating'],
  studentFields: ['isGraduating', 'graduatingThisSemester'],
  
  operator: BooleanOperator.IS_TRUTHY,
  
  formatStudentValue: (v) => v ? 'Yes' : 'No',
  formatCriteriaValue: (v) => v ? 'Required' : 'Not required'
});

// =============================================================================
// LIST CONDITIONS
// =============================================================================

const yearLevelCondition = new ListCondition({
  id: 'yearLevel',
  name: 'Year Level',
  description: 'Eligible year levels/classifications',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['classification', 'yearLevel', 'studentProfile.classification'],
  criteriaFields: ['eligibleClassifications', 'requiredYearLevels'],
  
  operator: ListOperator.IN,
  caseSensitive: false,
  valueMapping: YEAR_LEVEL_MAP,
  
  formatStudentValue: (v) => v || 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'Any year level';
    return v.join(', ');
  }
});

const collegeCondition = new ListCondition({
  id: 'college',
  name: 'College',
  description: 'Eligible colleges',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['college', 'studentProfile.college'],
  criteriaFields: ['eligibleColleges'],
  
  operator: ListOperator.IN,
  caseSensitive: false,
  
  formatStudentValue: (v) => v || 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'All colleges';
    if (v.length <= 3) return v.join(', ');
    return `${v.length} colleges`;
  }
});

const courseCondition = new ListCondition({
  id: 'course',
  name: 'Course',
  description: 'Eligible courses/programs',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['course', 'studentProfile.course'],
  criteriaFields: ['eligibleCourses'],
  
  operator: ListOperator.MATCHES_ANY,
  caseSensitive: false,
  fuzzyMatch: true,
  
  formatStudentValue: (v) => v || 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'All courses';
    if (v.length <= 2) return v.join(', ');
    return `${v.length} courses`;
  }
});

const majorCondition = new ListCondition({
  id: 'major',
  name: 'Major/Specialization',
  description: 'Eligible majors',
  category: ConditionCategory.ACADEMIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['major', 'studentProfile.major'],
  criteriaFields: ['eligibleMajors'],
  
  operator: ListOperator.MATCHES_ANY,
  caseSensitive: false,
  fuzzyMatch: true,
  
  formatStudentValue: (v) => v || 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'Any major';
    return v.join(', ');
  }
});

const stBracketCondition = new ListCondition({
  id: 'stBracket',
  name: 'ST Bracket',
  description: 'Eligible Socialized Tuition brackets',
  category: ConditionCategory.FINANCIAL,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['stBracket', 'studentProfile.stBracket'],
  criteriaFields: ['eligibleSTBrackets', 'requiredSTBrackets'],
  
  operator: ListOperator.IN,
  caseSensitive: false,
  valueMapping: ST_BRACKET_MAP,
  
  formatStudentValue: (v) => v || 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'Any bracket';
    return v.join(', ');
  }
});

const provinceCondition = new ListCondition({
  id: 'province',
  name: 'Province',
  description: 'Eligible provinces of origin',
  category: ConditionCategory.LOCATION,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['provinceOfOrigin', 'hometown', 'studentProfile.provinceOfOrigin', 'homeAddress.province'],
  criteriaFields: ['eligibleProvinces'],
  
  operator: ListOperator.MATCHES_ANY,
  caseSensitive: false,
  fuzzyMatch: true,
  
  formatStudentValue: (v) => v || 'Not specified',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'Any province';
    if (v.length <= 3) return v.join(', ');
    return `${v.length} provinces`;
  }
});

const citizenshipCondition = new ListCondition({
  id: 'citizenship',
  name: 'Citizenship',
  description: 'Eligible citizenships',
  category: ConditionCategory.DEMOGRAPHIC,
  importance: ImportanceLevel.REQUIRED,
  
  studentFields: ['citizenship', 'studentProfile.citizenship'],
  criteriaFields: ['eligibleCitizenship'],
  
  operator: ListOperator.IN,
  caseSensitive: false,
  
  // Default to Filipino if not specified
  defaultStudentValue: 'Filipino',
  
  formatStudentValue: (v) => v || 'Filipino',
  formatCriteriaValue: (v) => {
    if (!v || v.length === 0) return 'Any citizenship';
    return v.join(', ');
  }
});

// =============================================================================
// ALL CONDITIONS (ordered)
// =============================================================================

const ALL_CONDITIONS = [
  // Academic Range
  gwaCondition,
  unitsEnrolledCondition,
  unitsPassedCondition,
  
  // Financial Range
  incomeCondition,
  
  // Academic List
  yearLevelCondition,
  collegeCondition,
  courseCondition,
  majorCondition,
  
  // Financial List
  stBracketCondition,
  
  // Location List
  provinceCondition,
  
  // Demographic List
  citizenshipCondition,
  
  // Status Boolean
  noOtherScholarshipCondition,
  noDisciplinaryActionCondition,
  noThesisGrantCondition,
  
  // Academic Boolean
  approvedThesisCondition,
  noFailingGradeCondition,
  noGradeOf4Condition,
  noIncompleteGradeCondition,
  mustBeGraduatingCondition
];

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a pre-configured eligibility engine with all scholarship conditions
 */
function createEngine() {
  const engine = new EligibilityEngine();
  engine.registerAll(ALL_CONDITIONS);
  return engine;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Individual conditions (for customization)
  gwaCondition,
  incomeCondition,
  unitsEnrolledCondition,
  unitsPassedCondition,
  yearLevelCondition,
  collegeCondition,
  courseCondition,
  majorCondition,
  stBracketCondition,
  provinceCondition,
  citizenshipCondition,
  noOtherScholarshipCondition,
  noDisciplinaryActionCondition,
  noThesisGrantCondition,
  approvedThesisCondition,
  noFailingGradeCondition,
  noGradeOf4Condition,
  noIncompleteGradeCondition,
  mustBeGraduatingCondition,
  
  // All conditions
  ALL_CONDITIONS,
  
  // Value mappings
  ST_BRACKET_MAP,
  YEAR_LEVEL_MAP,
  
  // Factory
  createEngine
};

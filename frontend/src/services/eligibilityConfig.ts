// ============================================================================
// ISKOlarship - Unified Eligibility Configuration
// ============================================================================
// This module defines all eligibility conditions used throughout the application.
// It ensures consistency between frontend and backend eligibility checking.
// 
// THREE CONDITION TYPES:
// 1. RANGE - Numeric comparisons (GWA, Income, Units)
// 2. BOOLEAN - True/False checks (Has Scholarship, Has Thesis)
// 3. LIST - Collection membership (College, Year Level, ST Bracket)
// ============================================================================

import { EligibilityCriteria, StudentProfile, STBracket, YearLevel, UPLBCollege } from '../types';

// ============================================================================
// CONDITION TYPES AND OPERATORS
// ============================================================================

export enum ConditionType {
  RANGE = 'range',
  BOOLEAN = 'boolean',
  LIST = 'list'
}

export enum ImportanceLevel {
  REQUIRED = 'required',    // Must pass (hard requirement)
  PREFERRED = 'preferred',  // Affects score (soft requirement)
  OPTIONAL = 'optional'     // Informational only
}

export enum ConditionCategory {
  ACADEMIC = 'academic',
  FINANCIAL = 'financial',
  STATUS = 'status',
  LOCATION = 'location',
  DEMOGRAPHIC = 'demographic'
}

// ============================================================================
// VALUE MAPPINGS (for normalization)
// ============================================================================

export const ST_BRACKET_MAP: Record<string, string> = {
  'Full Discount with Stipend': 'Full Discount with Stipend',
  'Full Discount': 'Full Discount',
  'PD80': 'PD80',
  'PD60': 'PD60',
  'PD40': 'PD40',
  'PD20': 'PD20',
  'No Discount': 'No Discount',
  // Legacy short code support (for backward compatibility)
  'FDS': 'Full Discount with Stipend',
  'FD': 'Full Discount',
  'ND': 'No Discount'
};

export const YEAR_LEVEL_MAP: Record<string, string> = {
  '1ST YEAR': 'Freshman',
  '2ND YEAR': 'Sophomore',
  '3RD YEAR': 'Junior',
  '4TH YEAR': 'Senior',
  '5TH YEAR': 'Senior',
  'FRESHMAN': 'Freshman',
  'SOPHOMORE': 'Sophomore',
  'JUNIOR': 'Junior',
  'SENIOR': 'Senior'
};

export const COLLEGE_CODE_MAP: Record<string, string> = {
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

// ============================================================================
// NORMALIZERS
// ============================================================================

export function normalizeSTBracket(bracket: string | undefined | null): string | null {
  if (!bracket) return null;
  const normalized = bracket.toString().trim().toUpperCase();
  return ST_BRACKET_MAP[normalized] || bracket;
}

export function normalizeYearLevel(yearLevel: string | undefined | null): string | null {
  if (!yearLevel) return null;
  const normalized = yearLevel.toString().trim().toUpperCase();
  return YEAR_LEVEL_MAP[normalized] || yearLevel;
}

export function normalizeCollege(college: string | undefined | null): string | null {
  if (!college) return null;
  const upperCollege = college.toString().trim().toUpperCase();
  
  // If it's a code, return full name
  if (COLLEGE_CODE_MAP[upperCollege]) {
    return COLLEGE_CODE_MAP[upperCollege];
  }
  
  return college;
}

// ============================================================================
// CONDITION INTERFACES
// ============================================================================

export interface ConditionResult {
  id: string;
  criterion: string;
  passed: boolean;
  studentValue: string;
  requiredValue: string;
  category: ConditionCategory;
  importance: ImportanceLevel;
  type: ConditionType;
}

export interface EligibilityResult {
  passed: boolean;
  score: number;
  checks: ConditionResult[];
  failedRequired: ConditionResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    percentage: number;
  };
}

// ============================================================================
// NORMALIZED STUDENT PROFILE
// ============================================================================

export interface NormalizedStudent {
  gwa: number;
  yearLevel: string;
  college: string;
  course: string;
  major?: string;
  annualFamilyIncome: number;
  stBracket?: string;
  province: string;
  citizenship: string;
  unitsEnrolled: number;
  unitsPassed?: number;
  hasApprovedThesis: boolean;
  hasDisciplinaryAction: boolean;
  hasExistingScholarship: boolean;
  hasThesisGrant: boolean;
  hasFailingGrade: boolean;
  hasGradeOf4: boolean;
  hasIncompleteGrade: boolean;
  isGraduating: boolean;
  householdSize?: number;
  hometown?: string;
  // Custom fields for scholarship-specific requirements (admin-defined)
  customFields?: Record<string, string | number | boolean | string[]>;
}

export function normalizeStudentProfile(student: StudentProfile | any): NormalizedStudent {
  const profile = student.studentProfile || student;
  
  return {
    gwa: profile.gwa ?? 5.0,
    yearLevel: normalizeYearLevel(profile.classification || profile.yearLevel) || 'Freshman',
    college: normalizeCollege(profile.college) || '',
    course: profile.course || '',
    major: profile.major,
    annualFamilyIncome: profile.familyAnnualIncome ?? profile.annualFamilyIncome ?? 0,
    stBracket: normalizeSTBracket(profile.stBracket) || undefined,
    province: profile.provinceOfOrigin || profile.hometown || profile.homeAddress?.province || '',
    citizenship: profile.citizenship || 'Filipino',
    unitsEnrolled: profile.unitsEnrolled ?? 0,
    unitsPassed: profile.unitsPassed,
    hasApprovedThesis: profile.hasApprovedThesisOutline ?? profile.hasApprovedThesis ?? false,
    hasDisciplinaryAction: profile.hasDisciplinaryAction ?? false,
    hasExistingScholarship: profile.hasExistingScholarship ?? profile.hasOtherScholarship ?? profile.isScholarshipRecipient ?? false,
    hasThesisGrant: profile.hasThesisGrant ?? false,
    hasFailingGrade: profile.hasFailingGrade ?? profile.hasGradeOf5 ?? false,
    hasGradeOf4: profile.hasGradeOf4 ?? profile.hasConditionalGrade ?? false,
    hasIncompleteGrade: profile.hasIncompleteGrade ?? profile.hasINC ?? false,
    isGraduating: profile.isGraduating ?? profile.graduatingThisSemester ?? false,
    householdSize: profile.householdSize ?? profile.familySize ?? undefined,
    hometown: profile.hometown ?? profile.provinceOfOrigin ?? undefined,
    // Pass through custom fields for scholarship-specific requirements
    customFields: profile.customFields ?? {}
  };
}

// ============================================================================
// CONDITION CHECKERS
// ============================================================================

interface ConditionConfig {
  id: string;
  name: string;
  category: ConditionCategory;
  importance: ImportanceLevel;
  type: ConditionType;
  check: (student: NormalizedStudent, criteria: EligibilityCriteria) => boolean;
  getStudentValue: (student: NormalizedStudent) => string;
  getRequiredValue: (criteria: EligibilityCriteria) => string;
  shouldSkip?: (criteria: EligibilityCriteria) => boolean;
}

// ============================================================================
// ALL ELIGIBILITY CONDITIONS
// ============================================================================

export const CONDITIONS: ConditionConfig[] = [
  // ==========================================================================
  // ACADEMIC RANGE CONDITIONS
  // ==========================================================================
  {
    id: 'gwa',
    name: 'GWA Requirement',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.RANGE,
    check: (student, criteria) => {
      const maxGWA = criteria.maxGWA;
      const minGWA = criteria.minGWA;
      
      // No restriction cases
      const isNoRestriction = 
        (!maxGWA && !minGWA) ||
        (maxGWA === 5.0 && (!minGWA || minGWA === 1.0)) ||
        (maxGWA !== undefined && maxGWA >= 5.0 && (!minGWA || minGWA <= 1.0));
      
      if (isNoRestriction) return true;
      
      const effectiveMaxGWA = maxGWA || 5.0;
      const effectiveMinGWA = minGWA || 1.0;
      
      return student.gwa >= effectiveMinGWA && student.gwa <= effectiveMaxGWA;
    },
    getStudentValue: (student) => student.gwa?.toFixed(2) ?? 'N/A',
    getRequiredValue: (criteria) => {
      if (!criteria.maxGWA || criteria.maxGWA >= 5.0) return 'No requirement';
      return `≤ ${criteria.maxGWA.toFixed(2)}`;
    },
    shouldSkip: (criteria) => !criteria.maxGWA || criteria.maxGWA >= 5.0
  },
  
  {
    id: 'unitsEnrolled',
    name: 'Units Enrolled',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.RANGE,
    check: (student, criteria) => {
      if (!criteria.minUnitsEnrolled) return true;
      return student.unitsEnrolled >= criteria.minUnitsEnrolled;
    },
    getStudentValue: (student) => `${student.unitsEnrolled} units`,
    getRequiredValue: (criteria) => criteria.minUnitsEnrolled ? `≥ ${criteria.minUnitsEnrolled} units` : 'No minimum',
    shouldSkip: (criteria) => !criteria.minUnitsEnrolled
  },
  
  // ==========================================================================
  // FINANCIAL RANGE CONDITIONS
  // ==========================================================================
  {
    id: 'annualFamilyIncome',
    name: 'Annual Family Income',
    category: ConditionCategory.FINANCIAL,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.RANGE,
    check: (student, criteria) => {
      if (!criteria.maxAnnualFamilyIncome) return true;
      if (!student.annualFamilyIncome) return true; // Be lenient if not specified
      return student.annualFamilyIncome <= criteria.maxAnnualFamilyIncome;
    },
    getStudentValue: (student) => student.annualFamilyIncome ? `₱${student.annualFamilyIncome.toLocaleString()}` : 'Not specified',
    getRequiredValue: (criteria) => criteria.maxAnnualFamilyIncome ? `≤ ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}` : 'No limit',
    shouldSkip: (criteria) => !criteria.maxAnnualFamilyIncome
  },
  
  // ==========================================================================
  // ACADEMIC LIST CONDITIONS
  // ==========================================================================
  {
    id: 'yearLevel',
    name: 'Year Level',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleClassifications || criteria.requiredYearLevels || [];
      if (required.length === 0) return true;
      return required.some(r => 
        normalizeYearLevel(r)?.toLowerCase() === student.yearLevel.toLowerCase()
      );
    },
    getStudentValue: (student) => student.yearLevel,
    getRequiredValue: (criteria) => {
      const levels = criteria.eligibleClassifications || criteria.requiredYearLevels || [];
      return levels.length ? levels.join(', ') : 'Any year level';
    },
    shouldSkip: (criteria) => !(criteria.eligibleClassifications?.length || criteria.requiredYearLevels?.length)
  },
  
  {
    id: 'college',
    name: 'College',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleColleges || [];
      if (required.length === 0) return true;
      return required.some(r => 
        normalizeCollege(r)?.toLowerCase() === student.college.toLowerCase()
      );
    },
    getStudentValue: (student) => student.college || 'Not specified',
    getRequiredValue: (criteria) => {
      const colleges = criteria.eligibleColleges || [];
      if (colleges.length === 0) return 'All colleges';
      if (colleges.length <= 2) return colleges.join(', ');
      return `${colleges.length} colleges`;
    },
    shouldSkip: (criteria) => !criteria.eligibleColleges?.length
  },
  
  {
    id: 'course',
    name: 'Course',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleCourses || [];
      if (required.length === 0) return true;
      return required.some(course => 
        student.course?.toLowerCase().includes(course.toLowerCase()) ||
        course.toLowerCase().includes(student.course?.toLowerCase() || '')
      );
    },
    getStudentValue: (student) => student.course || 'Not specified',
    getRequiredValue: (criteria) => {
      const courses = criteria.eligibleCourses || [];
      if (courses.length === 0) return 'All courses';
      if (courses.length <= 2) return courses.join(', ');
      return `${courses.length} courses`;
    },
    shouldSkip: (criteria) => !criteria.eligibleCourses?.length
  },
  
  {
    id: 'major',
    name: 'Major/Specialization',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleMajors || [];
      if (required.length === 0) return true;
      if (!student.major) return false;
      return required.some(major => 
        student.major?.toLowerCase().includes(major.toLowerCase()) ||
        major.toLowerCase().includes(student.major?.toLowerCase() || '')
      );
    },
    getStudentValue: (student) => student.major || 'None specified',
    getRequiredValue: (criteria) => {
      const majors = criteria.eligibleMajors || [];
      return majors.length ? majors.join(', ') : 'Any major';
    },
    shouldSkip: (criteria) => !criteria.eligibleMajors?.length
  },
  
  // ==========================================================================
  // FINANCIAL LIST CONDITIONS
  // ==========================================================================
  {
    id: 'stBracket',
    name: 'ST Bracket',
    category: ConditionCategory.FINANCIAL,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleSTBrackets || criteria.requiredSTBrackets || [];
      if (required.length === 0) return true;
      if (!student.stBracket) return false;
      return required.some(bracket => 
        normalizeSTBracket(bracket)?.toLowerCase() === student.stBracket?.toLowerCase()
      );
    },
    getStudentValue: (student) => student.stBracket || 'Not specified',
    getRequiredValue: (criteria) => {
      const brackets = criteria.eligibleSTBrackets || criteria.requiredSTBrackets || [];
      return brackets.length ? brackets.join(', ') : 'Any bracket';
    },
    shouldSkip: (criteria) => !(criteria.eligibleSTBrackets?.length || criteria.requiredSTBrackets?.length)
  },
  
  // ==========================================================================
  // LOCATION LIST CONDITIONS
  // ==========================================================================
  {
    id: 'province',
    name: 'Province',
    category: ConditionCategory.LOCATION,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleProvinces || [];
      if (required.length === 0) return true;
      if (!student.province) return false;
      return required.some(province => 
        student.province?.toLowerCase().includes(province.toLowerCase()) ||
        province.toLowerCase().includes(student.province?.toLowerCase() || '')
      );
    },
    getStudentValue: (student) => student.province || 'Not specified',
    getRequiredValue: (criteria) => {
      const provinces = criteria.eligibleProvinces || [];
      if (provinces.length === 0) return 'Any province';
      if (provinces.length <= 3) return provinces.join(', ');
      return `${provinces.length} provinces`;
    },
    shouldSkip: (criteria) => !criteria.eligibleProvinces?.length
  },
  
  // ==========================================================================
  // DEMOGRAPHIC LIST CONDITIONS
  // ==========================================================================
  {
    id: 'citizenship',
    name: 'Citizenship',
    category: ConditionCategory.DEMOGRAPHIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.LIST,
    check: (student, criteria) => {
      const required = criteria.eligibleCitizenship || [];
      if (required.length === 0) return true;
      return required.some(c => 
        c.toLowerCase() === student.citizenship.toLowerCase()
      );
    },
    getStudentValue: (student) => student.citizenship || 'Filipino',
    getRequiredValue: (criteria) => {
      const citizenships = criteria.eligibleCitizenship || [];
      return citizenships.length ? citizenships.join(', ') : 'Any citizenship';
    },
    shouldSkip: (criteria) => !criteria.eligibleCitizenship?.length
  },
  
  // ==========================================================================
  // STATUS BOOLEAN CONDITIONS
  // ==========================================================================
  {
    id: 'noOtherScholarship',
    name: 'No Other Scholarship',
    category: ConditionCategory.STATUS,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      const required = criteria.mustNotHaveOtherScholarship || criteria.noExistingScholarship;
      if (!required) return true;
      return !student.hasExistingScholarship;
    },
    getStudentValue: (student) => student.hasExistingScholarship ? 'Has scholarship' : 'No scholarship',
    getRequiredValue: (criteria) => {
      const required = criteria.mustNotHaveOtherScholarship || criteria.noExistingScholarship;
      return required ? 'Must not have other scholarship' : 'Can have other scholarship';
    },
    shouldSkip: (criteria) => !criteria.mustNotHaveOtherScholarship && !criteria.noExistingScholarship
  },
  
  {
    id: 'noDisciplinaryAction',
    name: 'No Disciplinary Action',
    category: ConditionCategory.STATUS,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      const required = criteria.mustNotHaveDisciplinaryAction || criteria.noDisciplinaryRecord;
      if (!required) return true;
      return !student.hasDisciplinaryAction;
    },
    getStudentValue: (student) => student.hasDisciplinaryAction ? 'Has record' : 'Clean record',
    getRequiredValue: (criteria) => {
      const required = criteria.mustNotHaveDisciplinaryAction || criteria.noDisciplinaryRecord;
      return required ? 'Required clean record' : 'Not checked';
    },
    shouldSkip: (criteria) => !criteria.mustNotHaveDisciplinaryAction && !criteria.noDisciplinaryRecord
  },
  
  {
    id: 'noThesisGrant',
    name: 'No Thesis Grant',
    category: ConditionCategory.STATUS,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      if (!criteria.mustNotHaveThesisGrant) return true;
      return !student.hasThesisGrant;
    },
    getStudentValue: (student) => student.hasThesisGrant ? 'Has thesis grant' : 'No thesis grant',
    getRequiredValue: (criteria) => criteria.mustNotHaveThesisGrant ? 'Must not have thesis grant' : 'Not required',
    shouldSkip: (criteria) => !criteria.mustNotHaveThesisGrant
  },
  
  // ==========================================================================
  // ACADEMIC BOOLEAN CONDITIONS
  // ==========================================================================
  {
    id: 'approvedThesis',
    name: 'Approved Thesis Outline',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      const required = criteria.requiresApprovedThesisOutline || criteria.requiresApprovedThesis;
      if (!required) return true;
      return student.hasApprovedThesis;
    },
    getStudentValue: (student) => student.hasApprovedThesis ? 'Yes' : 'No',
    getRequiredValue: (criteria) => {
      const required = criteria.requiresApprovedThesisOutline || criteria.requiresApprovedThesis;
      return required ? 'Required' : 'Not required';
    },
    shouldSkip: (criteria) => !criteria.requiresApprovedThesisOutline && !criteria.requiresApprovedThesis
  },
  
  {
    id: 'noFailingGrade',
    name: 'No Failing Grade',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      if (!criteria.mustNotHaveFailingGrade) return true;
      return !student.hasFailingGrade;
    },
    getStudentValue: (student) => student.hasFailingGrade ? 'Has failing grade(s)' : 'No failing grades',
    getRequiredValue: (criteria) => criteria.mustNotHaveFailingGrade ? 'Must not have any failing grades' : 'Not checked',
    shouldSkip: (criteria) => !criteria.mustNotHaveFailingGrade
  },
  
  {
    id: 'noGradeOf4',
    name: 'No Grade of 4',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      if (!criteria.mustNotHaveGradeOf4) return true;
      return !student.hasGradeOf4;
    },
    getStudentValue: (student) => student.hasGradeOf4 ? 'Has grade of 4' : 'No conditional grades',
    getRequiredValue: (criteria) => criteria.mustNotHaveGradeOf4 ? 'Must not have grade of 4' : 'Not checked',
    shouldSkip: (criteria) => !criteria.mustNotHaveGradeOf4
  },
  
  {
    id: 'noIncompleteGrade',
    name: 'No Incomplete Grade',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      if (!criteria.mustNotHaveIncompleteGrade) return true;
      return !student.hasIncompleteGrade;
    },
    getStudentValue: (student) => student.hasIncompleteGrade ? 'Has INC' : 'All grades complete',
    getRequiredValue: (criteria) => criteria.mustNotHaveIncompleteGrade ? 'Must not have INC' : 'Not checked',
    shouldSkip: (criteria) => !criteria.mustNotHaveIncompleteGrade
  },
  
  {
    id: 'mustBeGraduating',
    name: 'Graduating Student',
    category: ConditionCategory.ACADEMIC,
    importance: ImportanceLevel.REQUIRED,
    type: ConditionType.BOOLEAN,
    check: (student, criteria) => {
      if (!criteria.mustBeGraduating) return true;
      return student.isGraduating;
    },
    getStudentValue: (student) => student.isGraduating ? 'Yes' : 'No',
    getRequiredValue: (criteria) => criteria.mustBeGraduating ? 'Required' : 'Not required',
    shouldSkip: (criteria) => !criteria.mustBeGraduating
  }
];

// ============================================================================
// CUSTOM CONDITION EVALUATORS
// ============================================================================

import { 
  CustomCondition, 
  ConditionType as CustomConditionType,
  RangeOperator,
  BooleanOperator,
  ListOperator,
  ConditionImportance,
  ConditionCategory as CustomCategory,
  STUDENT_PROFILE_FIELDS
} from '../types';

/**
 * Get nested value from object using dot notation
 * Handles customFields which may be stored as a Map or plain object
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    // Handle Map objects (customFields might be a Map from MongoDB)
    if (current instanceof Map) {
      current = current.get(key);
    } else if (typeof current.get === 'function' && key !== 'get') {
      current = current.get(key);
    } else {
      current = current[key];
    }
  }
  return current;
}

/**
 * Evaluate a range condition
 */
function evaluateRangeCondition(value: any, operator: string, threshold: any): boolean {
  if (value === null || value === undefined) return false;
  const numValue = Number(value);
  if (isNaN(numValue)) return false;

  switch (operator) {
    case RangeOperator.LESS_THAN:
      return numValue < threshold;
    case RangeOperator.LESS_THAN_OR_EQUAL:
      return numValue <= threshold;
    case RangeOperator.GREATER_THAN:
      return numValue > threshold;
    case RangeOperator.GREATER_THAN_OR_EQUAL:
      return numValue >= threshold;
    case RangeOperator.EQUAL:
      return numValue === threshold;
    case RangeOperator.NOT_EQUAL:
      return numValue !== threshold;
    case RangeOperator.BETWEEN:
    case RangeOperator.BETWEEN_EXCLUSIVE:
      if (typeof threshold === 'object' && threshold !== null) {
        const min = threshold.min ?? -Infinity;
        const max = threshold.max ?? Infinity;
        return operator === RangeOperator.BETWEEN 
          ? numValue >= min && numValue <= max
          : numValue > min && numValue < max;
      }
      return false;
    case RangeOperator.OUTSIDE:
      if (typeof threshold === 'object' && threshold !== null) {
        const min = threshold.min ?? -Infinity;
        const max = threshold.max ?? Infinity;
        return numValue < min || numValue > max;
      }
      return false;
    default:
      return false;
  }
}

/**
 * Evaluate a boolean condition
 */
function evaluateBooleanCondition(value: any, operator: string, expected: any): boolean {
  switch (operator) {
    case BooleanOperator.IS:
      return value === expected;
    case BooleanOperator.IS_NOT:
      return value !== expected;
    case BooleanOperator.IS_TRUE:
      return value === true;
    case BooleanOperator.IS_FALSE:
      return value === false;
    case BooleanOperator.EXISTS:
      return value !== null && value !== undefined;
    case BooleanOperator.NOT_EXISTS:
      return value === null || value === undefined;
    default:
      return false;
  }
}

/**
 * Evaluate a list condition
 */
function evaluateListCondition(value: any, operator: string, list: any): boolean {
  if (!Array.isArray(list) || list.length === 0) return true;
  
  const normalizedList = list.map((item: any) => 
    typeof item === 'string' ? item.toLowerCase().trim() : item
  );
  const normalizedValue = typeof value === 'string' ? value.toLowerCase().trim() : value;
  const normalizedValueArray = Array.isArray(value) 
    ? value.map((v: any) => typeof v === 'string' ? v.toLowerCase().trim() : v)
    : [];

  switch (operator) {
    case ListOperator.IN:
      return normalizedList.includes(normalizedValue);
    case ListOperator.NOT_IN:
      return !normalizedList.includes(normalizedValue);
    case ListOperator.CONTAINS:
      return Array.isArray(value) && value.some((v: any) => 
        normalizedList.includes(typeof v === 'string' ? v.toLowerCase().trim() : v)
      );
    case ListOperator.NOT_CONTAINS:
      return !Array.isArray(value) || !value.some((v: any) => 
        normalizedList.includes(typeof v === 'string' ? v.toLowerCase().trim() : v)
      );
    case ListOperator.CONTAINS_ALL:
      return Array.isArray(value) && normalizedList.every((item: any) => 
        normalizedValueArray.includes(item)
      );
    case ListOperator.CONTAINS_ANY:
      return Array.isArray(value) && normalizedValueArray.some((item: any) => 
        normalizedList.includes(item)
      );
    case ListOperator.IS_EMPTY:
      return !value || (Array.isArray(value) && value.length === 0);
    case ListOperator.IS_NOT_EMPTY:
      return !!value && (!Array.isArray(value) || value.length > 0);
    case ListOperator.MATCHES_ANY:
      return normalizedList.some((pattern: string) => 
        typeof normalizedValue === 'string' && normalizedValue.includes(pattern)
      );
    case ListOperator.MATCHES_ALL:
      return normalizedList.every((pattern: string) => 
        typeof normalizedValue === 'string' && normalizedValue.includes(pattern)
      );
    default:
      return false;
  }
}

/**
 * Process custom conditions and return check results
 */
function processCustomConditions(
  student: NormalizedStudent, 
  customConditions: CustomCondition[] | undefined
): ConditionResult[] {
  if (!customConditions || !Array.isArray(customConditions) || customConditions.length === 0) {
    return [];
  }

  const results: ConditionResult[] = [];

  for (const condition of customConditions) {
    // Skip inactive conditions
    if (condition.isActive === false) continue;

    const studentValue = getNestedValue(student, condition.studentField);
    let passed = false;
    let formattedStudentValue = String(studentValue ?? 'Not specified');
    let formattedRequiredValue = String(condition.value);

    switch (condition.conditionType) {
      case CustomConditionType.RANGE:
        passed = evaluateRangeCondition(studentValue, condition.operator, condition.value);
        formattedStudentValue = studentValue != null ? String(studentValue) : 'Not specified';
        if (condition.operator === RangeOperator.BETWEEN && typeof condition.value === 'object') {
          formattedRequiredValue = `${(condition.value as any).min ?? '∞'} - ${(condition.value as any).max ?? '∞'}`;
        } else {
          const opSymbols: Record<string, string> = {
            [RangeOperator.LESS_THAN]: '<',
            [RangeOperator.LESS_THAN_OR_EQUAL]: '≤',
            [RangeOperator.GREATER_THAN]: '>',
            [RangeOperator.GREATER_THAN_OR_EQUAL]: '≥',
            [RangeOperator.EQUAL]: '=',
            [RangeOperator.NOT_EQUAL]: '≠'
          };
          formattedRequiredValue = `${opSymbols[condition.operator] || condition.operator} ${condition.value}`;
        }
        break;

      case CustomConditionType.BOOLEAN:
        passed = evaluateBooleanCondition(studentValue, condition.operator, condition.value);
        formattedStudentValue = studentValue ? 'Yes' : 'No';
        formattedRequiredValue = condition.value ? 'Required' : 'Not required';
        break;

      case CustomConditionType.LIST:
        passed = evaluateListCondition(studentValue, condition.operator, condition.value);
        formattedStudentValue = Array.isArray(studentValue) 
          ? studentValue.join(', ') 
          : (studentValue || 'Not specified');
        formattedRequiredValue = Array.isArray(condition.value) 
          ? condition.value.join(', ') 
          : String(condition.value);
        break;
    }

    // Map importance level
    const importance = condition.importance === ConditionImportance.REQUIRED 
      ? ImportanceLevel.REQUIRED 
      : condition.importance === ConditionImportance.PREFERRED 
        ? ImportanceLevel.PREFERRED 
        : ImportanceLevel.OPTIONAL;

    // Map category
    const categoryMap: Record<string, ConditionCategory> = {
      'academic': ConditionCategory.ACADEMIC,
      'financial': ConditionCategory.FINANCIAL,
      'demographic': ConditionCategory.DEMOGRAPHIC,
      'enrollment': ConditionCategory.ACADEMIC,
      'custom': ConditionCategory.STATUS
    };

    results.push({
      id: condition.id,
      criterion: condition.name,
      passed,
      studentValue: formattedStudentValue,
      requiredValue: formattedRequiredValue,
      category: categoryMap[condition.category] || ConditionCategory.STATUS,
      importance,
      type: condition.conditionType as unknown as ConditionType
    });
  }

  return results;
}

// ============================================================================
// MAIN ELIGIBILITY CHECK FUNCTION
// ============================================================================

export function checkEligibility(
  student: StudentProfile | any,
  criteria: EligibilityCriteria
): EligibilityResult {
  const normalizedStudent = normalizeStudentProfile(student);
  const checks: ConditionResult[] = [];
  
  // Process standard conditions
  for (const condition of CONDITIONS) {
    // Skip conditions that don't apply
    if (condition.shouldSkip && condition.shouldSkip(criteria)) {
      continue;
    }
    
    const passed = condition.check(normalizedStudent, criteria);
    
    checks.push({
      id: condition.id,
      criterion: condition.name,
      passed,
      studentValue: condition.getStudentValue(normalizedStudent),
      requiredValue: condition.getRequiredValue(criteria),
      category: condition.category,
      importance: condition.importance,
      type: condition.type
    });
  }
  
  // Process custom conditions
  const customConditionResults = processCustomConditions(normalizedStudent, criteria.customConditions);
  checks.push(...customConditionResults);
  
  // Calculate statistics
  const total = checks.length;
  const passedCount = checks.filter(c => c.passed).length;
  const score = total > 0 ? Math.round((passedCount / total) * 100) : 100;
  
  // All REQUIRED conditions must pass
  const requiredChecks = checks.filter(c => c.importance === ImportanceLevel.REQUIRED);
  const passed = requiredChecks.every(c => c.passed);
  const failedRequired = requiredChecks.filter(c => !c.passed);
  
  return {
    passed,
    score,
    checks,
    failedRequired,
    summary: {
      total,
      passed: passedCount,
      failed: total - passedCount,
      percentage: score
    }
  };
}

// ============================================================================
// QUICK CHECK FUNCTION
// ============================================================================

export function quickCheckEligibility(
  student: StudentProfile | any,
  criteria: EligibilityCriteria
): boolean {
  const normalizedStudent = normalizeStudentProfile(student);
  
  for (const condition of CONDITIONS) {
    if (condition.importance !== ImportanceLevel.REQUIRED) continue;
    if (condition.shouldSkip && condition.shouldSkip(criteria)) continue;
    
    if (!condition.check(normalizedStudent, criteria)) {
      return false;
    }
  }
  
  return true;
}

export default {
  CONDITIONS,
  checkEligibility,
  quickCheckEligibility,
  normalizeStudentProfile,
  normalizeSTBracket,
  normalizeYearLevel,
  normalizeCollege,
  ConditionType,
  ImportanceLevel,
  ConditionCategory
};

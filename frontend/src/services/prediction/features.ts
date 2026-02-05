// ============================================================================
// ISKOlarship - Feature Engineering
// Convert student profiles and scholarship criteria to numerical features
// ============================================================================

import { StudentProfile, Scholarship, YearLevel, STBracket } from '../../types';
import { FeatureVector } from './types';

// ============================================================================
// FEATURE MAPPINGS
// ============================================================================

export const yearLevelToNumeric: Record<YearLevel, number> = {
  [YearLevel.INCOMING_FRESHMAN]: 0,
  [YearLevel.FRESHMAN]: 1,
  [YearLevel.SOPHOMORE]: 2,
  [YearLevel.JUNIOR]: 3,
  [YearLevel.SENIOR]: 4,
  [YearLevel.GRADUATE]: 5
};

export const stBracketToNumeric: Record<STBracket, number> = {
  [STBracket.FULL_DISCOUNT_WITH_STIPEND]: 6,
  [STBracket.FULL_DISCOUNT]: 5,
  [STBracket.PD80]: 4,
  [STBracket.PD60]: 3,
  [STBracket.PD40]: 2,
  [STBracket.PD20]: 1,
  [STBracket.NO_DISCOUNT]: 0
};

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract numerical features from student profile and scholarship criteria
 * These features are used for prediction calculations
 */
export const extractFeatures = (
  student: StudentProfile,
  scholarship: Scholarship
): FeatureVector => {
  const criteria = scholarship.eligibilityCriteria || {};
  
  // GWA normalization (invert so higher is better: 5-gwa gives 4 for 1.0, 0 for 5.0)
  // Use 2.5 as default if GWA is not available (neutral value)
  const studentGwa = student.gwa ?? 2.5;
  const gwaNormalized = (5 - studentGwa) / 4;
  
  // Year level numeric
  const yearLevelNumeric = yearLevelToNumeric[student.yearLevel] || 1;
  
  // Income normalization (relative to scholarship threshold)
  const maxIncome = criteria.maxAnnualFamilyIncome || 500000;
  const studentIncome = student.annualFamilyIncome ?? 0;
  const incomeNormalized = Math.min(studentIncome / maxIncome, 1);
  
  // ST Bracket numeric
  const stBracketNumeric = student.stBracket 
    ? stBracketToNumeric[student.stBracket] / 6 
    : 0.5;
  
  // College match
  const collegeMatch = !criteria.eligibleColleges || 
    criteria.eligibleColleges.length === 0 ||
    (student.college && criteria.eligibleColleges.includes(student.college)) ? 1 : 0;
  
  // Course match
  const courseMatch = !criteria.eligibleCourses || 
    criteria.eligibleCourses.length === 0 ||
    (student.course && criteria.eligibleCourses.some(c => 
      c && student.course && student.course.toLowerCase().includes(c.toLowerCase())
    )) ? 1 : 0;
  
  // Major match
  const majorMatch = !criteria.eligibleMajors || 
    criteria.eligibleMajors.length === 0 ||
    (student.major && criteria.eligibleMajors.some(m => 
      m && student.major && student.major.toLowerCase().includes(m.toLowerCase())
    )) ? 1 : 0;
  
  // Meets income requirement
  const meetsIncomeReq = !criteria.maxAnnualFamilyIncome || 
    studentIncome <= criteria.maxAnnualFamilyIncome ? 1 : 0;
  
  // Meets GWA requirement (in UPLB, maxGWA is the threshold - student GWA must be <= maxGWA)
  const meetsGWAReq = !criteria.maxGWA || studentGwa <= criteria.maxGWA ? 1 : 0;
  
  // Profile completeness (simple check)
  const profileCompleteness = student.profileCompleted ? 1 : 0.7;
  
  return {
    gwa: gwaNormalized,
    yearLevelNumeric: yearLevelNumeric / 5,
    incomeNormalized,
    stBracketNumeric,
    collegeMatch,
    courseMatch,
    majorMatch,
    meetsIncomeReq,
    meetsGWAReq,
    profileCompleteness
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize GWA to 0-1 scale (1.0 = best = 1.0, 5.0 = worst = 0.0)
 */
export const normalizeGWA = (gwa: number | undefined): number => {
  if (gwa === undefined || gwa === null) return 0.5;
  return Math.max(0, Math.min(1, (5 - gwa) / 4));
};

/**
 * Normalize income (lower = higher score)
 */
export const normalizeIncome = (income: number | undefined, max: number | undefined): number => {
  if (!income || !max) return 0.5;
  if (income <= max) {
    return 1 - (income / max) * 0.5; // 0.5 to 1.0
  }
  return 0; // Exceeds max
};

/**
 * Get ST Bracket score based on discount level
 */
export const getSTBracketScore = (bracket: string | undefined): number => {
  const bracketMap: Record<string, number> = {
    'Full Discount with Stipend': 1.0,
    'Full Discount': 0.9,
    'PD80': 0.8,
    'PD60': 0.6,
    'PD40': 0.4,
    'PD20': 0.2,
    'No Discount': 0.1
  };
  return bracketMap[bracket || ''] || 0.5;
};

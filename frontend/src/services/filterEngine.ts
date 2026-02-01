// ============================================================================
// ISKOlarship - Rule-Based Filtering Engine
// Implements the three-stage filtering process described in the research paper:
// 1. Hard requirement filtering
// 2. Conditional requirement evaluation
// 3. Compatibility scoring
// ============================================================================

import {
  Scholarship,
  StudentProfile,
  EligibilityCriteria,
  MatchResult,
  EligibilityCheckResult,
  FilterCriteria,
  YearLevel,
  UPLBCollege,
  STBracket
} from '../types';

// ============================================================================
// HELPER: ST Bracket Normalization
// Backend stores full names, frontend uses short codes
// ============================================================================

const ST_BRACKET_MAPPING: Record<string, STBracket> = {
  // Short codes
  'FDS': STBracket.FULL_DISCOUNT_WITH_STIPEND,
  'FD': STBracket.FULL_DISCOUNT,
  'PD80': STBracket.PD80,
  'PD60': STBracket.PD60,
  'PD40': STBracket.PD40,
  'PD20': STBracket.PD20,
  'ND': STBracket.NO_DISCOUNT,
  // Full names (as stored in database)
  'FULL DISCOUNT WITH STIPEND': STBracket.FULL_DISCOUNT_WITH_STIPEND,
  'FULL DISCOUNT': STBracket.FULL_DISCOUNT,
  'NO DISCOUNT': STBracket.NO_DISCOUNT
};

const normalizeSTBracket = (bracket: string | undefined): STBracket | undefined => {
  if (!bracket) return undefined;
  const normalized = bracket.toString().trim().toUpperCase();
  return ST_BRACKET_MAPPING[normalized] || (bracket as STBracket);
};

const stBracketsMatch = (studentBracket: string | undefined, requiredBrackets: (string | STBracket)[]): boolean => {
  if (!studentBracket || requiredBrackets.length === 0) return false;
  const normalizedStudent = normalizeSTBracket(studentBracket);
  return requiredBrackets.some(req => {
    const normalizedReq = normalizeSTBracket(req);
    return normalizedStudent === normalizedReq;
  });
};

// ============================================================================
// HELPER: Normalize student data from API to expected format
// The API returns nested studentProfile, but our checks expect flat access
// ============================================================================

interface NormalizedStudent {
  gwa: number;
  yearLevel: YearLevel;
  college: UPLBCollege;
  course: string;
  major?: string;
  annualFamilyIncome: number;
  stBracket?: STBracket;
  hometown: string;
  unitsEnrolled: number;
  hasApprovedThesis?: boolean;
  hasDisciplinaryAction?: boolean;
  hasExistingScholarship?: boolean;
  studentNumber?: string;
  firstName?: string;
  lastName?: string;
}

const normalizeStudent = (student: StudentProfile | any): NormalizedStudent => {
  // Handle nested studentProfile from API
  const profile = student.studentProfile || student;
  
  // Normalize ST Bracket from database format (full names) to frontend format (short codes)
  const rawStBracket = profile.stBracket || student.stBracket;
  const normalizedBracket = normalizeSTBracket(rawStBracket);
  
  return {
    gwa: profile.gwa ?? student.gwa ?? 5.0,
    yearLevel: profile.classification || profile.yearLevel || student.yearLevel || YearLevel.FRESHMAN,
    college: profile.college || student.college || '',
    course: profile.course || student.course || '',
    major: profile.major || student.major,
    annualFamilyIncome: profile.familyAnnualIncome ?? profile.annualFamilyIncome ?? student.annualFamilyIncome ?? 0,
    stBracket: normalizedBracket,
    hometown: profile.provinceOfOrigin || profile.hometown || student.hometown || profile.homeAddress?.province || '',
    unitsEnrolled: profile.unitsEnrolled ?? student.unitsEnrolled ?? 0,
    hasApprovedThesis: profile.hasApprovedThesisOutline ?? profile.hasApprovedThesis ?? student.hasApprovedThesis ?? false,
    hasDisciplinaryAction: profile.hasDisciplinaryAction ?? student.hasDisciplinaryAction ?? false,
    hasExistingScholarship: profile.hasExistingScholarship ?? profile.hasOtherScholarship ?? student.isScholarshipRecipient ?? false,
    studentNumber: profile.studentNumber || student.studentNumber,
    firstName: profile.firstName || student.firstName,
    lastName: profile.lastName || student.lastName
  };
};

// ============================================================================
// STAGE 1: HARD REQUIREMENT FILTERING
// Binary pass/fail checks for mandatory criteria
// ============================================================================

interface HardRequirementCheck {
  criterion: string;
  check: (student: NormalizedStudent, criteria: EligibilityCriteria) => boolean;
  getStudentValue: (student: NormalizedStudent) => string | number | boolean;
  getRequiredValue: (criteria: EligibilityCriteria) => string | number | boolean;
}

const hardRequirementChecks: HardRequirementCheck[] = [
  // GWA Check (lower is better in Philippine system, 1.0 = highest, 5.0 = lowest)
  // Scholarship specifies maxGWA as the threshold (student's GWA must be <= maxGWA)
  // minGWA is typically 1.0 (the theoretical floor)
  {
    criterion: 'GWA Requirement',
    check: (student, criteria) => {
      // If no GWA requirement, pass
      if (!criteria.maxGWA && !criteria.minGWA) return true;
      if (student.gwa == null) return false;
      
      // maxGWA is the main requirement - student's GWA must be at or below this
      const maxGWA = criteria.maxGWA || 5.0;
      const minGWA = criteria.minGWA || 1.0;
      
      // Student passes if their GWA is within the acceptable range
      return student.gwa >= minGWA && student.gwa <= maxGWA;
    },
    getStudentValue: (student) => student.gwa?.toFixed(2) ?? 'N/A',
    getRequiredValue: (criteria) => {
      if (criteria.maxGWA) return `${criteria.maxGWA.toFixed(2)} or better`;
      if (criteria.minGWA) return `${criteria.minGWA.toFixed(2)} or better`;
      return 'No requirement';
    }
  },
  
  // Year Level Check
  {
    criterion: 'Year Level Requirement',
    check: (student, criteria) => {
      if (!criteria.requiredYearLevels || criteria.requiredYearLevels.length === 0) return true;
      return criteria.requiredYearLevels.includes(student.yearLevel);
    },
    getStudentValue: (student) => student.yearLevel || 'Not specified',
    getRequiredValue: (criteria) => criteria.requiredYearLevels?.join(', ') || 'Any year level'
  },
  
  // College Eligibility Check
  {
    criterion: 'Eligible College',
    check: (student, criteria) => {
      if (!criteria.eligibleColleges || criteria.eligibleColleges.length === 0) return true;
      if (!student.college) return false;
      return criteria.eligibleColleges.includes(student.college);
    },
    getStudentValue: (student) => student.college || 'Not specified',
    getRequiredValue: (criteria) => criteria.eligibleColleges?.join(', ') || 'All colleges'
  },
  
  // Course Eligibility Check
  {
    criterion: 'Eligible Course',
    check: (student, criteria) => {
      if (!criteria.eligibleCourses || criteria.eligibleCourses.length === 0) return true;
      if (!student.course) return false;
      return criteria.eligibleCourses.some(course => 
        student.course?.toLowerCase().includes(course.toLowerCase()) ||
        course.toLowerCase().includes(student.course?.toLowerCase() || '')
      );
    },
    getStudentValue: (student) => student.course || 'Not specified',
    getRequiredValue: (criteria) => criteria.eligibleCourses?.join(', ') || 'All courses'
  },
  
  // Major Eligibility Check (for BS Agriculture students)
  {
    criterion: 'Eligible Major/Specialization',
    check: (student, criteria) => {
      if (!criteria.eligibleMajors || criteria.eligibleMajors.length === 0) return true;
      if (!student.major) return false;
      return criteria.eligibleMajors.some(major => 
        student.major?.toLowerCase().includes(major.toLowerCase()) ||
        major.toLowerCase().includes(student.major?.toLowerCase() || '')
      );
    },
    getStudentValue: (student) => student.major || 'None specified',
    getRequiredValue: (criteria) => criteria.eligibleMajors?.join(', ') || 'Any major'
  },
  
  // Maximum Family Income Check
  {
    criterion: 'Maximum Annual Family Income',
    check: (student, criteria) => {
      if (!criteria.maxAnnualFamilyIncome) return true;
      const income = student.annualFamilyIncome ?? 0;
      return income <= criteria.maxAnnualFamilyIncome;
    },
    getStudentValue: (student) => {
      const income = student.annualFamilyIncome ?? 0;
      return `₱${income.toLocaleString()}`;
    },
    getRequiredValue: (criteria) => criteria.maxAnnualFamilyIncome 
      ? `≤ ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`
      : 'No limit'
  },
  
  // ST Bracket Check (handles both short codes and full names)
  {
    criterion: 'Required ST Bracket',
    check: (student, criteria) => {
      // Handle both field name variations from API
      const requiredBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
      if (requiredBrackets.length === 0) return true;
      if (!student.stBracket) return false;
      // Use normalized matching to handle different formats
      return stBracketsMatch(student.stBracket, requiredBrackets);
    },
    getStudentValue: (student) => student.stBracket || 'Not specified',
    getRequiredValue: (criteria) => {
      const brackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
      return brackets.join(', ') || 'Any bracket';
    }
  },
  
  // Province/Location Check
  {
    criterion: 'Eligible Province',
    check: (student, criteria) => {
      if (!criteria.eligibleProvinces || criteria.eligibleProvinces.length === 0) return true;
      if (!student.hometown) return false;
      return criteria.eligibleProvinces.some(province => 
        student.hometown?.toLowerCase().includes(province.toLowerCase()) ||
        province.toLowerCase().includes(student.hometown?.toLowerCase() || '')
      );
    },
    getStudentValue: (student) => student.hometown,
    getRequiredValue: (criteria) => criteria.eligibleProvinces?.join(', ') || 'Any location'
  },
  
  // Minimum Units Enrolled Check
  {
    criterion: 'Minimum Units Enrolled',
    check: (student, criteria) => {
      if (!criteria.minUnitsEnrolled) return true;
      return student.unitsEnrolled >= criteria.minUnitsEnrolled;
    },
    getStudentValue: (student) => `${student.unitsEnrolled} units`,
    getRequiredValue: (criteria) => criteria.minUnitsEnrolled 
      ? `≥ ${criteria.minUnitsEnrolled} units`
      : 'No minimum'
  },
  
  // Filipino Citizenship Check
  {
    criterion: 'Filipino Citizenship',
    check: (student, criteria) => {
      if (!criteria.isFilipinoOnly) return true;
      // Assuming all UPLB students in the system are Filipino for this prototype
      return true;
    },
    getStudentValue: () => 'Filipino',
    getRequiredValue: (criteria) => criteria.isFilipinoOnly ? 'Required' : 'Not required'
  },
  
  // Approved Thesis Check
  {
    criterion: 'Approved Thesis',
    check: (student, criteria) => {
      if (!criteria.requiresApprovedThesis) return true;
      return student.hasApprovedThesis === true;
    },
    getStudentValue: (student) => student.hasApprovedThesis ? 'Yes' : 'No',
    getRequiredValue: (criteria) => criteria.requiresApprovedThesis ? 'Required' : 'Not required'
  }
];

// ============================================================================
// STAGE 2: CONDITIONAL REQUIREMENT EVALUATION
// Soft checks that affect compatibility but don't disqualify
// ============================================================================

interface ConditionalCheck {
  criterion: string;
  check: (student: NormalizedStudent, criteria: EligibilityCriteria) => boolean;
  weight: number; // Contribution to compatibility score (0-1)
  getStudentValue: (student: NormalizedStudent) => string | number | boolean;
  getRequiredValue: (criteria: EligibilityCriteria) => string | number | boolean;
}

const conditionalChecks: ConditionalCheck[] = [
  // No Other Scholarship (preferred but may not disqualify)
  {
    criterion: 'No Existing Scholarship',
    check: (student, criteria) => {
      if (!criteria.mustNotHaveOtherScholarship) return true;
      return !student.hasExistingScholarship;
    },
    weight: 0.15,
    getStudentValue: (student) => student.hasExistingScholarship ? 'Has scholarship' : 'No scholarship',
    getRequiredValue: (criteria) => criteria.mustNotHaveOtherScholarship ? 'No other scholarship' : 'Can have other scholarship'
  },
  
  // No Thesis Grant (for thesis grant applications)
  {
    criterion: 'No Existing Thesis Grant',
    check: (student, criteria) => {
      if (!criteria.mustNotHaveThesisGrant) return true;
      // Use hasApprovedThesis as proxy since we don't have hasThesisGrant in normalized
      return true; // Allow by default if not specified
    },
    weight: 0.15,
    getStudentValue: () => 'No thesis grant',
    getRequiredValue: (criteria) => criteria.mustNotHaveThesisGrant ? 'No thesis grant' : 'Can have thesis grant'
  },
  
  // No Disciplinary Action
  {
    criterion: 'No Disciplinary Action',
    check: (student, criteria) => {
      if (!criteria.mustNotHaveDisciplinaryAction) return true;
      return !student.hasDisciplinaryAction;
    },
    weight: 0.20,
    getStudentValue: (student) => student.hasDisciplinaryAction ? 'Has record' : 'Clean record',
    getRequiredValue: (criteria) => criteria.mustNotHaveDisciplinaryAction ? 'Required' : 'Not checked'
  }
];

// ============================================================================
// STAGE 3: COMPATIBILITY SCORING
// Calculate overall match score based on all criteria
// ============================================================================

const calculateCompatibilityScore = (
  student: NormalizedStudent,
  scholarship: Scholarship,
  hardResults: EligibilityCheckResult[],
  conditionalResults: EligibilityCheckResult[]
): number => {
  // Base score starts at 100 for eligible students
  let score = 100;
  
  // Deduct for failed hard requirements (shouldn't happen if properly filtered)
  const failedHard = hardResults.filter(r => !r.passed);
  if (failedHard.length > 0) {
    return 0; // Not eligible
  }
  
  // Calculate conditional score contribution
  let conditionalPenalty = 0;
  conditionalResults.forEach(result => {
    if (!result.passed) {
      const check = conditionalChecks.find(c => c.criterion === result.criterion);
      if (check) {
        conditionalPenalty += check.weight * 100;
      }
    }
  });
  
  score -= conditionalPenalty;
  
  // Bonus points for stronger qualifications
  const criteria = scholarship.eligibilityCriteria;
  
  // GWA bonus (the better the GWA, the higher the bonus)
  // In UPLB: maxGWA is the threshold, lower GWA is better
  if (criteria.maxGWA && student.gwa) {
    const gwaMargin = criteria.maxGWA - student.gwa; // Positive means student qualifies with margin to spare
    if (gwaMargin > 0) {
      score += Math.min(gwaMargin * 10, 15); // Up to 15 bonus points
    }
  }
  
  // Income bonus (lower income = more in need = higher priority)
  if (criteria.maxAnnualFamilyIncome && student.annualFamilyIncome) {
    const incomeRatio = student.annualFamilyIncome / criteria.maxAnnualFamilyIncome;
    if (incomeRatio < 0.5) {
      score += 10; // Significant financial need bonus
    } else if (incomeRatio < 0.75) {
      score += 5;
    }
  }
  
  // Profile completion bonus - check if student object has profileCompleted
  if ((student as any).profileCompleted) {
    score += 5;
  }
  
  // Cap at 100
  return Math.min(Math.max(Math.round(score), 0), 100);
};

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

export const matchStudentToScholarships = (
  student: StudentProfile | any,
  scholarships: Scholarship[]
): MatchResult[] => {
  const results: MatchResult[] = [];
  
  // Normalize student data to handle API structure
  const normalizedStudent = normalizeStudent(student);
  
  for (const scholarship of scholarships) {
    if (!scholarship.isActive) continue;
    
    const hardResults: EligibilityCheckResult[] = [];
    const conditionalResults: EligibilityCheckResult[] = [];
    
    // Stage 1: Hard requirement checks
    for (const check of hardRequirementChecks) {
      const passed = check.check(normalizedStudent, scholarship.eligibilityCriteria);
      hardResults.push({
        criterion: check.criterion,
        passed,
        studentValue: check.getStudentValue(normalizedStudent),
        requiredValue: check.getRequiredValue(scholarship.eligibilityCriteria),
        importance: 'required'
      });
    }
    
    // Stage 2: Conditional requirement checks
    for (const check of conditionalChecks) {
      const passed = check.check(normalizedStudent, scholarship.eligibilityCriteria);
      conditionalResults.push({
        criterion: check.criterion,
        passed,
        studentValue: check.getStudentValue(normalizedStudent),
        requiredValue: check.getRequiredValue(scholarship.eligibilityCriteria),
        importance: 'preferred'
      });
    }
    
    // Determine overall eligibility (all hard requirements must pass)
    const isEligible = hardResults.every(r => r.passed);
    
    // Stage 3: Calculate compatibility score
    const compatibilityScore = calculateCompatibilityScore(
      normalizedStudent as any,
      scholarship,
      hardResults,
      conditionalResults
    );
    
    results.push({
      scholarship,
      isEligible,
      compatibilityScore,
      eligibilityDetails: [...hardResults, ...conditionalResults]
    });
  }
  
  // Sort by eligibility first, then by compatibility score
  return results.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.compatibilityScore - a.compatibilityScore;
  });
};

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

export const sortScholarships = (
  scholarships: Scholarship[],
  sortBy: FilterCriteria['sortBy'],
  sortOrder: FilterCriteria['sortOrder'] = 'asc'
): Scholarship[] => {
  const sorted = [...scholarships].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'deadline':
        comparison = new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
        break;
      case 'amount':
        // Handle both awardAmount and totalGrant
        const amountA = a.awardAmount ?? (a as any).totalGrant ?? 0;
        const amountB = b.awardAmount ?? (b as any).totalGrant ?? 0;
        comparison = amountA - amountB;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
};
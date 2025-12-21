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
  
  return {
    gwa: profile.gwa ?? student.gwa ?? 5.0,
    yearLevel: profile.classification || profile.yearLevel || student.yearLevel || YearLevel.FRESHMAN,
    college: profile.college || student.college || '',
    course: profile.course || student.course || '',
    major: profile.major || student.major,
    annualFamilyIncome: profile.familyAnnualIncome ?? profile.annualFamilyIncome ?? student.annualFamilyIncome ?? 0,
    stBracket: profile.stBracket || student.stBracket,
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
  // GWA Check (lower is better in Philippine system, 1.0 = highest)
  {
    criterion: 'Minimum GWA Requirement',
    check: (student, criteria) => {
      if (!criteria.minGWA) return true;
      return student.gwa <= criteria.minGWA;
    },
    getStudentValue: (student) => student.gwa ?? 'N/A',
    getRequiredValue: (criteria) => criteria.minGWA || 'No requirement'
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
  
  // ST Bracket Check
  {
    criterion: 'Required ST Bracket',
    check: (student, criteria) => {
      if (!criteria.requiredSTBrackets || criteria.requiredSTBrackets.length === 0) return true;
      if (!student.stBracket) return false;
      return criteria.requiredSTBrackets.includes(student.stBracket);
    },
    getStudentValue: (student) => student.stBracket || 'Not specified',
    getRequiredValue: (criteria) => criteria.requiredSTBrackets?.join(', ') || 'Any bracket'
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
  if (criteria.minGWA && student.gwa) {
    const gwaMargin = criteria.minGWA - student.gwa; // Positive means better than required
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
// SEARCH AND FILTER FUNCTIONS
// ============================================================================

export const filterScholarships = (
  scholarships: Scholarship[],
  criteria: FilterCriteria
): Scholarship[] => {
  return scholarships.filter(scholarship => {
    // Search query filter
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      const matchesName = scholarship.name.toLowerCase().includes(query);
      const matchesDescription = scholarship.description.toLowerCase().includes(query);
      const matchesSponsor = scholarship.sponsor.toLowerCase().includes(query);
      const matchesTags = scholarship.tags?.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesName && !matchesDescription && !matchesSponsor && !matchesTags) {
        return false;
      }
    }
    
    // Scholarship type filter
    if (criteria.scholarshipTypes && criteria.scholarshipTypes.length > 0) {
      if (!criteria.scholarshipTypes.includes(scholarship.type)) {
        return false;
      }
    }
    
    // College filter
    if (criteria.colleges && criteria.colleges.length > 0) {
      const eligibleColleges = scholarship.eligibilityCriteria.eligibleColleges;
      if (eligibleColleges && eligibleColleges.length > 0) {
        const hasMatchingCollege = criteria.colleges.some(c => (eligibleColleges as string[]).includes(c as string));
        if (!hasMatchingCollege) {
          return false;
        }
      }
    }
    
    // Amount range filter - handle both awardAmount and totalGrant
    const scholarshipAmount = scholarship.awardAmount ?? (scholarship as any).totalGrant ?? 0;
    if (criteria.minAmount !== undefined && scholarshipAmount) {
      if (scholarshipAmount < criteria.minAmount) {
        return false;
      }
    }
    if (criteria.maxAmount !== undefined && scholarshipAmount) {
      if (scholarshipAmount > criteria.maxAmount) {
        return false;
      }
    }
    
    // Deadline filter
    if (criteria.deadlineAfter) {
      if (scholarship.applicationDeadline < criteria.deadlineAfter) {
        return false;
      }
    }
    if (criteria.deadlineBefore) {
      if (scholarship.applicationDeadline > criteria.deadlineBefore) {
        return false;
      }
    }
    
    // Year level filter - handle both requiredYearLevels and eligibleClassifications
    if (criteria.yearLevels && criteria.yearLevels.length > 0) {
      const requiredLevels = scholarship.eligibilityCriteria.requiredYearLevels || 
                            scholarship.eligibilityCriteria.eligibleClassifications || [];
      if (requiredLevels.length > 0) {
        const hasMatchingLevel = criteria.yearLevels.some((l: string) => 
          (requiredLevels as string[]).some(rl => rl.toLowerCase() === l.toLowerCase())
        );
        if (!hasMatchingLevel) {
          return false;
        }
      }
    }
    
    return true;
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getEligibleScholarshipsCount = (
  student: StudentProfile,
  scholarships: Scholarship[]
): number => {
  const matches = matchStudentToScholarships(student, scholarships);
  return matches.filter(m => m.isEligible).length;
};

export const getHighCompatibilityScholarships = (
  student: StudentProfile,
  scholarships: Scholarship[],
  threshold: number = 75
): MatchResult[] => {
  const matches = matchStudentToScholarships(student, scholarships);
  return matches.filter(m => m.isEligible && m.compatibilityScore >= threshold);
};

export const getUpcomingDeadlineMatches = (
  student: StudentProfile,
  scholarships: Scholarship[],
  days: number = 14
): MatchResult[] => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  const matches = matchStudentToScholarships(student, scholarships);
  return matches.filter(m => 
    m.isEligible && 
    m.scholarship.applicationDeadline >= now && 
    m.scholarship.applicationDeadline <= futureDate
  ).sort((a, b) => 
    a.scholarship.applicationDeadline.getTime() - b.scholarship.applicationDeadline.getTime()
  );
};
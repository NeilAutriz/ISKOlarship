// ============================================================================
// ISKOlarship - Rule-Based Filtering Engine
// ============================================================================
// Implements the three-stage filtering process described in the research paper:
// 1. Hard requirement filtering (using unified eligibility conditions)
// 2. Conditional requirement evaluation
// 3. Compatibility scoring
//
// This module uses the unified eligibility configuration from eligibilityConfig.ts
// to ensure consistency with the backend eligibility checking.
// ============================================================================

import {
  Scholarship,
  StudentProfile,
  EligibilityCriteria,
  MatchResult,
  EligibilityCheckResult,
  FilterCriteria
} from '../types';

import {
  checkEligibility as checkEligibilityConfig,
  quickCheckEligibility,
  normalizeStudentProfile,
  NormalizedStudent,
  CONDITIONS,
  ImportanceLevel,
  ConditionType
} from './eligibilityConfig';

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

export const matchStudentToScholarships = (
  student: StudentProfile | any,
  scholarships: Scholarship[]
): MatchResult[] => {
  const results: MatchResult[] = [];
  
  for (const scholarship of scholarships) {
    if (!scholarship.isActive) continue;
    
    const criteria = scholarship.eligibilityCriteria;
    if (!criteria) continue;
    
    // Use the unified eligibility checking system
    const eligibilityResult = checkEligibilityConfig(student, criteria);
    
    // Transform to MatchResult format
    const eligibilityDetails: EligibilityCheckResult[] = eligibilityResult.checks.map(check => ({
      criterion: check.criterion,
      passed: check.passed,
      studentValue: check.studentValue,
      requiredValue: check.requiredValue,
      importance: check.importance === ImportanceLevel.REQUIRED ? 'required' : 'preferred'
    }));
    
    // Calculate compatibility score with bonuses
    const compatibilityScore = calculateCompatibilityScore(
      student,
      scholarship,
      eligibilityResult.passed,
      eligibilityResult.score
    );
    
    results.push({
      scholarship,
      isEligible: eligibilityResult.passed,
      compatibilityScore,
      eligibilityDetails
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
// COMPATIBILITY SCORING
// ============================================================================

const calculateCompatibilityScore = (
  student: StudentProfile | any,
  scholarship: Scholarship,
  isEligible: boolean,
  baseScore: number
): number => {
  if (!isEligible) return 0;
  
  // Start with base eligibility score
  let score = baseScore;
  
  const profile = normalizeStudentProfile(student);
  const criteria = scholarship.eligibilityCriteria;
  
  // GWA bonus (the better the GWA, the higher the bonus)
  if (criteria.maxGWA && criteria.maxGWA < 5.0 && profile.gwa) {
    const gwaMargin = criteria.maxGWA - profile.gwa;
    if (gwaMargin > 0) {
      score += Math.min(gwaMargin * 10, 15); // Up to 15 bonus points
    }
  }
  
  // Income bonus (lower income = more in need = higher priority)
  if (criteria.maxAnnualFamilyIncome && profile.annualFamilyIncome) {
    const incomeRatio = profile.annualFamilyIncome / criteria.maxAnnualFamilyIncome;
    if (incomeRatio < 0.5) {
      score += 10; // Significant financial need bonus
    } else if (incomeRatio < 0.75) {
      score += 5;
    }
  }
  
  // Cap at 100
  return Math.min(Math.max(Math.round(score), 0), 100);
};

// ============================================================================
// QUICK ELIGIBILITY CHECK
// ============================================================================

export const isEligibleForScholarship = (
  student: StudentProfile | any,
  scholarship: Scholarship
): boolean => {
  if (!scholarship.eligibilityCriteria) return true;
  return quickCheckEligibility(student, scholarship.eligibilityCriteria);
};

// ============================================================================
// FILTER ELIGIBLE SCHOLARSHIPS
// ============================================================================

export const filterEligibleScholarships = (
  student: StudentProfile | any,
  scholarships: Scholarship[]
): Scholarship[] => {
  return scholarships.filter(scholarship => {
    if (!scholarship.isActive) return false;
    return isEligibleForScholarship(student, scholarship);
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
// FILTER BY CRITERIA
// ============================================================================

export const filterScholarships = (
  scholarships: Scholarship[],
  criteria: FilterCriteria
): Scholarship[] => {
  return scholarships.filter(scholarship => {
    // Type filter
    if (criteria.scholarshipTypes && criteria.scholarshipTypes.length > 0) {
      const scholarshipType = scholarship.type;
      if (!criteria.scholarshipTypes.includes(scholarshipType)) {
        return false;
      }
    }
    
    // College filter
    if (criteria.colleges && criteria.colleges.length > 0) {
      const scholarshipColleges = scholarship.eligibilityCriteria?.eligibleColleges || [];
      const hasMatch = scholarshipColleges.some(c => 
        criteria.colleges?.some(fc => String(c).includes(String(fc)))
      );
      if (scholarshipColleges.length > 0 && !hasMatch) {
        return false;
      }
    }
    
    // Amount filter
    if (criteria.minAmount !== undefined) {
      const amount = scholarship.awardAmount ?? (scholarship as any).totalGrant ?? 0;
      if (amount < criteria.minAmount) return false;
    }
    
    if (criteria.maxAmount !== undefined) {
      const amount = scholarship.awardAmount ?? (scholarship as any).totalGrant ?? 0;
      if (amount > criteria.maxAmount) return false;
    }
    
    // Deadline filter
    if (criteria.deadlineBefore) {
      const deadline = new Date(scholarship.applicationDeadline);
      if (deadline > criteria.deadlineBefore) return false;
    }
    
    if (criteria.deadlineAfter) {
      const deadline = new Date(scholarship.applicationDeadline);
      if (deadline < criteria.deadlineAfter) return false;
    }
    
    // Year level filter
    if (criteria.yearLevels && criteria.yearLevels.length > 0) {
      const eligibleLevels = scholarship.eligibilityCriteria?.eligibleClassifications || [];
      const hasMatch = eligibleLevels.length === 0 || 
        eligibleLevels.some(l => criteria.yearLevels?.includes(l as any));
      if (!hasMatch) return false;
    }
    
    // Search query filter
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      const matchesName = scholarship.name.toLowerCase().includes(query);
      const matchesDescription = scholarship.description?.toLowerCase().includes(query);
      const matchesSponsor = scholarship.sponsor?.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription && !matchesSponsor) return false;
    }
    
    // Active status
    if (!scholarship.isActive) return false;
    
    return true;
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  checkEligibilityConfig as checkEligibility,
  quickCheckEligibility,
  normalizeStudentProfile,
  CONDITIONS,
  ImportanceLevel,
  ConditionType
};

export default {
  matchStudentToScholarships,
  isEligibleForScholarship,
  filterEligibleScholarships,
  sortScholarships,
  filterScholarships,
  checkEligibility: checkEligibilityConfig,
  quickCheckEligibility
};

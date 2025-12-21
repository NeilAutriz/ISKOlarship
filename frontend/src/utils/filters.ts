// ============================================================================
// ISKOlarship - Filter Utilities
// Helper functions for filtering and searching scholarships
// ============================================================================

import { Scholarship, StudentProfile, FilterCriteria, ScholarshipType, YearLevel, UPLBCollege } from '../types';

/**
 * Filter scholarships based on multiple criteria
 */
export const filterScholarships = (
  scholarships: Scholarship[],
  criteria: FilterCriteria
): Scholarship[] => {
  return scholarships.filter(scholarship => {
    // Search query filter
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      const matchesSearch = 
        scholarship.name.toLowerCase().includes(query) ||
        scholarship.sponsor.toLowerCase().includes(query) ||
        (scholarship.description?.toLowerCase().includes(query) ?? false);
      
      if (!matchesSearch) return false;
    }

    // Scholarship type filter
    if (criteria.scholarshipTypes && criteria.scholarshipTypes.length > 0) {
      if (!criteria.scholarshipTypes.includes(scholarship.type)) {
        return false;
      }
    }

    // Amount range filter
    if (criteria.minAmount !== undefined) {
      const amount = scholarship.awardAmount || 0;
      if (amount < criteria.minAmount) return false;
    }
    if (criteria.maxAmount !== undefined) {
      const amount = scholarship.awardAmount || 0;
      if (amount > criteria.maxAmount) return false;
    }

    // College filter
    if (criteria.colleges && criteria.colleges.length > 0) {
      // If scholarship has college restrictions
      if (scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0) {
        const hasMatchingCollege = criteria.colleges.some(college =>
          scholarship.eligibilityCriteria.eligibleColleges!.includes(college)
        );
        if (!hasMatchingCollege) return false;
      }
      // If no restrictions, scholarship is open to all colleges
    }

    // Year level filter
    if (criteria.yearLevels && criteria.yearLevels.length > 0) {
      if (scholarship.eligibilityCriteria?.requiredYearLevels && scholarship.eligibilityCriteria.requiredYearLevels.length > 0) {
        const hasMatchingLevel = criteria.yearLevels.some(level =>
          scholarship.eligibilityCriteria.requiredYearLevels!.includes(level)
        );
        if (!hasMatchingLevel) return false;
      }
    }

    // Deadline filter - use deadlineAfter if specified
    if (criteria.deadlineAfter && scholarship.applicationDeadline) {
      if (new Date(scholarship.applicationDeadline) < new Date(criteria.deadlineAfter)) return false;
    }

    return true;
  });
};

/**
 * Search scholarships by text query
 */
export const searchScholarships = (
  scholarships: Scholarship[],
  searchTerm: string
): Scholarship[] => {
  if (!searchTerm.trim()) return scholarships;
  
  const query = searchTerm.toLowerCase();
  
  return scholarships.filter(scholarship => {
    // Search in name (highest priority)
    if (scholarship.name.toLowerCase().includes(query)) return true;
    
    // Search in sponsor
    if (scholarship.sponsor.toLowerCase().includes(query)) return true;
    
    // Search in description
    if (scholarship.description?.toLowerCase().includes(query)) return true;
    
    // Search in type
    if (scholarship.type.toLowerCase().includes(query)) return true;
    
    return false;
  });
};

/**
 * Sort scholarships by various criteria
 */
export const sortScholarships = (
  scholarships: Scholarship[],
  sortBy: 'deadline' | 'amount' | 'name' | 'type',
  order: 'asc' | 'desc' = 'asc'
): Scholarship[] => {
  const sorted = [...scholarships];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'deadline':
        if (!a.applicationDeadline && !b.applicationDeadline) comparison = 0;
        else if (!a.applicationDeadline) comparison = 1;
        else if (!b.applicationDeadline) comparison = -1;
        else comparison = new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
        break;
        
      case 'amount':
        comparison = (a.awardAmount || 0) - (b.awardAmount || 0);
        break;
        
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
        
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
};

/**
 * Group scholarships by type
 */
export const groupScholarshipsByType = (
  scholarships: Scholarship[]
): Record<ScholarshipType, Scholarship[]> => {
  const groups: Record<string, Scholarship[]> = {};
  
  scholarships.forEach(scholarship => {
    if (!groups[scholarship.type]) {
      groups[scholarship.type] = [];
    }
    groups[scholarship.type].push(scholarship);
  });
  
  return groups as Record<ScholarshipType, Scholarship[]>;
};

/**
 * Get unique values from scholarships for filter options
 */
export const getFilterOptions = (scholarships: Scholarship[]) => {
  const types = new Set<ScholarshipType>();
  const colleges = new Set<UPLBCollege>();
  const yearLevels = new Set<YearLevel>();
  let minAmount = Infinity;
  let maxAmount = 0;
  
  scholarships.forEach(s => {
    types.add(s.type);
    
    s.eligibilityCriteria?.eligibleColleges?.forEach(c => colleges.add(c));
    s.eligibilityCriteria?.requiredYearLevels?.forEach(y => yearLevels.add(y));
    
    const amount = s.awardAmount || 0;
    if (amount < minAmount) minAmount = amount;
    if (amount > maxAmount) maxAmount = amount;
  });
  
  return {
    types: Array.from(types),
    colleges: Array.from(colleges),
    yearLevels: Array.from(yearLevels),
    amountRange: { min: minAmount === Infinity ? 0 : minAmount, max: maxAmount }
  };
};

/**
 * Check if a scholarship is currently accepting applications
 */
export const isScholarshipOpen = (scholarship: Scholarship): boolean => {
  if (!scholarship.isActive) return false;
  
  if (scholarship.applicationDeadline) {
    const now = new Date();
    const deadline = new Date(scholarship.applicationDeadline);
    return deadline > now;
  }
  
  return true;
};

/**
 * Get scholarships with upcoming deadlines
 */
export const getUpcomingDeadlines = (
  scholarships: Scholarship[],
  daysAhead: number = 30
): Scholarship[] => {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  
  return scholarships
    .filter(s => {
      if (!s.applicationDeadline || !s.isActive) return false;
      const deadline = new Date(s.applicationDeadline);
      return deadline > now && deadline <= cutoff;
    })
    .sort((a, b) => 
      new Date(a.applicationDeadline!).getTime() - new Date(b.applicationDeadline!).getTime()
    );
};
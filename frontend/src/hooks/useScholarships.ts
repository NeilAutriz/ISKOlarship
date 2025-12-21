// ============================================================================
// ISKOlarship - useScholarships Hook
// Custom hook for managing scholarship data, filtering, and matching
// ============================================================================

import { useState, useMemo, useCallback, useContext } from 'react';
import { scholarships as allScholarships, getScholarshipById, getActiveScholarships, getUpcomingDeadlines } from '../data/scholarships';
import { matchStudentToScholarships, filterScholarships, sortScholarships } from '../services/filterEngine';
import { Scholarship, MatchResult, FilterCriteria, StudentProfile, ScholarshipType } from '../types';

interface UseScholarshipsOptions {
  studentProfile?: StudentProfile;
  initialFilters?: Partial<FilterCriteria>;
}

interface UseScholarshipsReturn {
  // Data
  scholarships: Scholarship[];
  filteredScholarships: Scholarship[];
  matchResults: Map<string, MatchResult>;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Filters
  filters: FilterCriteria;
  setFilters: (filters: Partial<FilterCriteria>) => void;
  clearFilters: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Sort
  sortBy: 'deadline' | 'amount' | 'name' | 'match';
  setSortBy: (sortBy: 'deadline' | 'amount' | 'name' | 'match') => void;
  
  // Helpers
  getScholarship: (id: string) => Scholarship | undefined;
  getMatchResult: (scholarshipId: string) => MatchResult | undefined;
  eligibleCount: number;
  
  // Refresh
  refresh: () => void;
}

const defaultFilters: FilterCriteria = {
  searchQuery: '',
  scholarshipTypes: [],
  minAmount: undefined,
  maxAmount: undefined,
  colleges: [],
  yearLevels: [],
  showEligibleOnly: false,
};

export const useScholarships = (options: UseScholarshipsOptions = {}): UseScholarshipsReturn => {
  const { studentProfile, initialFilters } = options;
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterCriteria>({
    ...defaultFilters,
    ...initialFilters
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'deadline' | 'amount' | 'name' | 'match'>('deadline');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all scholarships
  const scholarships = useMemo(() => {
    return getActiveScholarships();
  }, [refreshKey]);

  // Calculate match results for student
  const matchResults = useMemo(() => {
    if (!studentProfile) return new Map<string, MatchResult>();
    const results = matchStudentToScholarships(studentProfile, scholarships);
    return new Map(results.map(r => [r.scholarship.id, r]));
  }, [studentProfile, scholarships]);

  // Filter scholarships
  const filteredScholarships = useMemo(() => {
    let filtered = [...scholarships];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.sponsor.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filters.scholarshipTypes && filters.scholarshipTypes.length > 0) {
      filtered = filtered.filter(s => filters.scholarshipTypes!.includes(s.type));
    }

    // Apply amount filter
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(s => (s.awardAmount || 0) >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(s => (s.awardAmount || 0) <= filters.maxAmount!);
    }

    // Apply college filter
    if (filters.colleges && filters.colleges.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.eligibilityCriteria?.eligibleColleges || s.eligibilityCriteria.eligibleColleges.length === 0) {
          return true; // No restriction means all colleges allowed
        }
        return filters.colleges!.some(c => s.eligibilityCriteria.eligibleColleges!.includes(c));
      });
    }

    // Apply year level filter
    if (filters.yearLevels && filters.yearLevels.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.eligibilityCriteria?.requiredYearLevels || s.eligibilityCriteria.requiredYearLevels.length === 0) {
          return true; // No restriction
        }
        return filters.yearLevels!.some(y => s.eligibilityCriteria.requiredYearLevels!.includes(y));
      });
    }

    // Apply eligible only filter
    if (filters.showEligibleOnly && studentProfile) {
      filtered = filtered.filter(s => {
        const result = matchResults.get(s.id);
        return result?.isEligible;
      });
    }

    // Sort
    switch (sortBy) {
      case 'deadline':
        filtered.sort((a, b) => {
          if (!a.applicationDeadline) return 1;
          if (!b.applicationDeadline) return -1;
          return new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
        });
        break;
      case 'amount':
        filtered.sort((a, b) => (b.awardAmount || 0) - (a.awardAmount || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'match':
        if (studentProfile) {
          filtered.sort((a, b) => {
            const aResult = matchResults.get(a.id);
            const bResult = matchResults.get(b.id);
            if (aResult?.isEligible && !bResult?.isEligible) return -1;
            if (!aResult?.isEligible && bResult?.isEligible) return 1;
            return (bResult?.predictionScore ?? 0) - (aResult?.predictionScore ?? 0);
          });
        }
        break;
    }

    return filtered;
  }, [scholarships, searchQuery, filters, sortBy, studentProfile, matchResults]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<FilterCriteria>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setSearchQuery('');
  }, []);

  // Get scholarship by ID
  const getScholarship = useCallback((id: string) => {
    return getScholarshipById(id);
  }, []);

  // Get match result by scholarship ID
  const getMatchResult = useCallback((scholarshipId: string) => {
    return matchResults.get(scholarshipId);
  }, [matchResults]);

  // Calculate eligible count
  const eligibleCount = useMemo(() => {
    if (!studentProfile) return 0;
    return Array.from(matchResults.values()).filter(r => r.isEligible).length;
  }, [matchResults, studentProfile]);

  // Refresh data
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    scholarships,
    filteredScholarships,
    matchResults,
    loading,
    error,
    filters,
    setFilters,
    clearFilters,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    getScholarship,
    getMatchResult,
    eligibleCount,
    refresh
  };
};

export default useScholarships;
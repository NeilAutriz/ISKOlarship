// ============================================================================
// ISKOlarship - ScholarshipList Component
// List of scholarships with filtering, sorting, and view options
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  CheckCircle,
  Filter,
  X,
  ChevronDown,
  Award,
  GraduationCap,
  Loader2
} from 'lucide-react';
import ScholarshipCard from './ScholarshipCard';
import { Scholarship, MatchResult, ScholarshipType, StudentProfile, EligibilityCheckResult, ApplicationStatus } from '../types';
import { matchStudentToScholarships, sortScholarships } from '../services/filterEngine';
import { predictionApi } from '../services/apiClient';

interface ScholarshipListProps {
  scholarships: Scholarship[];
  studentProfile?: StudentProfile;
  showFilters?: boolean;
  showViewToggle?: boolean;
  viewMode?: 'grid' | 'list';
  title?: string;
  emptyMessage?: string;
  loading?: boolean;
  showEligibleOnly?: boolean; // Allow parent to control eligibility filter
  applicationStatuses?: Map<string, ApplicationStatus>; // scholarship ID -> application status
}

type ViewMode = 'grid' | 'list';
type SortOption = 'deadline' | 'amount' | 'name' | 'match';

const ScholarshipList: React.FC<ScholarshipListProps> = ({
  scholarships,
  studentProfile,
  showFilters = true,
  showViewToggle = true,
  viewMode: externalViewMode,
  title,
  emptyMessage = 'No scholarships found matching your criteria.',
  loading = false,
  showEligibleOnly: externalShowEligibleOnly,
  applicationStatuses
}) => {
  // State
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = setInternalViewMode;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [selectedTypes, setSelectedTypes] = useState<ScholarshipType[]>([]);
  const [internalShowEligibleOnly, setInternalShowEligibleOnly] = useState(false);
  const showEligibleOnly = externalShowEligibleOnly ?? internalShowEligibleOnly;
  const setShowEligibleOnly = setInternalShowEligibleOnly;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // State for API predictions
  const [apiPredictions, setApiPredictions] = useState<Map<string, { 
    probability: number; 
    eligible: boolean;
    eligibilityDetails?: EligibilityCheckResult[];
    modelType?: 'scholarship_specific' | 'global' | 'none' | 'unknown';
  }>>(new Map());
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // All scholarship types using enum values
  const allTypes: ScholarshipType[] = [
    ScholarshipType.UNIVERSITY,
    ScholarshipType.COLLEGE,
    ScholarshipType.GOVERNMENT,
    ScholarshipType.PRIVATE,
    ScholarshipType.THESIS_GRANT
  ];

  // Calculate match results if student profile is provided
  const matchResults = useMemo(() => {
    if (!studentProfile) return new Map<string, MatchResult>();
    const results = matchStudentToScholarships(studentProfile, scholarships);
    return new Map(results.map(r => {
      const id = r.scholarship.id || (r.scholarship as any)._id;
      // Merge with API predictions if available
      const apiPred = apiPredictions.get(id);
      
      // Get API failed checks
      const apiFailedChecks = apiPred?.eligibilityDetails?.filter(d => !d.passed) || [];
      
      // Only use API eligibility if:
      // 1. API says eligible (trust positive results), OR
      // 2. API says not eligible AND has actual failed checks to explain why
      // Otherwise, fall back to local matching which has the correct logic
      let finalEligible = r.isEligible;
      let finalEligibilityDetails = r.eligibilityDetails;
      
      if (apiPred !== undefined) {
        if (apiPred.eligible) {
          // API says eligible - trust it
          finalEligible = true;
        } else if (apiFailedChecks.length > 0) {
          // API says not eligible with valid reasons - trust it
          finalEligible = false;
          finalEligibilityDetails = apiPred.eligibilityDetails!;
        }
        // If API says not eligible but no failed checks, keep local result
      }
      
      return [id, {
        ...r,
        predictionScore: apiPred?.probability ?? (r.compatibilityScore / 100),
        predictionModelType: apiPred?.modelType,
        isEligible: finalEligible,
        eligibilityDetails: finalEligibilityDetails
      }];
    }));
  }, [studentProfile, scholarships, apiPredictions]);

  // Fetch predictions from API when scholarships change
  useEffect(() => {
    if (!studentProfile || scholarships.length === 0) return;
    
    const fetchPredictions = async () => {
      setPredictionsLoading(true);
      try {
        const scholarshipIds = scholarships.map(s => s.id || (s as any)._id).filter(Boolean);
        if (scholarshipIds.length === 0) return;
        
        const response = await predictionApi.getBatchPredictions(scholarshipIds);
        if (response.success && response.data) {
          const predictionsMap = new Map<string, { 
            probability: number; 
            eligible: boolean;
            eligibilityDetails?: EligibilityCheckResult[];
            modelType?: 'scholarship_specific' | 'global' | 'none' | 'unknown';
          }>();
          response.data.forEach((pred: any) => {
            if (pred.scholarshipId) {
              // Transform API eligibility checks to match frontend EligibilityCheckResult format
              const eligibilityDetails: EligibilityCheckResult[] = pred.eligibility?.checks?.map((check: any) => ({
                criterion: check.criterion || check.notes || 'Requirement',
                passed: check.passed,
                studentValue: check.applicantValue || check.studentValue || 'N/A',
                requiredValue: check.requiredValue || 'Required',
                importance: 'required' as const
              })) || [];
              
              predictionsMap.set(pred.scholarshipId, {
                probability: pred.probability?.probability ?? (pred.probability?.probabilityPercentage != null ? pred.probability.probabilityPercentage / 100 : 0),
                eligible: pred.eligibility?.passed ?? false,
                eligibilityDetails,
                modelType: pred.probability?.modelType || 'unknown'
              });
            }
          });
          setApiPredictions(predictionsMap);
        }
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        // Fall back to local matching (no-op, already using matchResults)
      } finally {
        setPredictionsLoading(false);
      }
    };
    
    fetchPredictions();
  }, [studentProfile, scholarships]);

  // Filter and sort scholarships
  const filteredScholarships = useMemo(() => {
    let filtered = [...scholarships];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.sponsor.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(s => selectedTypes.includes(s.type));
    }

    // Eligible only filter
    if (showEligibleOnly && studentProfile) {
      filtered = filtered.filter(s => {
        const id = s.id || (s as any)._id;
        const result = matchResults.get(id);
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
        filtered.sort((a, b) => {
          const amountA = a.awardAmount ?? (a as any).totalGrant ?? 0;
          const amountB = b.awardAmount ?? (b as any).totalGrant ?? 0;
          return amountB - amountA;
        });
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'match':
        if (studentProfile) {
          filtered.sort((a, b) => {
            const aId = a.id || (a as any)._id;
            const bId = b.id || (b as any)._id;
            const aResult = matchResults.get(aId);
            const bResult = matchResults.get(bId);
            // Eligible first, then by prediction score
            if (aResult?.isEligible && !bResult?.isEligible) return -1;
            if (!aResult?.isEligible && bResult?.isEligible) return 1;
            const aScore = aResult?.predictionScore ?? 0;
            const bScore = bResult?.predictionScore ?? 0;
            return bScore - aScore;
          });
        }
        break;
    }

    return filtered;
  }, [scholarships, searchQuery, selectedTypes, showEligibleOnly, sortBy, studentProfile, matchResults]);

  // Toggle type filter
  const toggleType = (type: ScholarshipType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setShowEligibleOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedTypes.length > 0 || showEligibleOnly;

  // Calculate stats
  const eligibleCount = useMemo(() => {
    if (!studentProfile) return 0;
    return scholarships.filter(s => {
      const id = s.id || (s as any)._id;
      return matchResults.get(id)?.isEligible;
    }).length;
  }, [scholarships, matchResults, studentProfile]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {title && (
            <h2 className="text-2xl font-display font-bold text-slate-900">{title}</h2>
          )}
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              {filteredScholarships.length} scholarship{filteredScholarships.length !== 1 ? 's' : ''}
            </span>
            {studentProfile && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                {eligibleCount} eligible
              </span>
            )}
            {predictionsLoading && (
              <span className="flex items-center gap-1.5 text-primary-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Loading predictions...</span>
              </span>
            )}
          </div>
        </div>

        {showViewToggle && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-uplb-100 text-uplb-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-uplb-100 text-uplb-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="input pr-10 appearance-none cursor-pointer"
                >
                  <option value="deadline">Sort by Deadline</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="name">Sort by Name</option>
                  {studentProfile && <option value="match">Sort by Match</option>}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Filter Toggle (Mobile) */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`md:hidden flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  hasActiveFilters
                    ? 'bg-uplb-50 border-uplb-200 text-uplb-700'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-5 h-5 rounded-full bg-uplb-600 text-white text-xs flex items-center justify-center">
                    {selectedTypes.length + (showEligibleOnly ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Pills (Desktop) & Filter Panel (Mobile) */}
          <div className={`${isFilterOpen ? 'block' : 'hidden md:block'}`}>
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filters */}
              {allTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTypes.includes(type)
                      ? 'bg-uplb-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}

              {/* Eligible Only Toggle */}
              {studentProfile && (
                <button
                  onClick={() => setShowEligibleOnly(!showEligibleOnly)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    showEligibleOnly
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Eligible Only
                </button>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        // Loading skeleton
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 xl:grid-cols-2 gap-6'
            : 'space-y-4'
        }>
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Color bar skeleton */}
              <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-300" />
              
              <div className="p-6">
                {/* Header skeleton */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>

                {/* Badge skeleton */}
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-slate-100 rounded-full w-20" />
                  <div className="h-6 bg-slate-100 rounded-full w-24" />
                </div>

                {/* Description skeleton */}
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>

                {/* Footer skeleton */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="h-6 bg-slate-200 rounded w-24" />
                  <div className="h-9 bg-slate-200 rounded-lg w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredScholarships.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 xl:grid-cols-2 gap-6'
            : 'space-y-4'
        }>
          {filteredScholarships.map(scholarship => {
            const scholarshipId = scholarship.id || (scholarship as any)._id;
            return (
              <ScholarshipCard
                key={scholarshipId}
                scholarship={scholarship}
                matchResult={matchResults.get(scholarshipId)}
                showPrediction={!!studentProfile}
                predictionsLoading={predictionsLoading}
                variant={viewMode === 'list' ? 'compact' : 'default'}
                applicationStatus={applicationStatuses?.get(scholarshipId) || null}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No Scholarships Found
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {emptyMessage}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-uplb-600 font-medium hover:text-uplb-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ScholarshipList;
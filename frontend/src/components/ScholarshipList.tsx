// ============================================================================
// ISKOlarship - ScholarshipList Component
// List of scholarships with filtering, sorting, and view options
// ============================================================================

import React, { useState, useMemo } from 'react';
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
  GraduationCap
} from 'lucide-react';
import ScholarshipCard from './ScholarshipCard';
import { Scholarship, MatchResult, ScholarshipType, StudentProfile } from '../types';
import { matchStudentToScholarships, sortScholarships } from '../services/filterEngine';

interface ScholarshipListProps {
  scholarships: Scholarship[];
  studentProfile?: StudentProfile;
  showFilters?: boolean;
  showViewToggle?: boolean;
  viewMode?: 'grid' | 'list';
  title?: string;
  emptyMessage?: string;
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
  emptyMessage = 'No scholarships found matching your criteria.'
}) => {
  // State
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = setInternalViewMode;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [selectedTypes, setSelectedTypes] = useState<ScholarshipType[]>([]);
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      return [id, r];
    }));
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

  // Toggle bookmark
  const handleBookmark = (scholarshipId: string) => {
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scholarshipId)) {
        newSet.delete(scholarshipId);
      } else {
        newSet.add(scholarshipId);
      }
      return newSet;
    });
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
      {filteredScholarships.length > 0 ? (
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
                onBookmark={handleBookmark}
                isBookmarked={bookmarkedIds.has(scholarshipId)}
                variant={viewMode === 'list' ? 'compact' : 'default'}
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
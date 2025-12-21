// ============================================================================
// ISKOlarship - Scholarships Browse Page
// Browse and filter all available scholarships (with API integration)
// ============================================================================

import React, { useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Loader2,
  LayoutGrid,
  List
} from 'lucide-react';
import { AuthContext } from '../App';
import { scholarshipApi } from '../services/apiClient';
import ScholarshipList from '../components/ScholarshipList';
import HorizontalFilterBar from '../components/HorizontalFilterBar';
import SearchBar from '../components/SearchBar';
import { FilterCriteria, Scholarship, isStudentProfile } from '../types';

const Scholarships: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const studentUser = isStudentProfile(user) ? user : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial search from URL
  const initialSearch = searchParams.get('search') || '';
  
  // State
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCriteria>({
    searchQuery: initialSearch,
    scholarshipTypes: [],
    colleges: [],
    yearLevels: [],
    showEligibleOnly: false
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch scholarships from API
  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await scholarshipApi.getAll({ 
          search: filters.searchQuery,
          limit: 100
        });
        if (response.success && response.data?.scholarships) {
          setScholarships(response.data.scholarships);
        } else {
          setError('Failed to load scholarships');
        }
      } catch (err) {
        console.error('Failed to fetch from API:', err);
        setError('Failed to connect to server. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchScholarships();
  }, [filters.searchQuery]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterCriteria>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle search
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      scholarshipTypes: [],
      colleges: [],
      yearLevels: [],
      showEligibleOnly: false
    });
    setSearchParams({});
  };

  // Filter scholarships locally (for filters not handled by API)
  const filteredScholarships = scholarships.filter(s => {
    // Apply type filter
    if (filters.scholarshipTypes && filters.scholarshipTypes.length > 0) {
      if (!filters.scholarshipTypes.includes(s.type)) {
        return false;
      }
    }

    // Apply amount filter
    const amount = s.awardAmount || 0;
    if (filters.minAmount !== undefined && amount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && amount > filters.maxAmount) {
      return false;
    }

    // Apply college filter
    if (filters.colleges && filters.colleges.length > 0) {
      if (s.eligibilityCriteria?.eligibleColleges && s.eligibilityCriteria.eligibleColleges.length > 0) {
        if (!filters.colleges.some(c => s.eligibilityCriteria.eligibleColleges!.includes(c))) {
          return false;
        }
      }
    }

    // Apply year level filter
    if (filters.yearLevels && filters.yearLevels.length > 0) {
      if (s.eligibilityCriteria?.requiredYearLevels && s.eligibilityCriteria.requiredYearLevels.length > 0) {
        if (!filters.yearLevels.some(y => s.eligibilityCriteria.requiredYearLevels!.includes(y))) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Full Width */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-10 md:py-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 text-gold-400 mb-3">
              <GraduationCap className="w-7 h-7" />
              <span className="text-sm font-semibold uppercase tracking-widest">Browse Scholarships</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Available Scholarships
            </h1>
            <p className="text-slate-200 text-lg max-w-3xl mb-8">
              Explore all scholarship opportunities available through the UPLB Office of 
              Scholarships and Grants (OSG). Use filters to find scholarships that match your profile.
            </p>

            {/* Search Bar - Wider */}
            <div className="max-w-3xl">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search by scholarship name, provider, or keywords..."
                variant="hero"
                showSuggestions={false}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-7xl mx-auto">
        {/* Horizontal Filter Bar */}
        <HorizontalFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          showEligibleToggle={!!user}
          resultCount={filteredScholarships.length}
          className="mb-6"
        />

        {/* View Toggle and Sort */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-600">
            {filters.searchQuery && (
              <span>Results for "<span className="font-semibold text-slate-900">{filters.searchQuery}</span>"</span>
            )}
          </div>
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
        </div>

        {/* Scholarship List - Full Width */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-uplb-100 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-uplb-600 animate-spin" />
              </div>
              <p className="text-slate-600">Loading scholarships...</p>
            </div>
          </div>
        ) : (
          <ScholarshipList
            scholarships={filteredScholarships}
            studentProfile={studentUser}
            showFilters={false}
            showViewToggle={false}
            viewMode={viewMode}
            title={undefined}
            emptyMessage={
              filters.searchQuery
                ? `No scholarships found matching "${filters.searchQuery}". Try adjusting your search or filters.`
                : 'No scholarships match your current filters. Try adjusting your criteria.'
            }
          />
        )}
        </div>
      </div>
    </div>
  );
};

export default Scholarships;

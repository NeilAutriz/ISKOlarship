// ============================================================================
// ISKOlarship - Scholarships Browse Page
// Browse and filter all available scholarships (with API integration)
// ============================================================================

import React, { useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Filter,
  Loader2
} from 'lucide-react';
import { AuthContext } from '../App';
import { scholarshipApi } from '../services/apiClient';
import ScholarshipList from '../components/ScholarshipList';
import FilterPanel from '../components/FilterPanel';
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

  // Count active filters
  const activeFilterCount = 
    (filters.scholarshipTypes?.length || 0) +
    (filters.colleges?.length || 0) +
    (filters.yearLevels?.length || 0) +
    (filters.minAmount !== undefined ? 1 : 0) +
    (filters.maxAmount !== undefined ? 1 : 0) +
    (filters.showEligibleOnly ? 1 : 0);

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
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="container-app py-8 md:py-12">
          <div className="flex items-center gap-3 text-gold-400 mb-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-sm font-medium uppercase tracking-wider">Browse</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Available Scholarships
          </h1>
          <p className="text-slate-300 max-w-2xl mb-6">
            Explore all scholarship opportunities available through the UPLB Office of 
            Scholarships and Grants (OSG). Use filters to find scholarships that match your profile.
          </p>

          {/* Search Bar */}
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search by scholarship name, provider, or keywords..."
            variant="hero"
            showSuggestions={false}
            className="max-w-2xl"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container-app py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Filters (Desktop) */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                showEligibleToggle={!!user}
                isCollapsible={false}
              />
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <button
              onClick={() => setShowMobileFilters(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                activeFilterCount > 0
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Filter Panel */}
          {showMobileFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50">
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Filters</h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4">
                  <FilterPanel
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    showEligibleToggle={!!user}
                    isCollapsible={false}
                    className="shadow-none border-0"
                  />
                </div>
                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4">
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="btn-primary w-full"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scholarship List */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-slate-600">Loading scholarships...</span>
              </div>
            ) : (
              <ScholarshipList
                scholarships={filteredScholarships}
                studentProfile={studentUser}
                showFilters={false}
                showViewToggle={true}
                title={filters.searchQuery ? `Search results for "${filters.searchQuery}"` : undefined}
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
    </div>
  );
};

export default Scholarships;

// ============================================================================
// ISKOlarship - Scholarships Browse Page
// Browse and filter all available scholarships (with API integration)
// ============================================================================

import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Loader2,
  LayoutGrid,
  List,
  Layers
} from 'lucide-react';
import { AuthContext } from '../App';
import { scholarshipApi, applicationApi } from '../services/apiClient';
import ScholarshipList from '../components/ScholarshipList';
import HorizontalFilterBar from '../components/HorizontalFilterBar';
import SearchBar from '../components/SearchBar';
import PaginationControls from '../components/PaginationControls';
import { FilterCriteria, Scholarship, Application, ApplicationStatus, isStudentProfile } from '../types';

const PAGE_SIZE = 12;

const Scholarships: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const studentUser = isStudentProfile(user) ? user : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(() => ({
    searchQuery: searchParams.get('search') || '',
    scholarshipTypes: [],
    colleges: [],
    yearLevels: [],
    showEligibleOnly: false
  }));

  // Sync filters.searchQuery when URL search param changes externally (back/forward navigation)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setFilters(prev => {
      if (prev.searchQuery !== urlSearch) {
        return { ...prev, searchQuery: urlSearch };
      }
      return prev;
    });
  }, [searchParams]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Track student's existing application statuses per scholarship
  const [applicationStatuses, setApplicationStatuses] = useState<Map<string, ApplicationStatus>>(new Map());

  // Fetch student's applications to build status map
  useEffect(() => {
    if (!studentUser) {
      setApplicationStatuses(new Map());
      return;
    }

    let isMounted = true;

    const fetchApplicationStatuses = async () => {
      try {
        const response = await applicationApi.getMyApplications(undefined, 1, 100);
        if (isMounted && response.success && response.data?.applications) {
          const statusMap = new Map<string, ApplicationStatus>();
          response.data.applications.forEach((app: Application) => {
            const scholarshipId = typeof app.scholarship === 'string'
              ? app.scholarship
              : (app.scholarship as Scholarship)?._id || (app.scholarship as Scholarship)?.id;
            const id = scholarshipId || app.scholarshipId;
            if (id) {
              statusMap.set(id, app.status);
            }
          });
          setApplicationStatuses(statusMap);
        }
      } catch {
        // Silently fail — cards just won't show application badges
      }
    };

    fetchApplicationStatuses();

    return () => {
      isMounted = false;
    };
  }, [studentUser]);

  // Fetch scholarships from API
  useEffect(() => {
    let isMounted = true;
    
    const fetchScholarships = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        const response = await scholarshipApi.getAll({ 
          search: filters.searchQuery,
          page: showAll ? 1 : currentPage,
          limit: showAll ? (pagination.total || 500) : PAGE_SIZE
        });
        if (isMounted) {
          if (response.success && response.data?.scholarships) {
            setScholarships(response.data.scholarships);
            if (response.data.pagination) {
              setPagination({
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages
              });
            }
          } else {
            setError('Failed to load scholarships');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch from API:', err);
          setError('Failed to connect to server. Please try again later.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchScholarships();
    
    return () => {
      isMounted = false;
    };
  }, [filters.searchQuery, currentPage, showAll]);  // re-fetch when page, search, or showAll changes

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterCriteria>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // reset to first page on filter change
  };

  // Handle search
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    setCurrentPage(1); // reset to first page on new search
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
    setCurrentPage(1);
    setShowAll(false);
    setSearchParams({});
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when local filters change (type, college, yearLevel, amount)
  // These are client-side filters applied on the current page's data
  // Note: showEligibleOnly is excluded because it's managed by handleShowAllEligible
  useEffect(() => {
    setCurrentPage(1);
    setShowAll(false);
  }, [filters.scholarshipTypes, filters.colleges, filters.yearLevels, filters.minAmount, filters.maxAmount]);

  const handleToggleShowAll = () => {
    if (showAll) {
      setShowAll(false);
      setCurrentPage(1);
    } else {
      setShowAll(true);
      setCurrentPage(1);
    }
  };

  const handleShowAllEligible = () => {
    const isActive = showAll && filters.showEligibleOnly;
    if (isActive) {
      // Toggle off
      setShowAll(false);
      setFilters(prev => ({ ...prev, showEligibleOnly: false }));
      setCurrentPage(1);
    } else {
      setShowAll(true);
      setFilters(prev => ({ ...prev, showEligibleOnly: true }));
      setCurrentPage(1);
    }
  };

  // Filter scholarships locally (for filters not handled by API)
  const filteredScholarships = useMemo(() => {
    return scholarships.filter(s => {
      // Apply type filter (case-insensitive comparison for robustness)
      if (filters.scholarshipTypes && filters.scholarshipTypes.length > 0) {
        const sType = (s.type || '').toLowerCase().trim();
        const matches = filters.scholarshipTypes.some(
          ft => ft.toLowerCase().trim() === sType
        );
        if (!matches) return false;
      }

      // Apply amount filter (check both awardAmount and totalGrant)
      const amount = s.awardAmount ?? s.totalGrant ?? 0;
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
        const scholarshipYearLevels = s.eligibilityCriteria?.eligibleClassifications || s.eligibilityCriteria?.requiredYearLevels || [];
        if (scholarshipYearLevels.length > 0) {
          if (!filters.yearLevels.some(y => scholarshipYearLevels.includes(y))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [scholarships, filters, studentUser]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header - Maximized Width with Centered Content */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/UPLB_Academic_Heritage_Monument%2C_June_2023.jpg/2560px-UPLB_Academic_Heritage_Monument%2C_June_2023.jpg" 
            alt="UPLB Heritage Monument" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800/95 via-primary-700/90 to-primary-900/95" />
        </div>
        
        <div className="relative w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="max-w-[1800px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 sm:gap-2.5 bg-white/15 backdrop-blur-sm px-3 sm:px-5 py-2 sm:py-2.5 rounded-full mb-4 sm:mb-6 border border-white/20">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" />
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-gold-300">
                Browse Scholarships
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-white mb-3 sm:mb-5 tracking-tight">
              Available Scholarships
            </h1>
            
            {/* Description */}
            <p className="text-primary-100 text-sm sm:text-base md:text-lg lg:text-xl max-w-3xl mx-auto mb-6 sm:mb-10 leading-relaxed px-2">
              Explore all scholarship opportunities available through the UPLB Office of 
              Scholarships and Grants (OSG). Use filters to find scholarships that match your profile.
            </p>

            {/* Search Bar - Centered and Wider */}
            <div className="max-w-2xl mx-auto">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search by scholarship name, provider, or keywords..."
                variant="hero"
                showSuggestions={false}
                className="w-full shadow-2xl"
                value={filters.searchQuery}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Maximized Width */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-6 sm:py-10">
        <div className="max-w-[1800px] mx-auto">
          {/* Horizontal Filter Bar with Stats */}
          <HorizontalFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            showEligibleToggle={!!user}
            onShowAllEligible={studentUser ? handleShowAllEligible : undefined}
            showAllEligibleActive={showAll && filters.showEligibleOnly}
            resultCount={filteredScholarships.length}
            totalCount={pagination.total}
            className="mb-8"
          />

          {/* View Toggle and Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-200">
            <div className="text-xs sm:text-sm md:text-base text-slate-600 min-w-0">
              {filters.searchQuery ? (
                <span>
                  Showing results for "<span className="font-semibold text-primary-700">{filters.searchQuery}</span>"
                </span>
              ) : (
                <span className="text-slate-500">
                  Showing <span className="font-semibold text-slate-900">{filteredScholarships.length}</span> of{' '}
                  <span className="font-semibold text-slate-900">{pagination.total}</span> scholarships
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-slate-500 hidden sm:block">View:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {pagination.total > PAGE_SIZE && (
                <button
                  onClick={handleToggleShowAll}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    showAll
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700'
                  }`}
                  title={showAll ? 'Switch back to pages' : `Show all ${pagination.total} scholarships`}
                >
                  <Layers className="w-4 h-4" />
                  <span className="hidden sm:inline">{showAll ? 'Paginate' : `View All ${pagination.total}`}</span>
                  <span className="sm:hidden">{showAll ? 'Pages' : 'All'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Scholarship List - Full Width */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-5">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center shadow-lg">
                  <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-700">Loading scholarships...</p>
                  <p className="text-sm text-slate-500 mt-1">Please wait while we fetch the latest opportunities</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <ScholarshipList
                scholarships={filteredScholarships}
                studentProfile={studentUser}
                showFilters={false}
                showViewToggle={false}
                viewMode={viewMode}
                showEligibleOnly={filters.showEligibleOnly}
                applicationStatuses={applicationStatuses}
                title={undefined}
                emptyMessage={
                  filters.searchQuery
                    ? `No scholarships found matching "${filters.searchQuery}". Try adjusting your search or filters.`
                    : 'No scholarships match your current filters. Try adjusting your criteria.'
                }
              />
              {/* Pagination Controls */}
              {!showAll && pagination.totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={PAGE_SIZE}
                    onPageChange={handlePageChange}
                    itemLabel="scholarships"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scholarships;

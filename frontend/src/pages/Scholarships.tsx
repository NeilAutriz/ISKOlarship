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
  List
} from 'lucide-react';
import { AuthContext } from '../App';
import { scholarshipApi, applicationApi } from '../services/apiClient';
import ScholarshipList from '../components/ScholarshipList';
import HorizontalFilterBar from '../components/HorizontalFilterBar';
import SearchBar from '../components/SearchBar';
import { FilterCriteria, Scholarship, Application, ApplicationStatus, isStudentProfile } from '../types';

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
          limit: 100
        });
        if (isMounted) {
          if (response.success && response.data?.scholarships) {
            setScholarships(response.data.scholarships);
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
  const filteredScholarships = useMemo(() => {
    return scholarships.filter(s => {
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
        
        <div className="relative w-full px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-12 md:py-16 lg:py-20">
          <div className="max-w-[1800px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-sm px-5 py-2.5 rounded-full mb-6 border border-white/20">
              <GraduationCap className="w-5 h-5 text-gold-400" />
              <span className="text-sm font-semibold uppercase tracking-widest text-gold-300">
                Browse Scholarships
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-5 tracking-tight">
              Available Scholarships
            </h1>
            
            {/* Description */}
            <p className="text-primary-100 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Maximized Width */}
      <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-10">
        <div className="max-w-[1800px] mx-auto">
          {/* Horizontal Filter Bar with Stats */}
          <HorizontalFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            showEligibleToggle={!!user}
            resultCount={filteredScholarships.length}
            totalCount={scholarships.length}
            className="mb-8"
          />

          {/* View Toggle and Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-200">
            <div className="text-sm sm:text-base text-slate-600 min-w-0">
              {filters.searchQuery ? (
                <span>
                  Showing results for "<span className="font-semibold text-primary-700">{filters.searchQuery}</span>"
                </span>
              ) : (
                <span className="text-slate-500">
                  Showing <span className="font-semibold text-slate-900">{filteredScholarships.length}</span> scholarships
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden sm:block">View:</span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Scholarships;

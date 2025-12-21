// ============================================================================
// ISKOlarship - useApi Hook
// Custom hooks for fetching data from the backend API
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { scholarshipApi, statisticsApi, applicationApi, ScholarshipFilters } from './apiClient';
import { Scholarship } from '../types';

// ============================================================================
// Generic Fetch Hook
// ============================================================================

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useFetch<T>(fetchFn: () => Promise<{ success: boolean; data: T }>, deps: any[] = []) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchFn();
      if (response.success) {
        setState({ data: response.data, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: 'Failed to fetch data' });
      }
    } catch (err: any) {
      setState({ 
        data: null, 
        loading: false, 
        error: err.response?.data?.message || err.message || 'An error occurred' 
      });
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

// ============================================================================
// Scholarships Hook
// ============================================================================

interface UseScholarshipsResult {
  scholarships: Scholarship[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  refetch: () => void;
  setFilters: (filters: ScholarshipFilters) => void;
}

export function useScholarshipsApi(initialFilters: ScholarshipFilters = {}): UseScholarshipsResult {
  const [filters, setFilters] = useState<ScholarshipFilters>(initialFilters);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [pagination, setPagination] = useState<UseScholarshipsResult['pagination']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScholarships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await scholarshipApi.getAll(filters);
      if (response.success) {
        setScholarships(response.data.scholarships);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch scholarships');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchScholarships();
  }, [fetchScholarships]);

  return {
    scholarships,
    loading,
    error,
    pagination,
    refetch: fetchScholarships,
    setFilters,
  };
}

// ============================================================================
// Single Scholarship Hook
// ============================================================================

export function useScholarship(id: string) {
  return useFetch<Scholarship>(
    () => scholarshipApi.getById(id),
    [id]
  );
}

// ============================================================================
// Statistics Hooks
// ============================================================================

export function usePlatformStats() {
  return useFetch(
    () => statisticsApi.getOverview(),
    []
  );
}

export function useStatisticsTrends() {
  return useFetch(
    () => statisticsApi.getTrends(),
    []
  );
}

export function useScholarshipStats() {
  return useFetch(
    () => statisticsApi.getScholarshipStats(),
    []
  );
}

export function usePredictionAccuracy() {
  return useFetch(
    () => statisticsApi.getPredictionAccuracy(),
    []
  );
}

// ============================================================================
// Applications Hooks
// ============================================================================

export function useMyApplications(status?: string, page = 1) {
  return useFetch(
    () => applicationApi.getMyApplications(status, page),
    [status, page]
  );
}

export function useMyApplicationStats() {
  return useFetch(
    () => applicationApi.getMyStats(),
    []
  );
}

// ============================================================================
// Export all hooks
// ============================================================================

export default {
  useScholarshipsApi,
  useScholarship,
  usePlatformStats,
  useStatisticsTrends,
  useScholarshipStats,
  usePredictionAccuracy,
  useMyApplications,
  useMyApplicationStats,
};

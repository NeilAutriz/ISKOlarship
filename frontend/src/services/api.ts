// ============================================================================
// ISKOlarship - API Service
// Unified API client for backend communication with fallback to mock data
// ============================================================================

import { scholarshipApi, applicationApi, userApi, statisticsApi, predictionApi, authApi, setTokens, clearTokens, getAccessToken, normalizeScholarship } from './apiClient';
import { Scholarship, StudentProfile, HistoricalApplication, Application } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const USE_MOCK_FALLBACK = false; // Disabled - errors should propagate to the UI

// Helper to handle API calls with optional mock fallback
async function apiWithFallback<T>(
  apiCall: () => Promise<T>,
  mockFallback: () => T,
  useFallback = USE_MOCK_FALLBACK
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (useFallback) {
      console.warn('API call failed, using mock data:', error);
      return mockFallback();
    }
    throw error;
  }
}

// ============================================================================
// Scholarship API
// ============================================================================

/**
 * Fetch all scholarships from backend
 */
export const fetchScholarships = async (filters?: {
  type?: string;
  yearLevel?: string;
  college?: string;
  search?: string;
  limit?: number;
}): Promise<Scholarship[]> => {
  return apiWithFallback(
    async () => {
      const response = await scholarshipApi.getAll(filters || {});
      if (response.success && response.data?.scholarships) {
        return response.data.scholarships.map(normalizeScholarship);
      }
      throw new Error('Failed to fetch scholarships');
    },
    () => []
  );
};

/**
 * Fetch scholarship by ID from backend
 */
export const fetchScholarshipDetails = async (id: string): Promise<Scholarship | null> => {
  return apiWithFallback(
    async () => {
      const response = await scholarshipApi.getById(id);
      if (response.success && response.data) {
        return normalizeScholarship(response.data);
      }
      return null;
    },
    () => null
  );
};

/**
 * Search scholarships
 */
export const searchScholarships = async (query: string): Promise<Scholarship[]> => {
  return apiWithFallback(
    async () => {
      const response = await scholarshipApi.getAll({ search: query });
      if (response.success && response.data?.scholarships) {
        return response.data.scholarships.map(normalizeScholarship);
      }
      throw new Error('Failed to search scholarships');
    },
    () => []
  );
};

/**
 * Get scholarship statistics
 */
export const fetchScholarshipStats = async () => {
  return apiWithFallback(
    async () => {
      const response = await scholarshipApi.getStats();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch scholarship stats');
    },
    () => ({
      totalActive: 0,
      byType: {},
      upcomingDeadlines: [],
      totalFunding: 0
    })
  );
};

// ============================================================================
// User API
// ============================================================================

/**
 * Fetch current user profile
 */
export const fetchUserProfile = async (): Promise<StudentProfile | null> => {
  try {
    const response = await userApi.getProfile();
    if (response.success && response.data) {
      return response.data as StudentProfile;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  try {
    const response = await userApi.updateProfile(updates);
    if (response.success) {
      return { success: true, user: response.data as StudentProfile };
    }
    return { success: false, error: 'Failed to update profile' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update profile' };
  }
};

/**
 * Get profile completeness
 */
export const fetchProfileCompleteness = async () => {
  try {
    const response = await userApi.getProfileCompleteness();
    if (response.success && response.data) {
      return response.data;
    }
    return { isComplete: false, percentage: 0, missingFields: [] };
  } catch (error) {
    console.warn('Failed to fetch profile completeness:', error);
    return { isComplete: false, percentage: 0, missingFields: [] };
  }
};

// ============================================================================
// Application API
// ============================================================================

/**
 * Get user's applications
 */
export const fetchUserApplications = async (status?: string): Promise<Application[]> => {
  try {
    const response = await applicationApi.getMyApplications(status);
    if (response.success && response.data?.applications) {
      return response.data.applications;
    }
    return [];
  } catch (error) {
    console.warn('Failed to fetch user applications:', error);
    return [];
  }
};

/**
 * Get user's application statistics
 */
export const fetchUserApplicationStats = async () => {
  try {
    const response = await applicationApi.getMyStats();
    if (response.success && response.data) {
      return response.data;
    }
    return { total: 0, approved: 0, pending: 0, rejected: 0, draft: 0, byStatus: {} };
  } catch (error) {
    console.warn('Failed to fetch application stats:', error);
    return { total: 0, approved: 0, pending: 0, rejected: 0, draft: 0, byStatus: {} };
  }
};

/**
 * Create a new application
 */
export const createApplication = async (
  scholarshipId: string,
  data: { personalStatement?: string; additionalInfo?: string }
): Promise<{ success: boolean; application?: Application; error?: string }> => {
  try {
    const response = await applicationApi.create({ scholarshipId, ...data });
    if (response.success && response.data) {
      return { success: true, application: response.data.application };
    }
    return { success: false, error: 'Failed to create application' };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Submit an application
 */
export const submitApplication = async (
  applicationId: string
): Promise<{ success: boolean; application?: Application; error?: string }> => {
  try {
    const response = await applicationApi.submit(applicationId);
    if (response.success && response.data) {
      return { success: true, application: response.data };
    }
    return { success: false, error: 'Failed to submit application' };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Withdraw an application
 */
export const withdrawApplication = async (
  applicationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await applicationApi.withdraw(applicationId, reason);
    if (response.success) {
      return { success: true };
    }
    return { success: false, error: 'Failed to withdraw application' };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Fetch platform statistics
 */
export const fetchPlatformStatistics = async () => {
  return apiWithFallback(
    async () => {
      const response = await statisticsApi.getOverview();
      if (response.success && response.data) {
        return {
          totalApplications: response.data.overview.totalApplications,
          totalApproved: response.data.overview.approvedApplications,
          totalRejected: response.data.overview.rejectedApplications,
          successRate: response.data.overview.successRate,
          totalScholarships: response.data.overview.totalScholarships,
          activeScholarships: response.data.overview.activeScholarships,
          totalStudents: response.data.overview.totalStudents,
          totalFunding: response.data.funding.totalAvailable,
          distributions: response.data.distributions
        };
      }
      throw new Error('Failed to fetch platform statistics');
    },
    () => ({
      totalApplications: 0,
      totalApprovedAllTime: 0,
      totalRejectedAllTime: 0,
      overallSuccessRate: 0,
      averageGWAApproved: null,
      averageIncomeApproved: null,
      totalScholarships: 0,
      activeScholarships: 0,
      totalStudents: 0,
      totalFunding: 0,
      distributions: {}
    } as any)
  );
};

/**
 * Fetch scholarship statistics (for analytics)
 */
export const fetchScholarshipStatistics = async () => {
  return apiWithFallback(
    async () => {
      const response = await statisticsApi.getScholarshipStats();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch scholarship statistics');
    },
    () => ({
      topByApplications: [],
      byFunding: [],
      upcomingDeadlines: []
    })
  );
};

/**
 * Fetch trends data
 */
export const fetchTrends = async () => {
  return apiWithFallback(
    async () => {
      const response = await statisticsApi.getTrends();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch trends');
    },
    () => ({
      yearlyTrends: [],
      semesterTrends: [],
      gwaDistribution: [],
      incomeDistribution: []
    })
  );
};

/**
 * Fetch comprehensive analytics
 */
export const fetchAnalytics = async () => {
  return apiWithFallback(
    async () => {
      const response = await statisticsApi.getAnalytics();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch analytics');
    },
    () => ({
      platformStatistics: {
        totalApplications: 0,
        totalApprovedAllTime: 0,
        totalRejectedAllTime: 0,
        overallSuccessRate: 0,
        averageGWAApproved: null,
        averageIncomeApproved: null,
        totalScholarships: 0,
        activeScholarships: 0,
        totalStudents: 0,
        totalFunding: 0,
        distributions: {}
      },
      yearlyTrends: [],
      collegeStats: [],
      gwaStats: [],
      incomeStats: [],
      yearLevelStats: [],
      typeStats: [],
      modelMetrics: null,
      lastUpdated: new Date().toISOString()
    } as any)
  );
};

/**
 * Fetch historical applications for analytics
 */
export const fetchHistoricalApplications = async (): Promise<HistoricalApplication[]> => {
  // Historical data is primarily used for model training
  // In production, this would come from the backend analytics endpoint
  // For now, return empty array and rely on backend to provide this data when needed
  return [];
};

// ============================================================================
// Prediction API
// ============================================================================

/**
 * Check eligibility for a scholarship
 */
export const checkEligibility = async (scholarshipId: string) => {
  try {
    const response = await predictionApi.checkEligibility(scholarshipId);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.warn('Failed to check eligibility:', error);
    return null;
  }
};

/**
 * Get probability prediction for a scholarship
 */
export const getPrediction = async (scholarshipId: string) => {
  try {
    const response = await predictionApi.getProbability(scholarshipId);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get prediction:', error);
    return null;
  }
};

/**
 * Get scholarship recommendations
 */
export const getRecommendations = async (limit = 10) => {
  try {
    const response = await predictionApi.getRecommendations(limit);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.warn('Failed to get recommendations:', error);
    return [];
  }
};

/**
 * Get batch predictions for multiple scholarships
 */
export const getBatchPredictions = async (scholarshipIds: string[]) => {
  try {
    const response = await predictionApi.getBatchPredictions(scholarshipIds);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.warn('Failed to get batch predictions:', error);
    return [];
  }
};

/**
 * Get personalized prediction for a specific scholarship (alias for getPrediction)
 * Returns prediction with factors from trained ML model
 */
export const getPredictionForScholarship = async (scholarshipId: string) => {
  return getPrediction(scholarshipId);
};

/**
 * Get prediction for a specific application (admin only)
 * This fetches fresh prediction data for the applicant
 */
export const getPredictionForApplication = async (applicationId: string) => {
  try {
    const response = await predictionApi.getPredictionForApplication(applicationId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to get prediction for application');
  } catch (error) {
    console.error('Failed to get prediction for application:', error);
    throw error;
  }
};

// ============================================================================
// Auth API (re-exported for convenience)
// ============================================================================

export { authApi, setTokens, clearTokens, getAccessToken };

// ============================================================================
// Export Unified API Object
// ============================================================================

export const api = {
  scholarships: {
    getAll: fetchScholarships,
    getById: fetchScholarshipDetails,
    search: searchScholarships,
    getStats: fetchScholarshipStats
  },
  users: {
    getProfile: fetchUserProfile,
    update: updateUserProfile,
    getCompleteness: fetchProfileCompleteness
  },
  applications: {
    getAll: fetchUserApplications,
    getStats: fetchUserApplicationStats,
    create: createApplication,
    submit: submitApplication,
    withdraw: withdrawApplication
  },
  analytics: {
    getPlatformStats: fetchPlatformStatistics,
    getScholarshipStats: fetchScholarshipStatistics,
    getTrends: fetchTrends,
    getAnalytics: fetchAnalytics,
    getHistoricalData: fetchHistoricalApplications
  },
  predictions: {
    checkEligibility,
    getPrediction,
    getRecommendations,
    getBatchPredictions
  },
  auth: authApi
};

export default api;
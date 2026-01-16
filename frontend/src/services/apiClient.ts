// ============================================================================
// ISKOlarship - API Service
// Axios-based API client for backend communication
// ============================================================================

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Scholarship, StudentProfile, Application, PredictionResult } from '../types';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for document uploads
});

// ============================================================================
// Scholarship Normalization Utility
// Transforms API response format to frontend format
// ============================================================================

/**
 * Map API scholarship type to frontend ScholarshipType enum value
 */
const normalizeScholarshipType = (apiType: string): string => {
  if (!apiType) return 'university';
  
  const typeMap: Record<string, string> = {
    // API values -> Frontend enum values
    'Thesis/Research Grant': 'thesis_grant',
    'thesis_grant': 'thesis_grant',
    'thesis grant': 'thesis_grant',
    'Private Scholarship': 'private',
    'private': 'private',
    'Government Scholarship': 'government',
    'government': 'government',
    'University Scholarship': 'university',
    'university': 'university',
    'College Scholarship': 'college',
    'college': 'college',
    'DOST Scholarship': 'government',
    'CHED Scholarship': 'government',
  };
  
  // Try exact match first
  if (typeMap[apiType]) {
    return typeMap[apiType];
  }
  
  // Try case-insensitive match
  const lowerType = apiType.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (key.toLowerCase() === lowerType) {
      return value;
    }
  }
  
  // Try partial match
  if (lowerType.includes('thesis') || lowerType.includes('grant') || lowerType.includes('research')) {
    return 'thesis_grant';
  }
  if (lowerType.includes('private')) {
    return 'private';
  }
  if (lowerType.includes('government') || lowerType.includes('dost') || lowerType.includes('ched')) {
    return 'government';
  }
  if (lowerType.includes('college')) {
    return 'college';
  }
  
  return 'university'; // Default
};

/**
 * Normalize a scholarship from API format to frontend format
 * API returns: totalGrant, _id, eligibleClassifications, maxGWA
 * Frontend expects: awardAmount, id, requiredYearLevels, minGWA
 */
export const normalizeScholarship = (scholarship: any): Scholarship => {
  if (!scholarship) return scholarship;
  
  const criteria = scholarship.eligibilityCriteria || {};
  
  return {
    ...scholarship,
    // Map _id to id (keep both for compatibility)
    id: scholarship.id || scholarship._id,
    _id: scholarship._id || scholarship.id,
    // Normalize the type to match frontend enum
    type: normalizeScholarshipType(scholarship.type) as any,
    // Map totalGrant to awardAmount (keep both for compatibility)
    awardAmount: scholarship.awardAmount ?? scholarship.totalGrant ?? 0,
    totalGrant: scholarship.totalGrant ?? scholarship.awardAmount ?? 0,
    // Normalize eligibility criteria
    eligibilityCriteria: {
      ...criteria,
      // Map API fields to frontend fields
      requiredYearLevels: criteria.requiredYearLevels || criteria.eligibleClassifications || [],
      eligibleClassifications: criteria.eligibleClassifications || criteria.requiredYearLevels || [],
      minGWA: criteria.minGWA ?? criteria.maxGWA, // UP uses inverted scale (lower is better)
      maxGWA: criteria.maxGWA ?? criteria.minGWA,
      mustNotHaveOtherScholarship: criteria.mustNotHaveOtherScholarship ?? criteria.noExistingScholarship ?? false,
      mustNotHaveThesisGrant: criteria.mustNotHaveThesisGrant ?? criteria.noExistingThesisGrant ?? false,
      mustNotHaveDisciplinaryAction: criteria.mustNotHaveDisciplinaryAction ?? criteria.noDisciplinaryRecord ?? false,
      isFilipinoOnly: criteria.isFilipinoOnly ?? criteria.filipinoOnly ?? false,
      requiresApprovedThesis: criteria.requiresApprovedThesis ?? criteria.requireThesisApproval ?? false,
    },
    // Default values for missing fields
    isActive: scholarship.isActive ?? (scholarship.status === 'open' || scholarship.status === 'active'),
    slots: scholarship.slots ?? 0,
    remainingSlots: scholarship.remainingSlots ?? scholarship.slots ?? 0,
    filledSlots: scholarship.filledSlots ?? 0,
    requirements: scholarship.requirements || [],
    requiredDocuments: scholarship.requiredDocuments || [],
  };
};

/**
 * Normalize an array of scholarships
 */
export const normalizeScholarships = (scholarships: any[]): Scholarship[] => {
  if (!Array.isArray(scholarships)) return [];
  return scholarships.map(normalizeScholarship);
};

// ============================================================================
// Token Management
// ============================================================================

let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getAccessToken = () => accessToken;

// ============================================================================
// Request Interceptor - Add Auth Token
// ============================================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// Response Interceptor - Handle Token Refresh
// ============================================================================

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        
        const { accessToken: newAccessToken } = response.data.data;
        accessToken = newAccessToken;
        localStorage.setItem('accessToken', newAccessToken);
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ============================================================================
// Authentication API
// ============================================================================

export const authApi = {
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'student' | 'admin';
  }) => {
    const response = await api.post<ApiResponse<{
      user: StudentProfile;
      accessToken: string;
      refreshToken: string;
    }>>('/auth/register', userData);
    
    if (response.data.success) {
      setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    }
    
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<{
      user: StudentProfile;
      accessToken: string;
      refreshToken: string;
    }>>('/auth/login', { email, password });
    
    if (response.data.success) {
      setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    }
    
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      clearTokens();
    }
  },

  getMe: async () => {
    const response = await api.get<ApiResponse<{ user: StudentProfile }>>('/auth/me');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    return response.data;
  },
};

// ============================================================================
// User API
// ============================================================================

export const userApi = {
  getProfile: async () => {
    const response = await api.get<ApiResponse<StudentProfile>>('/users/profile');
    console.log('getProfile response:', response.data);
    return response.data;
  },

  updateProfile: async (updates: Partial<StudentProfile>) => {
    console.log('updateProfile request:', updates);
    const response = await api.put<ApiResponse<StudentProfile>>('/users/profile', updates);
    console.log('updateProfile response:', response.data);
    return response.data;
  },

  getProfileCompleteness: async () => {
    const response = await api.get<ApiResponse<{
      isComplete: boolean;
      percentage: number;
      missingFields: string[];
    }>>('/users/profile/completeness');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put<ApiResponse<null>>('/users/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// ============================================================================
// Scholarship API
// ============================================================================

export interface ScholarshipFilters {
  type?: string;
  yearLevel?: string;
  college?: string;
  maxIncome?: number;
  minGWA?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const scholarshipApi = {
  getAll: async (filters: ScholarshipFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const response = await api.get<ApiResponse<{
      scholarships: Scholarship[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>(`/scholarships?${params.toString()}`);
    
    // Normalize scholarships to frontend format
    if (response.data.success && response.data.data?.scholarships) {
      response.data.data.scholarships = normalizeScholarships(response.data.data.scholarships);
    }
    
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Scholarship>>(`/scholarships/${id}`);
    
    // Normalize scholarship to frontend format
    if (response.data.success && response.data.data) {
      response.data.data = normalizeScholarship(response.data.data);
    }
    
    return response.data;
  },

  getTypes: async () => {
    const response = await api.get<ApiResponse<Array<{ type: string; count: number }>>>('/scholarships/types');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<ApiResponse<{
      totalActive: number;
      byType: Record<string, number>;
      upcomingDeadlines: Scholarship[];
      totalFunding: number;
    }>>('/scholarships/stats');
    
    // Normalize upcoming deadlines
    if (response.data.success && response.data.data?.upcomingDeadlines) {
      response.data.data.upcomingDeadlines = normalizeScholarships(response.data.data.upcomingDeadlines);
    }
    
    return response.data;
  },

  // Admin endpoints
  create: async (scholarship: Partial<Scholarship>) => {
    const response = await api.post<ApiResponse<Scholarship>>('/scholarships', scholarship);
    if (response.data.success && response.data.data) {
      response.data.data = normalizeScholarship(response.data.data);
    }
    return response.data;
  },

  update: async (id: string, updates: Partial<Scholarship>) => {
    const response = await api.put<ApiResponse<Scholarship>>(`/scholarships/${id}`, updates);
    if (response.data.success && response.data.data) {
      response.data.data = normalizeScholarship(response.data.data);
    }
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/scholarships/${id}`);
    return response.data;
  },
};

// ============================================================================
// Application API
// ============================================================================

export const applicationApi = {
  getMyApplications: async (status?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    
    const response = await api.get<ApiResponse<{
      applications: Application[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>(`/applications/my?${params.toString()}`);
    return response.data;
  },

  getMyStats: async () => {
    const response = await api.get<ApiResponse<{
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      draft: number;
      byStatus: Record<string, number>;
    }>>('/applications/my/stats');
    return response.data;
  },

  create: async (data: { 
    scholarshipId: string; 
    personalStatement?: string; 
    additionalInfo?: string;
    documents?: any[];
  }) => {
    const response = await api.post<ApiResponse<{
      application: Application;
      eligibility: {
        passed: boolean;
        score: number;
        checks: Array<{ criterion: string; passed: boolean }>;
      };
    }>>('/applications', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Application>>(`/applications/${id}`);
    return response.data;
  },

  update: async (id: string, updates: { personalStatement?: string; additionalInfo?: string }) => {
    const response = await api.put<ApiResponse<Application>>(`/applications/${id}`, updates);
    return response.data;
  },

  submit: async (id: string) => {
    const response = await api.post<ApiResponse<Application>>(`/applications/${id}/submit`);
    return response.data;
  },

  withdraw: async (id: string, reason?: string) => {
    const response = await api.post<ApiResponse<null>>(`/applications/${id}/withdraw`, { reason });
    return response.data;
  },

  // Admin endpoints
  getAll: async (filters: { status?: string; scholarshipId?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });
    
    const response = await api.get<ApiResponse<{
      applications: Application[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>(`/applications?${params.toString()}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string, notes?: string, reason?: string) => {
    const response = await api.put<ApiResponse<Application>>(`/applications/${id}/status`, {
      status,
      notes,
      reason,
    });
    return response.data;
  },

  getReviewQueue: async (limit = 50) => {
    const response = await api.get<ApiResponse<Application[]>>(`/applications/review-queue?limit=${limit}`);
    return response.data;
  },

  getStatsOverview: async (filters?: { scholarshipId?: string; academicYear?: string; semester?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const response = await api.get<ApiResponse<{
      byStatus: Record<string, number>;
      timeline: Array<{ _id: { year: number; month: number }; count: number }>;
      predictionAccuracy: { total: number; correct: number; percentage: string } | null;
    }>>(`/applications/stats/overview?${params.toString()}`);
    return response.data;
  },
};

// ============================================================================
// Prediction API
// ============================================================================

export const predictionApi = {
  checkEligibility: async (scholarshipId: string) => {
    const response = await api.post<ApiResponse<{
      passed: boolean;
      score: number;
      checks: Array<{
        criterion: string;
        passed: boolean;
        applicantValue: string;
        requiredValue: string;
        notes: string;
      }>;
      summary: { total: number; passed: number; failed: number };
      stages: {
        academic: { checks: any[]; passed: boolean };
        financial: { checks: any[]; passed: boolean };
        additional: { checks: any[]; passed: boolean };
      };
    }>>('/predictions/eligibility', { scholarshipId });
    return response.data;
  },

  getProbability: async (scholarshipId: string) => {
    const response = await api.post<ApiResponse<PredictionResult>>('/predictions/probability', { scholarshipId });
    return response.data;
  },

  getRecommendations: async (limit = 10) => {
    const response = await api.post<ApiResponse<Array<{
      scholarship: Partial<Scholarship>;
      score: number;
      eligible: boolean;
      eligibility: any;
      prediction: PredictionResult;
    }>>>('/predictions/recommend', { limit });
    return response.data;
  },

  getBatchPredictions: async (scholarshipIds: string[]) => {
    const response = await api.post<ApiResponse<Array<{
      scholarshipId: string;
      scholarshipName: string;
      eligibility: any;
      probability: PredictionResult | null;
    }>>>('/predictions/batch', { scholarshipIds });
    return response.data;
  },

  // Admin endpoints
  getModelStats: async () => {
    const response = await api.get<ApiResponse<{
      modelVersion: string;
      totalPredictions: number;
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      confusionMatrix: {
        truePositives: number;
        trueNegatives: number;
        falsePositives: number;
        falseNegatives: number;
      };
    }>>('/predictions/model/stats');
    return response.data;
  },

  trainModel: async () => {
    const response = await api.post<ApiResponse<{
      status: string;
      samplesUsed: number;
      message: string;
    }>>('/predictions/model/train');
    return response.data;
  },

  getFeatureImportance: async () => {
    const response = await api.get<ApiResponse<{
      factors: Array<{
        feature: string;
        weight: number;
        importance: number;
        direction: 'positive' | 'negative';
      }>;
      modelVersion: string;
    }>>('/predictions/analytics/factors');
    return response.data;
  },
};

// ============================================================================
// Statistics API
// ============================================================================

export const statisticsApi = {
  getOverview: async () => {
    const response = await api.get<ApiResponse<{
      overview: {
        totalScholarships: number;
        activeScholarships: number;
        totalStudents: number;
        totalApplications: number;
        approvedApplications: number;
        rejectedApplications: number;
        pendingApplications: number;
        successRate: number;
      };
      funding: {
        totalAvailable: number;
        totalSlots: number;
      };
      distributions: {
        scholarshipTypes: Array<{ type: string; count: number; totalAmount: number }>;
        colleges: Array<{ college: string; applications: number }>;
      };
    }>>('/statistics/overview');
    return response.data;
  },

  getTrends: async () => {
    const response = await api.get<ApiResponse<{
      yearlyTrends: Array<{
        academicYear: string;
        total: number;
        approved: number;
        rejected: number;
        successRate: number;
      }>;
      semesterTrends: Array<{
        academicYear: string;
        semester: string;
        count: number;
      }>;
      gwaDistribution: Array<{ range: string; count: number }>;
      incomeDistribution: Array<{ range: string; count: number }>;
    }>>('/statistics/trends');
    return response.data;
  },

  getScholarshipStats: async () => {
    const response = await api.get<ApiResponse<{
      topByApplications: Array<{
        name: string;
        type: string;
        applicationCount: number;
        approvedCount: number;
        successRate: number;
      }>;
      byFunding: Array<{
        name: string;
        type: string;
        awardAmount: number;
        sponsor: string;
        slots: number;
      }>;
      upcomingDeadlines: Array<{
        name: string;
        type: string;
        applicationDeadline: string;
        slots: number;
      }>;
    }>>('/statistics/scholarships');
    return response.data;
  },

  getPredictionAccuracy: async () => {
    const response = await api.get<ApiResponse<{
      totalPredictions: number;
      confusionMatrix: {
        truePositives: number;
        trueNegatives: number;
        falsePositives: number;
        falseNegatives: number;
      };
      metrics: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
      };
    }>>('/statistics/prediction-accuracy');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get<ApiResponse<{
      platformStatistics: {
        totalApplications: number;
        totalApprovedAllTime: number;
        totalRejectedAllTime: number;
        overallSuccessRate: number;
        averageGWAApproved: number | null;
        averageIncomeApproved: number | null;
        uniqueScholars: number;
        totalFunding: number;
        totalStudents: number;
        totalScholarships: number;
        activeScholarships: number;
      };
      yearlyTrends: Array<{
        academicYear: string;
        totalApplications: number;
        approvedApplications: number;
        rejectedApplications: number;
        successRate: number;
      }>;
      collegeStats: Array<{
        college: string;
        totalApplications: number;
        approved: number;
        rejected: number;
        successRate: number;
      }>;
      gwaStats: Array<{
        range: string;
        totalApplications: number;
        approved: number;
        successRate: number;
      }>;
      incomeStats: Array<{
        bracket: string;
        totalApplications: number;
        approved: number;
        successRate: number;
      }>;
      yearLevelStats: Array<{
        yearLevel: string;
        totalApplications: number;
        approved: number;
        successRate: number;
      }>;
      typeStats: Array<{
        type: string;
        count: number;
        totalSlots: number;
        totalFunding: number;
      }>;
      modelMetrics: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
      } | null;
      lastUpdated: string;
    }>>('/statistics/analytics');
    return response.data;
  },
};

// ============================================================================
// Export Default API Instance
// ============================================================================

export default api;

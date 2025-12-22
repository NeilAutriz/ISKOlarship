// ============================================================================
// ISKOlarship - API Service
// API client for backend communication - now uses real API client
// ============================================================================

import { 
  scholarshipApi, 
  applicationApi, 
  authApi, 
  userApi, 
  statisticsApi,
  predictionApi 
} from './apiClient';
import { Scholarship, StudentProfile, HistoricalApplication } from '../types';

// ============================================================================
// Scholarship API
// ============================================================================

/**
 * Fetch all scholarships from the API
 */
export const fetchScholarships = async (): Promise<Scholarship[]> => {
  try {
    const response = await scholarshipApi.getAll({ limit: 100 });
    if (response.success && response.data?.scholarships) {
      return response.data.scholarships;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch scholarships:', error);
    return [];
  }
};

/**
 * Fetch scholarship by ID
 */
export const fetchScholarshipDetails = async (id: string): Promise<Scholarship | null> => {
  try {
    const response = await scholarshipApi.getById(id);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch scholarship details:', error);
    return null;
  }
};

/**
 * Search scholarships
 */
export const searchScholarships = async (query: string): Promise<Scholarship[]> => {
  try {
    const response = await scholarshipApi.getAll({ search: query, limit: 100 });
    if (response.success && response.data?.scholarships) {
      return response.data.scholarships;
    }
    return [];
  } catch (error) {
    console.error('Failed to search scholarships:', error);
    return [];
  }
};

// ============================================================================
// User API
// ============================================================================

/**
 * Fetch user information
 */
export const fetchUserInformation = async (userId: string): Promise<StudentProfile | null> => {
  try {
    const response = await userApi.getProfile();
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
};

/**
 * Register a new user
 */
export const registerUser = async (userData: Partial<StudentProfile>): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  try {
    const response = await authApi.register({
      email: (userData as any).email || '',
      password: (userData as any).password || '',
      firstName: (userData as any).firstName || '',
      lastName: (userData as any).lastName || '',
      role: 'student'
    });
    if (response.success) {
      return { success: true, user: response.data.user };
    }
    return { success: false, error: response.message || 'Registration failed' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Registration failed' };
  }
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  try {
    const response = await authApi.login(email, password);
    if (response.success) {
      return { success: true, user: response.data.user };
    }
    return { success: false, error: response.message || 'Login failed' };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message || 'Login failed' };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<StudentProfile>): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  try {
    const response = await userApi.updateProfile(updates);
    if (response.success) {
      return { success: true, user: response.data };
    }
    return { success: false, error: response.message || 'Update failed' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Update failed' };
  }
};

// ============================================================================
// Application API
// ============================================================================

/**
 * Submit scholarship application
 */
export const submitApplication = async (
  userId: string,
  scholarshipId: string,
  applicationData: Record<string, unknown>
): Promise<{ success: boolean; applicationId?: string; error?: string }> => {
  try {
    const response = await applicationApi.create(scholarshipId, {
      personalStatement: applicationData.personalStatement as string,
      additionalInfo: applicationData.additionalInfo as string
    });
    if (response.success && response.data?.application) {
      const app = response.data.application as any;
      return { 
        success: true, 
        applicationId: app.id || app._id 
      };
    }
    return { success: false, error: response.message || 'Application failed' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Application failed' };
  }
};

/**
 * Get user applications
 */
export const getUserApplications = async (userId: string): Promise<any[]> => {
  try {
    const response = await applicationApi.getMyApplications();
    if (response.success && response.data?.applications) {
      return response.data.applications;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch user applications:', error);
    return [];
  }
};

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Fetch platform statistics
 */
export const fetchPlatformStatistics = async () => {
  try {
    const response = await statisticsApi.getAnalytics();
    if (response.success && response.data) {
      return response.data.platformStatistics;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch platform statistics:', error);
    return null;
  }
};

/**
 * Fetch scholarship statistics
 */
export const fetchScholarshipStatistics = async () => {
  try {
    const response = await statisticsApi.getScholarshipStats();
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch scholarship statistics:', error);
    return null;
  }
};

/**
 * Fetch historical applications for analytics
 */
export const fetchHistoricalApplications = async (): Promise<HistoricalApplication[]> => {
  // Historical applications are managed by the backend
  // This returns an empty array as analytics now come from the API
  return [];
};

// ============================================================================
// Prediction API
// ============================================================================

/**
 * Get prediction for a specific scholarship
 */
export const getPrediction = async (
  studentId: string,
  scholarshipId: string
): Promise<{ probability: number; factors: Array<{ factor: string; weight: number; impact: string }> }> => {
  try {
    const response = await predictionApi.getProbability(scholarshipId);
    if (response.success && response.data) {
      const data = response.data as any;
      return {
        probability: data.probability || 0.5,
        factors: data.factors?.map((f: any) => ({
          factor: f.factor,
          weight: f.weight,
          impact: f.contribution > 0 ? 'positive' : 'negative'
        })) || []
      };
    }
    return { probability: 0.5, factors: [] };
  } catch (error) {
    console.error('Failed to get prediction:', error);
    return { probability: 0.5, factors: [] };
  }
};

// ============================================================================
// Export API client
// ============================================================================

export const api = {
  scholarships: {
    getAll: fetchScholarships,
    getById: fetchScholarshipDetails,
    search: searchScholarships
  },
  users: {
    getById: fetchUserInformation,
    register: registerUser,
    login: loginUser,
    update: updateUserProfile
  },
  applications: {
    submit: submitApplication,
    getByUser: getUserApplications
  },
  analytics: {
    getPlatformStats: fetchPlatformStatistics,
    getScholarshipStats: fetchScholarshipStatistics,
    getHistoricalData: fetchHistoricalApplications
  },
  predictions: {
    get: getPrediction
  }
};

export default api;

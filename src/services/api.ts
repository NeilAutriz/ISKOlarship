// ============================================================================
// ISKOlarship - API Service
// API client for backend communication (currently using mock data)
// ============================================================================

import { scholarships, getScholarshipById, getActiveScholarships } from '../data/scholarships';
import { historicalApplications, scholarshipStatistics, platformStatistics } from '../data/mockHistoricalData';
import { Scholarship, StudentProfile, HistoricalApplication } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Scholarship API
// ============================================================================

/**
 * Fetch all scholarships
 * Currently uses mock data - will connect to backend in production
 */
export const fetchScholarships = async (): Promise<Scholarship[]> => {
  await delay(100); // Simulate network delay
  return getActiveScholarships();
};

/**
 * Fetch scholarship by ID
 */
export const fetchScholarshipDetails = async (id: string): Promise<Scholarship | null> => {
  await delay(100);
  return getScholarshipById(id) || null;
};

/**
 * Search scholarships
 */
export const searchScholarships = async (query: string): Promise<Scholarship[]> => {
  await delay(100);
  const lowercaseQuery = query.toLowerCase();
  return scholarships.filter(s =>
    s.name.toLowerCase().includes(lowercaseQuery) ||
    s.sponsor.toLowerCase().includes(lowercaseQuery) ||
    s.description?.toLowerCase().includes(lowercaseQuery)
  );
};

// ============================================================================
// User API
// ============================================================================

/**
 * Fetch user information
 */
export const fetchUserInformation = async (userId: string): Promise<StudentProfile | null> => {
  await delay(100);
  // Mock user data - in production, this would fetch from the database
  return null;
};

/**
 * Register a new user
 */
export const registerUser = async (userData: Partial<StudentProfile>): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  await delay(200);
  // Mock registration - in production, this would create a user in the database
  return {
    success: true,
    user: userData as StudentProfile
  };
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  await delay(200);
  // Mock login - in production, this would authenticate against the backend
  return {
    success: false,
    error: 'Invalid credentials. Try using the demo login.'
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<StudentProfile>): Promise<{ success: boolean; user?: StudentProfile; error?: string }> => {
  await delay(200);
  return {
    success: true,
    user: updates as StudentProfile
  };
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
  await delay(300);
  return {
    success: true,
    applicationId: `app-${Date.now()}`
  };
};

/**
 * Get user applications
 */
export const getUserApplications = async (userId: string): Promise<HistoricalApplication[]> => {
  await delay(100);
  return historicalApplications.filter(app => app.studentId === userId);
};

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Fetch platform statistics
 */
export const fetchPlatformStatistics = async () => {
  await delay(100);
  return platformStatistics;
};

/**
 * Fetch scholarship statistics
 */
export const fetchScholarshipStatistics = async () => {
  await delay(100);
  return scholarshipStatistics;
};

/**
 * Fetch historical applications for analytics
 */
export const fetchHistoricalApplications = async (): Promise<HistoricalApplication[]> => {
  await delay(100);
  return historicalApplications;
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
  await delay(150);
  // This would call the backend prediction service in production
  // Currently, prediction is done client-side
  return {
    probability: 0.75,
    factors: []
  };
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
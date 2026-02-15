// ============================================================================
// ISKOlarship - Main Application Component
// Web-Based Scholarship Platform Using Rule-Based Filtering and Logistic Regression
// ============================================================================

import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import StudentHeader from './components/StudentHeader';
import AdminHeader from './components/AdminHeader';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ProfileCompletion, { ProfileData } from './components/ProfileCompletion';
import AdminProfileCompletion, { AdminProfileData } from './components/AdminProfileCompletion';
import { authApi, userApi, clearTokens, getAccessToken, API_SERVER_URL } from './services/apiClient';

// Public Pages
import Home from './pages/Home';
import Scholarships from './pages/Scholarships';
import ScholarshipDetails from './pages/ScholarshipDetails';
import PredictionExplanation from './pages/PredictionExplanation';
import Analytics from './pages/Analytics';

// Student Pages
import { 
  StudentDashboard, 
  StudentApplications, 
  StudentProfile as StudentProfilePage,
  ApplyScholarship
} from './pages/student';

// Admin Pages
import { 
  AdminDashboard, 
  Applicants, 
  AdminScholarships, 
  AdminProfile as AdminProfilePage,
  AddScholarship
} from './pages/admin';
import ScholarshipApplicants from './pages/admin/ScholarshipApplicants';
import ApplicationReview from './pages/admin/ApplicationReview';
import ModelTraining from './pages/admin/ModelTraining';

import './styles/globals.css';

import { StudentProfile as StudentProfileType, AdminProfile as AdminProfileType, User, UserRole, YearLevel, UPLBCollege, STBracket, AdminAccessLevel } from './types';

// ============================================================================
// AUTH CONTEXT
// ============================================================================

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userRole: UserRole;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  openAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get user's display name from various user object structures
const getUserDisplayName = (userData: User | any | null | undefined, fallback: string = 'User'): string => {
  if (!userData) return fallback;
  // Try direct firstName (for frontend-normalized users)
  if (userData.firstName) return userData.firstName;
  // Try nested studentProfile (from backend API response)
  if (userData.studentProfile?.firstName) return userData.studentProfile.firstName;
  // Try nested adminProfile (from backend API response)
  if (userData.adminProfile?.firstName) return userData.adminProfile.firstName;
  return fallback;
};

// ============================================================================
// MOCK USER FOR DEMO
// ============================================================================

const createMockStudent = (): StudentProfileType => ({
  id: 'student-001',
  email: 'juan.delacruz@up.edu.ph',
  role: UserRole.STUDENT,
  createdAt: new Date('2024-08-01'),
  updatedAt: new Date(),
  
  // Personal Information
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  middleName: 'Santos',
  contactNumber: '09171234567',
  address: {
    province: 'Laguna',
    city: 'Los Baños',
    barangay: 'Batong Malake',
    street: '123 University Ave',
    zipCode: '4031'
  },
  hometown: 'Laguna',
  
  // Academic Information
  studentNumber: '2021-12345',
  college: UPLBCollege.CAS,
  course: 'BS Biology',
  yearLevel: YearLevel.JUNIOR,
  gwa: 1.85,
  unitsEnrolled: 18,
  expectedGraduationDate: new Date('2026-06-30'),
  hasApprovedThesis: false,
  
  // Financial Information
  annualFamilyIncome: 180000,
  householdSize: 5,
  stBracket: STBracket.PD80,
  
  // Scholarship Status
  isScholarshipRecipient: false,
  currentScholarships: [],
  hasThesisGrant: false,
  
  // Disciplinary Record
  hasDisciplinaryAction: false,
  
  // Profile Completion
  profileCompleted: true,
  lastUpdated: new Date()
});

// Mock Admin User for Demo
const createMockAdmin = (): AdminProfileType => ({
  id: 'admin-001',
  email: 'admin@iskolarship.ph',
  role: UserRole.ADMIN,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
  
  firstName: 'Admin',
  lastName: 'User',
  department: 'Scholarship Management',
  college: UPLBCollege.CAS,
  accessLevel: AdminAccessLevel.UNIVERSITY,
  permissions: ['manage_scholarships', 'review_applications', 'view_analytics', 'manage_users']
});

// ============================================================================
// APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingRole, setPendingRole] = useState<'student' | 'admin'>('student');
  const [navigateAfterLogin, setNavigateAfterLogin] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Auto dismiss after 5 seconds
  };

  // Initialize auth state from stored token
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const response = await authApi.getMe();
          if (isMounted && response.success && response.data?.user) {
            const userData = response.data.user as User;
            setUser(userData);
            setIsAuthenticated(true);
            setUserRole(userData.role);
          }
        } catch (error) {
          if (isMounted) {
            console.error('Failed to restore auth session:', error);
            clearTokens();
          }
        }
      }
      if (isMounted) setIsInitializing(false);
    };
    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setUserRole(userData.role);
  };

  const logout = async () => {
    const userName = getUserDisplayName(user);
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      setUserRole(UserRole.GUEST);
      showToast(`👋 Goodbye, ${userName}! You've been successfully logged out.`, 'info');
    }
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates } as User);
    }
  };

  // Handle sign in using backend API
  const handleSignIn = async (email: string, password: string, role: 'student' | 'admin') => {
    try {
      const response = await authApi.login(email, password);
      
      if (response.success && response.data?.user) {
        const userData = response.data.user as User;
        
        // Check if the user role matches the selected role
        if ((role === 'admin' && userData.role !== UserRole.ADMIN) ||
            (role === 'student' && userData.role !== UserRole.STUDENT)) {
          throw new Error(`Invalid credentials for ${role} login`);
        }
        
        login(userData);
        setShowAuthModal(false);
        setNavigateAfterLogin(role === 'admin' ? '/admin/dashboard' : '/dashboard');
        showToast(`Welcome back, ${getUserDisplayName(userData)}!`, 'success');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  // Handle sign up using backend API
  const handleSignUp = async (email: string, password: string, role: 'student' | 'admin') => {
    try {
      // For new users, show profile completion first
      // Store password for use in profile completion
      setPendingEmail(email);
      setPendingPassword(password);
      setPendingRole(role);
      setShowAuthModal(false);
      setShowProfileCompletion(true);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  // Handle profile completion - register user with API
  const handleProfileComplete = async (profileData: ProfileData) => {
    console.log('=== Student Registration Flow ===');
    console.log('Profile Data:', profileData);
    console.log('Pending Email:', pendingEmail);
    console.log('Pending Role:', pendingRole);
    console.log('Password provided:', pendingPassword ? 'Yes (length: ' + pendingPassword.length + ')' : 'No');
    
    try {
      // Use the provided name fields directly
      const firstName = profileData.firstName || 'User';
      const lastName = profileData.lastName || 'Student';
      const middleName = profileData.middleName || '';
      
      console.log('Parsed name:', { firstName, middleName, lastName });
      
      // First, register the user with the password from signup form
      const registrationData = {
        email: profileData.email,
        password: pendingPassword, // Use the password from the signup form
        firstName,
        lastName,
        middleName,
        role: pendingRole
      };
      
      console.log('Registration payload:', { ...registrationData, password: '[HIDDEN]' });
      
      const response = await authApi.register(registrationData);
      
      console.log('Registration response:', response);
      
      if (response.success && response.data?.user) {
        console.log('✅ User registered successfully:', response.data.user.email);
        
        // Build the profile update WITHOUT documents (optimized approach)
        const profileUpdate = {
          firstName,
          lastName,
          phone: profileData.contactNumber,
          studentProfile: {
            studentNumber: profileData.studentNumber,
            firstName,
            middleName,
            lastName,
            contactNumber: profileData.contactNumber,
            birthDate: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
            gender: profileData.gender,
            homeAddress: {
              street: profileData.street || '',
              barangay: profileData.barangay || '',
              city: profileData.city || '',
              province: profileData.provinceOfOrigin || '',
              zipCode: profileData.zipCode || '',
              fullAddress: `${profileData.street || ''}, ${profileData.barangay || ''}, ${profileData.city || ''}, ${profileData.provinceOfOrigin || ''} ${profileData.zipCode || ''}`.trim()
            },
            provinceOfOrigin: profileData.provinceOfOrigin,
            college: profileData.college,
            collegeCode: profileData.collegeCode || undefined,
            academicUnit: profileData.academicUnit || undefined,
            academicUnitCode: profileData.academicUnitCode || undefined,
            course: profileData.course,
            classification: profileData.yearLevel,
            gwa: parseFloat(profileData.gwa) || 0,
            unitsEnrolled: parseInt(profileData.unitsEnrolled) || 0,
            unitsPassed: parseInt(profileData.unitsPassed) || 0,
            annualFamilyIncome: parseInt(profileData.annualFamilyIncome) || 0,
            householdSize: parseInt(profileData.householdSize) || 1,
            stBracket: profileData.stBracket,
            citizenship: profileData.citizenship || 'Filipino',
            hasExistingScholarship: profileData.hasExistingScholarship,
            hasThesisGrant: profileData.hasThesisGrant,
            hasDisciplinaryAction: profileData.hasDisciplinaryAction,
            profileCompleted: true
          }
        };
        
        // DEBUG: Log college/academicUnit data
        console.log('🏫 College/Academic Unit data being sent:');
        console.log('  - college:', profileData.college);
        console.log('  - collegeCode:', profileData.collegeCode);
        console.log('  - academicUnit:', profileData.academicUnit);
        console.log('  - academicUnitCode:', profileData.academicUnitCode);
        console.log('📤 Full studentProfile:', JSON.stringify(profileUpdate.studentProfile, null, 2));
        
        console.log('📝 Updating profile with basic information...');
        
        // Update profile WITHOUT documents first (much faster!)
        const updateResponse = await userApi.updateProfile(profileUpdate);
        
        if (!updateResponse.success) {
          throw new Error(updateResponse.message || 'Profile update failed');
        }
        
        console.log('✅ Profile updated successfully');
        
        // CRITICAL DEBUG: Check what we received
        console.log('🔍 CRITICAL DEBUG - Full profileData:', {
          hasDocuments: !!profileData.documents,
          documentsLength: profileData.documents?.length,
          documents: profileData.documents
        });
        
        // Check each document individually
        if (profileData.documents && profileData.documents.length > 0) {
          console.log('📋 DOCUMENT ANALYSIS:');
          profileData.documents.forEach((doc, idx) => {
            console.log(`  Document ${idx}:`, {
              name: doc.name,
              type: doc.type,
              uploaded: doc.uploaded,
              hasFile: !!doc.file,
              fileIsNull: doc.file === null,
              fileIsUndefined: doc.file === undefined,
              fileType: typeof doc.file,
              fileName: doc.file?.name,
              fileSize: doc.file?.size
            });
          });
        } else {
          console.error('❌ CRITICAL: profileData.documents is empty or undefined!');
        }
        
        // Now upload documents separately using optimized approach
        const documentsToUpload = (profileData.documents || [])
          .filter(doc => {
            const hasFile = doc.uploaded && doc.file;
            console.log(`Filter check for "${doc.name}": uploaded=${doc.uploaded}, hasFile=${!!doc.file}, passes=${hasFile}`);
            return hasFile;
          })
          .map(doc => ({
            file: doc.file!,
            name: doc.name,
            type: doc.type
          }));

        console.log('📤 documentsToUpload length:', documentsToUpload.length);
        console.log('📤 documentsToUpload:', documentsToUpload);

        if (documentsToUpload.length > 0) {
          console.log(`📤 Uploading ${documentsToUpload.length} document(s) using optimized method...`);
          
          try {
            // Import the upload function dynamically
            const { uploadDocuments } = await import('./services/documentUpload');
            const uploadResult = await uploadDocuments(documentsToUpload);
            
            if (uploadResult.success) {
              console.log(`✅ Successfully uploaded ${documentsToUpload.length} document(s)`);
              
              // IMPORTANT: Fetch updated user profile to get documents in the session
              try {
                const meResponse = await authApi.getMe();
                if (meResponse.success && meResponse.data?.user) {
                  console.log('✅ Fetched updated user with documents');
                  // Use the fresh user data with documents
                  login(meResponse.data.user as User);
                  setShowProfileCompletion(false);
                  setNavigateAfterLogin(pendingRole === 'admin' ? '/admin/dashboard' : '/dashboard');
                  showToast(`🎉 Welcome to ISKOlarship, ${firstName}! Your student account has been created successfully.`, 'success');
                  return; // Exit early since we've already logged in
                }
              } catch (fetchError) {
                console.error('⚠️ Could not fetch updated user, using existing data');
              }
            } else {
              console.error('⚠️ Document upload failed:', uploadResult.message);
              // Don't fail the whole registration - documents can be uploaded later
              showToast('Profile created, but some documents failed to upload. You can upload them later from your profile.', 'info');
            }
          } catch (uploadError: any) {
            console.error('❌ Document upload error:', uploadError);
            // Continue with login even if document upload fails
            showToast('Profile created successfully. Documents can be uploaded later from your profile.', 'info');
          }
        } else {
          console.log('ℹ️ No documents to upload');
        }
        
        // Use the UPDATED user from updateProfile response (fallback if no documents or upload failed)
        const updatedUser = updateResponse.data || response.data.user;
        
        console.log('Final user data for login:', updatedUser);
        
        login(updatedUser as User);
        setShowProfileCompletion(false);
        setNavigateAfterLogin(pendingRole === 'admin' ? '/admin/dashboard' : '/dashboard');
        showToast(`🎉 Welcome to ISKOlarship, ${firstName}! Your student account has been created successfully.`, 'success');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Parse error message from different sources
      const errorMessage = error.response?.data?.message || error.message || '';
      const errorData = error.response?.data?.error || '';
      
      // Check for duplicate student number error (MongoDB E11000)
      if (errorMessage.includes('E11000') || errorMessage.includes('duplicate key') || 
          errorMessage.includes('studentNumber') || errorData.includes('studentNumber')) {
        throw new Error('This student number is already registered in the system. Please use a different student number or contact support if this is an error.');
      }
      
      // Check if it's a duplicate email error
      if (errorMessage.includes('already exists') || error.response?.status === 409) {
        showToast('An account with this email already exists. Please sign in instead.', 'error');
        setShowProfileCompletion(false);
        setShowAuthModal(true);
        return;
      }
      
      // Re-throw the error to be handled by ProfileCompletion
      throw error;
    }
  };

  // Handle admin profile completion - register admin with API
  const handleAdminProfileComplete = async (profileData: AdminProfileData) => {
    console.log('=== Admin Registration Flow ===');
    console.log('Profile Data:', profileData);
    console.log('Pending Email:', pendingEmail);
    console.log('Pending Role:', pendingRole);
    
    try {
      // Use the provided name fields directly
      const firstName = profileData.firstName || 'Admin';
      const lastName = profileData.lastName || 'User';
      const middleName = profileData.middleName || '';
      
      // First, register the admin user
      const registrationData = {
        email: profileData.email,
        password: pendingPassword,
        firstName,
        lastName,
        middleName,
        role: 'admin' as 'admin' | 'student'
      };
      
      console.log('Admin registration payload:', { ...registrationData, password: '[HIDDEN]' });
      
      const response = await authApi.register(registrationData);
      
      console.log('Admin registration response:', response);
      
      if (response.success && response.data?.user) {
        // Upload employee ID document if provided
        if (profileData.employeeIdDocument.file) {
          console.log('📤 Uploading employee ID document...');
          const formData = new FormData();
          formData.append('documents', profileData.employeeIdDocument.file);
          formData.append('documentTypes', 'employee_id');
          formData.append('documentNames', 'UPLB Employee ID');
          
          try {
            const uploadResponse = await fetch(`${API_SERVER_URL}/api/users/documents/upload`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${response.data.accessToken}`
              },
              body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            console.log('📋 Employee ID upload result:', uploadResult);
            
            if (uploadResult.success) {
              console.log('✅ Employee ID document uploaded and saved to adminProfile.employeeIdDocument');
            } else {
              console.error('❌ Employee ID upload failed:', uploadResult.message);
              throw new Error(uploadResult.message || 'Failed to upload employee ID');
            }
          } catch (uploadError) {
            console.error('❌ Failed to upload employee ID:', uploadError);
            throw new Error('Failed to upload employee ID document. Please try again.');
          }
        } else {
          throw new Error('Employee ID document is required');
        }
        
        // Build the admin profile update (document already saved during upload)
        const profileUpdate = {
          firstName,
          lastName,
          phone: profileData.contactNumber,
          // Admin profile data matching backend User.model.js structure
          adminProfile: {
            firstName,
            middleName,
            lastName,
            department: profileData.department || undefined,
            college: profileData.college || undefined,
            collegeCode: profileData.collegeCode || undefined,
            academicUnit: profileData.academicUnit || undefined,
            academicUnitCode: profileData.academicUnitCode || undefined,
            position: profileData.position,
            officeLocation: profileData.officeLocation,
            accessLevel: profileData.accessLevel,
            responsibilities: profileData.responsibilities,
            permissions: profileData.permissions,
            profileCompleted: true
          }
        };
        
        // DEBUG: Log college/academicUnit data for admin
        console.log('🏛️ Admin College/Academic Unit data being sent:');
        console.log('  - college:', profileData.college);
        console.log('  - collegeCode:', profileData.collegeCode);
        console.log('  - academicUnit:', profileData.academicUnit);
        console.log('  - academicUnitCode:', profileData.academicUnitCode);
        console.log('  - accessLevel:', profileData.accessLevel);
        console.log('Admin profile update payload:', JSON.stringify(profileUpdate, null, 2));
        
        // Update profile with complete data
        const updateResponse = await userApi.updateProfile(profileUpdate);
        console.log('Admin profile update response:', JSON.stringify(updateResponse, null, 2));
        
        // Use the UPDATED user from updateProfile response if available
        const updatedUser = updateResponse.success && updateResponse.data 
          ? updateResponse.data 
          : response.data.user;
        
        console.log('Final admin user data for login:', updatedUser);
        
        login(updatedUser as User);
        setShowProfileCompletion(false);
        setNavigateAfterLogin('/admin/dashboard');
        showToast(`🎉 Welcome to ISKOlarship, ${firstName}! Your administrator account has been created successfully.`, 'success');
      } else {
        throw new Error(response.message || 'Admin registration failed');
      }
    } catch (error: any) {
      console.error('Admin registration error:', error);
      
      // Parse error message
      const errorMessage = error.response?.data?.message || error.message || '';
      
      // Check if it's a duplicate email error
      if (errorMessage.includes('already exists') || error.response?.status === 409) {
        showToast('An account with this email already exists. Please sign in instead.', 'error');
        setShowProfileCompletion(false);
        setShowAuthModal(true);
        return;
      }
      
      // Re-throw the error to be handled by AdminProfileCompletion
      throw error;
    }
  };

  // For demo purposes, auto-login with mock user
  const handleDemoLogin = () => {
    const mockUser = createMockStudent();
    login(mockUser);
    setShowAuthModal(false);
    setNavigateAfterLogin('/dashboard');
    showToast(`👋 Welcome! You're using a demo account (${mockUser.firstName} ${mockUser.lastName})`, 'info');
  };

  // Open auth modal from header
  const handleOpenAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const authContextValue: AuthContextType = {
    isAuthenticated,
    user,
    userRole,
    login,
    logout,
    updateProfile,
    openAuthModal: handleOpenAuthModal
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={authContextValue}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
              <div className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border-l-4 max-w-md ${
                toast.type === 'error' ? 'bg-red-50 border-red-500' :
                toast.type === 'success' ? 'bg-green-50 border-green-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${
                  toast.type === 'error' ? 'text-red-500' :
                  toast.type === 'success' ? 'text-green-500' :
                'text-blue-500'
              }`}>
                {toast.type === 'error' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : toast.type === 'success' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  toast.type === 'error' ? 'text-red-800' :
                  toast.type === 'success' ? 'text-green-800' :
                  'text-blue-800'
                }`}>{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className={`flex-shrink-0 transition-colors ${
                  toast.type === 'error' ? 'text-red-400 hover:text-red-600' :
                  toast.type === 'success' ? 'text-green-400 hover:text-green-600' :
                  'text-blue-400 hover:text-blue-600'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Profile Completion Flow - Different forms for Student vs Admin */}
        {showProfileCompletion ? (
          pendingRole === 'admin' ? (
            <AdminProfileCompletion
              email={pendingEmail}
              onComplete={handleAdminProfileComplete}
              onCancel={() => setShowProfileCompletion(false)}
            />
          ) : (
            <ProfileCompletion
              email={pendingEmail}
              onComplete={handleProfileComplete}
              onCancel={() => setShowProfileCompletion(false)}
            />
          )
        ) : (
          <AppContent 
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            onOpenAuthModal={handleOpenAuthModal}
            onRequireAuth={handleOpenAuthModal}
            navigateAfterLogin={navigateAfterLogin}
            clearNavigateAfterLogin={() => setNavigateAfterLogin(null)}
          />
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onDemoLogin={handleDemoLogin}
        />
        
        {/* Toast Notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
};

// ============================================================================
// APP CONTENT COMPONENT (Separated to access useLocation inside Router)
// ============================================================================

interface AppContentProps {
  isAuthenticated: boolean;
  userRole: UserRole;
  onOpenAuthModal: () => void;
  onRequireAuth: () => void;
  navigateAfterLogin: string | null;
  clearNavigateAfterLogin: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ isAuthenticated, userRole, onOpenAuthModal, onRequireAuth, navigateAfterLogin, clearNavigateAfterLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle navigation after login
  React.useEffect(() => {
    if (navigateAfterLogin) {
      navigate(navigateAfterLogin);
      clearNavigateAfterLogin();
    }
  }, [navigateAfterLogin, navigate, clearNavigateAfterLogin]);
  
  // Student portal routes that should show StudentHeader
  const studentPortalRoutes = ['/dashboard', '/scholarships', '/my-applications', '/my-profile'];
  const isStudentPortalRoute = studentPortalRoutes.some(route => location.pathname.startsWith(route));
  
  // Admin portal routes that should show AdminHeader
  const adminPortalRoutes = ['/admin'];
  const isAdminPortalRoute = adminPortalRoutes.some(route => location.pathname.startsWith(route));
  
  // Determine which header to show
  const showStudentHeader = isAuthenticated && userRole === UserRole.STUDENT && isStudentPortalRoute;
  const showAdminHeader = isAuthenticated && userRole === UserRole.ADMIN && isAdminPortalRoute;

  // Determine the appropriate header
  const renderHeader = () => {
    if (showAdminHeader) {
      return <AdminHeader />;
    }
    if (showStudentHeader) {
      return <StudentHeader />;
    }
    return <Header onDemoLogin={onOpenAuthModal} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {renderHeader()}
      
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/scholarships" element={<Scholarships />} />
          <Route path="/scholarships/:id" element={<ScholarshipDetails />} />
          <Route path="/scholarships/:scholarshipId/prediction" element={<PredictionExplanation />} />
          
          {/* Protected Student Portal Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole={UserRole.STUDENT} onRequireAuth={onRequireAuth}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute requiredRole={UserRole.STUDENT} onRequireAuth={onRequireAuth}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/apply/:id" element={
            <ProtectedRoute requiredRole={UserRole.STUDENT} onRequireAuth={onRequireAuth}>
              <ApplyScholarship />
            </ProtectedRoute>
          } />
          <Route path="/applications/:applicationId/edit" element={
            <ProtectedRoute requiredRole={UserRole.STUDENT} onRequireAuth={onRequireAuth}>
              <ApplyScholarship />
            </ProtectedRoute>
          } />
          <Route path="/my-applications" element={
            <ProtectedRoute requiredRole={UserRole.STUDENT} onRequireAuth={onRequireAuth}>
              <StudentApplications />
            </ProtectedRoute>
          } />
          <Route path="/my-profile" element={
            <ProtectedRoute requiredRole={UserRole.STUDENT} onRequireAuth={onRequireAuth}>
              <StudentProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Protected Admin Portal Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/applicants" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <Applicants />
            </ProtectedRoute>
          } />
          <Route path="/admin/scholarships" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <AdminScholarships />
            </ProtectedRoute>
          } />
          <Route path="/admin/scholarships/add" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <AddScholarship />
            </ProtectedRoute>
          } />
          <Route path="/admin/scholarships/:id/edit" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <AddScholarship />
            </ProtectedRoute>
          } />
          <Route path="/admin/scholarships/:id/applicants" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <ScholarshipApplicants />
            </ProtectedRoute>
          } />
          <Route path="/admin/applications/:id" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <ApplicationReview />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <AdminProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/admin/model-training" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <ModelTraining />
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {!showStudentHeader && !showAdminHeader && <Footer />}
    </div>
  );
};

export { AuthContext };
export default App;
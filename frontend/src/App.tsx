// ============================================================================
// ISKOlarship - Main Application Component
// Web-Based Scholarship Platform Using Rule-Based Filtering and Logistic Regression
// ============================================================================

import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import StudentHeader from './components/StudentHeader';
import AdminHeader from './components/AdminHeader';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ProfileCompletion, { ProfileData } from './components/ProfileCompletion';
import { authApi, userApi, clearTokens, getAccessToken } from './services/apiClient';

// Public Pages
import Home from './pages/Home';
import Scholarships from './pages/Scholarships';
import ScholarshipDetails from './pages/ScholarshipDetails';
import Analytics from './pages/Analytics';

// Student Pages
import { 
  StudentDashboard, 
  StudentApplications, 
  StudentProfile as StudentProfilePage 
} from './pages/student';

// Admin Pages
import { 
  AdminDashboard, 
  Applicants, 
  AdminScholarships, 
  AdminProfile as AdminProfilePage 
} from './pages/admin';

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
  const [pendingRole, setPendingRole] = useState<'student' | 'admin'>('student');
  const [navigateAfterLogin, setNavigateAfterLogin] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const response = await authApi.getMe();
          if (response.success && response.data?.user) {
            const userData = response.data.user as User;
            setUser(userData);
            setIsAuthenticated(true);
            setUserRole(userData.role);
          }
        } catch (error) {
          console.error('Failed to restore auth session:', error);
          clearTokens();
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setUserRole(userData.role);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      setUserRole(UserRole.GUEST);
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
      setPendingEmail(email);
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
    console.log('Profile completed:', profileData);
    
    try {
      // Register user with the backend API
      const names = profileData.fullName.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(-1)[0] || '';
      
      // First, register the user
      const response = await authApi.register({
        email: profileData.email,
        password: 'tempPassword123!', // In a real app, this would come from the signup form
        firstName,
        lastName,
        role: pendingRole
      });
      
      if (response.success && response.data?.user) {
        // Then update the profile with complete information
        const profileUpdate = {
          firstName,
          lastName,
          studentNumber: profileData.studentNumber,
          contactNumber: profileData.contactNumber,
          address: {
            province: profileData.provinceOfOrigin,
            city: '',
            barangay: '',
            street: profileData.address,
            zipCode: ''
          },
          hometown: profileData.provinceOfOrigin,
          college: profileData.college as any,
          course: profileData.course,
          yearLevel: profileData.yearLevel as any,
          gwa: parseFloat(profileData.gwa),
          unitsEnrolled: parseInt(profileData.unitsEnrolled) || 0,
          annualFamilyIncome: parseInt(profileData.annualFamilyIncome),
          householdSize: parseInt(profileData.householdSize),
          stBracket: profileData.stBracket as any,
          isScholarshipRecipient: profileData.hasExistingScholarship,
          currentScholarships: profileData.hasExistingScholarship ? ['Existing'] : [],
          hasThesisGrant: false,
          hasDisciplinaryAction: false,
          profileCompleted: true,
          expectedGraduationDate: new Date(),
          lastUpdated: new Date()
        };
        
        // Update profile with complete data
        await userApi.updateProfile(profileUpdate);
        
        login(response.data.user as User);
        setShowProfileCompletion(false);
        setNavigateAfterLogin(pendingRole === 'admin' ? '/admin/dashboard' : '/dashboard');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // For demo purposes, fallback to mock user if API fails
      if (pendingRole === 'admin') {
        login(createMockAdmin());
      } else {
        login(createMockStudent());
      }
      setShowProfileCompletion(false);
      setNavigateAfterLogin(pendingRole === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
  };

  // For demo purposes, auto-login with mock user
  const handleDemoLogin = () => {
    login(createMockStudent());
    setShowAuthModal(false);
    setNavigateAfterLogin('/dashboard');
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
    <AuthContext.Provider value={authContextValue}>
      <Router>
        {/* Profile Completion Flow */}
        {showProfileCompletion ? (
          <ProfileCompletion
            email={pendingEmail}
            onComplete={handleProfileComplete}
            onCancel={() => setShowProfileCompletion(false)}
          />
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
      </Router>
    </AuthContext.Provider>
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
          <Route path="/admin/profile" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN} onRequireAuth={onRequireAuth}>
              <AdminProfilePage />
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
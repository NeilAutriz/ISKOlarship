// ============================================================================
// ISKOlarship - Main Application Component
// Web-Based Scholarship Platform Using Rule-Based Filtering and Logistic Regression
// ============================================================================

import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Scholarships from './pages/Scholarships';
import ScholarshipDetails from './pages/ScholarshipDetails';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import './styles/globals.css';

import { StudentProfile, UserRole, YearLevel, UPLBCollege, STBracket } from './types';

// ============================================================================
// AUTH CONTEXT
// ============================================================================

interface AuthContextType {
  isAuthenticated: boolean;
  user: StudentProfile | null;
  userRole: UserRole;
  login: (user: StudentProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<StudentProfile>) => void;
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

const createMockStudent = (): StudentProfile => ({
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

// ============================================================================
// APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);

  const login = (userData: StudentProfile) => {
    setUser(userData);
    setIsAuthenticated(true);
    setUserRole(userData.role);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(UserRole.GUEST);
  };

  const updateProfile = (updates: Partial<StudentProfile>) => {
    if (user) {
      setUser({ ...user, ...updates, lastUpdated: new Date() });
    }
  };

  // For demo purposes, auto-login with mock user
  const handleDemoLogin = () => {
    login(createMockStudent());
  };

  const authContextValue: AuthContextType = {
    isAuthenticated,
    user,
    userRole,
    login,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Header onDemoLogin={handleDemoLogin} />
          
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/scholarships" element={<Scholarships />} />
              <Route path="/scholarships/:id" element={<ScholarshipDetails />} />
              
              {/* Authenticated Routes */}
              <Route 
                path="/dashboard" 
                element={<Dashboard />}
              />
              <Route 
                path="/analytics" 
                element={<Analytics />}
              />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default App;
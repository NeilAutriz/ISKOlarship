// ============================================================================
// ISKOlarship - Protected Route Component
// Redirects unauthenticated users to home and triggers auth modal
// ============================================================================

import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  onRequireAuth: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  onRequireAuth 
}) => {
  const authContext = useContext(AuthContext);
  const location = useLocation();
  
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const isInitializing = authContext?.isInitializing ?? true;
  const userRole = authContext?.user?.role;

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      // Trigger auth modal when user tries to access protected route
      onRequireAuth();
    }
  }, [isAuthenticated, isInitializing, onRequireAuth]);

  // Still checking auth state - show loading spinner instead of redirecting
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to home
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && userRole !== requiredRole) {
    // Wrong role - redirect to appropriate dashboard
    if (userRole === UserRole.ADMIN) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

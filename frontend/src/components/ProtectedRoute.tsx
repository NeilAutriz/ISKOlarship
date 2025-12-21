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
  const userRole = authContext?.user?.role;

  useEffect(() => {
    if (!isAuthenticated) {
      // Trigger auth modal when user tries to access protected route
      onRequireAuth();
    }
  }, [isAuthenticated, onRequireAuth]);

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

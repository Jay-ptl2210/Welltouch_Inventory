import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, module, level = 'view' }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super user has access to everything
  if (user?.role === 'super_user') {
    return children;
  }

  // Check module permission
  if (module) {
    const userPermissions = user?.permissions || {};
    const modulePermission = userPermissions[module] || 'none';

    if (level === 'view') {
      if (modulePermission !== 'view' && modulePermission !== 'edit') {
        return <Navigate to="/" replace />; // Redirect to dashboard if no access
      }
    } else if (level === 'edit') {
      if (modulePermission !== 'edit') {
        return <Navigate to="/" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;

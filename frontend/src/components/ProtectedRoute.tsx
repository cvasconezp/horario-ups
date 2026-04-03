import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, usuario, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const roleMap: Record<string, string[]> = {
      admin: ['superadmin', 'coordinador'],
      docente: ['docente', 'superadmin', 'coordinador'],
    };
    const allowedRoles = roleMap[requiredRole] || [requiredRole];
    if (!usuario?.rol || !allowedRoles.includes(usuario.rol)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

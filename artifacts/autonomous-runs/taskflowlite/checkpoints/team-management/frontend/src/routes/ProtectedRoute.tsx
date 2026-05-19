import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading…</div>;
  }
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
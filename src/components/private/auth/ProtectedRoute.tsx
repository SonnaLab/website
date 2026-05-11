import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import type { AuthRole } from '@/services/api';
import { getDashboardPath } from '@/utils/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, the user role must match one of these. */
  roles?: AuthRole[];
  /** Path to redirect unauthenticated users to. Default: /sign-in */
  redirectTo?: string;
}

export function ProtectedRoute({ children, roles, redirectTo = '/sign-in' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-muted-foreground">
        <span className="animate-pulse">…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
}

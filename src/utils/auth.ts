import type { AuthRole } from '@/services/api';

/**
 * Returns the default dashboard path for a given role.
 * Used after sign-in and as fallback in ProtectedRoute.
 */
export function getDashboardPath(role: AuthRole | undefined | null): string {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'staff': return '/staff/dashboard';
    default:      return '/dashboard';
  }
}

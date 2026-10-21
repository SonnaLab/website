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

/** The profile as people read it (member.json profile.roles): a company's main contact is its « Manager ». */
export function roleKey(user: { role?: AuthRole | null; company_admin?: boolean } | null | undefined): string {
  if (!user?.role) return 'user';
  return user.role === 'user' && user.company_admin ? 'manager' : user.role;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiService,
  AUTH_STORAGE_KEYS,
  AuthRole,
  AuthUser,
  clearStoredAuth,
  getStoredAccessToken,
  getStoredUser,
  getStoredRefreshToken,
  persistAuth,
  saveImpersonationSnapshot,
  getImpersonationSnapshot,
  clearImpersonationSnapshot,
  adminUserToAuthUser,
} from '@/services/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  hasRole: (role: AuthRole) => boolean;
  signIn:  (email: string, password: string) => Promise<AuthUser>;
  signUp:  (payload: { email: string; password: string; first_name?: string; last_name?: string; language?: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** The admin whose session is stashed while impersonating someone else — null otherwise. */
  impersonatingAdmin: AuthUser | null;
  /** Swaps the active session for `userId`'s, stashing the admin's own tokens so it can be restored. */
  impersonate: (userId: string) => Promise<AuthUser>;
  /** Restores the admin's own session client-side — no API call needed. */
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(!!getStoredAccessToken());
  const [impersonatingAdmin, setImpersonatingAdmin] = useState<AuthUser | null>(() => getImpersonationSnapshot()?.user ?? null);
  const navigate                  = useNavigate();

  // On 401 from refresh: an impersonation session has no refresh token of
  // its own (see `impersonate` below), so it lands here the moment its
  // 15-minute access token expires — restore the admin's stashed session
  // instead of a hard sign-out, since it's still sitting there valid.
  // A normal (non-impersonated) session with a genuinely dead refresh token
  // falls through to the sign-in redirect exactly as before.
  useEffect(() => {
    apiService.setUnauthorizedHandler(() => {
      const snapshot = getImpersonationSnapshot();
      if (snapshot) {
        persistAuth(snapshot);
        clearImpersonationSnapshot();
        setImpersonatingAdmin(null);
        setUser(snapshot.user);
        navigate('/admin/users', { replace: true });
        return;
      }
      setUser(null);
      navigate('/sign-in', { replace: true });
    });
    return () => apiService.setUnauthorizedHandler(null);
  }, [navigate]);

  // Hydrate user from /me when we have a token but no user (e.g. cold reload).
  useEffect(() => {
    let cancelled = false;
    const token = getStoredAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiService.fetchMe()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) { clearStoredAuth(); setUser(null); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u } = await apiService.signIn({ email, password });
    // A fresh, explicit sign-in always starts a clean slate — never leave a
    // stale impersonation snapshot from a previous session lying around.
    clearImpersonationSnapshot();
    setImpersonatingAdmin(null);
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(async (payload: Parameters<typeof apiService.signUp>[0]) => {
    const { user: u } = await apiService.signUp(payload);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await apiService.signOut();
    clearImpersonationSnapshot();
    setImpersonatingAdmin(null);
    setUser(null);
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  const refreshMe = useCallback(async () => {
    const u = await apiService.fetchMe();
    setUser(u);
  }, []);

  // Admin-only in practice (the endpoint itself enforces it) — swaps the
  // active session for the target user's, after stashing the admin's own
  // tokens so `stopImpersonating` can restore them without another sign-in.
  const impersonate = useCallback(async (userId: string) => {
    const adminAccess  = getStoredAccessToken();
    const adminRefresh = getStoredRefreshToken();
    const adminUser    = getStoredUser();
    if (!adminAccess || !adminRefresh || !adminUser) {
      throw new Error('Missing admin session — cannot start impersonation');
    }

    const { access_token, user: targetAdminUser } = await apiService.adminImpersonateUser(userId);
    const targetUser = adminUserToAuthUser(targetAdminUser);

    saveImpersonationSnapshot({ access_token: adminAccess, refresh_token: adminRefresh, user: adminUser });
    // No refresh token for the impersonation session on purpose — see the
    // `impersonate` Rails action and the 401 handler above: when this
    // 15-minute access token expires, that handler restores the admin
    // snapshot instead of silently minting a fresh admin token here.
    localStorage.setItem(AUTH_STORAGE_KEYS.access, access_token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refresh);
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(targetUser));

    setImpersonatingAdmin(adminUser);
    setUser(targetUser);
    return targetUser;
  }, []);

  const stopImpersonating = useCallback(() => {
    const snapshot = getImpersonationSnapshot();
    if (!snapshot) return;
    persistAuth(snapshot);
    clearImpersonationSnapshot();
    setImpersonatingAdmin(null);
    setUser(snapshot.user);
    navigate('/admin/users', { replace: true });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff' || user?.role === 'admin',
    hasRole: (role: AuthRole) => user?.role === role,
    signIn, signUp, signOut, refreshMe,
    impersonatingAdmin, impersonate, stopImpersonating,
  }), [user, isLoading, signIn, signUp, signOut, refreshMe, impersonatingAdmin, impersonate, stopImpersonating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

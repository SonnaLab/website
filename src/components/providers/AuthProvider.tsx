import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiService,
  AuthRole,
  AuthUser,
  clearStoredAuth,
  getStoredAccessToken,
  getStoredUser,
} from '../../services/api';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(!!getStoredAccessToken());
  const navigate                  = useNavigate();

  // On 401 from refresh: kick to sign-in.
  useEffect(() => {
    apiService.setUnauthorizedHandler(() => {
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
    setUser(null);
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  const refreshMe = useCallback(async () => {
    const u = await apiService.fetchMe();
    setUser(u);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff' || user?.role === 'admin',
    hasRole: (role: AuthRole) => user?.role === role,
    signIn, signUp, signOut, refreshMe,
  }), [user, isLoading, signIn, signUp, signOut, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ContactFormInputs } from '../schemas/contactSchema';
import type { AnalyticsEvent, ConsentPayload } from '../types/analytics';

const API_BASE_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_BASE_PROD_URL || 'https://api.sonnalab.com'
  : import.meta.env.VITE_API_BASE_DEV_URL || 'http://localhost:4000';

// ---- Auth token storage helpers (single source of truth) ----
export const AUTH_STORAGE_KEYS = {
  access:  'auth_token',
  refresh: 'refresh_token',
  user:    'auth_user',
} as const;

export type AuthRole = 'user' | 'staff' | 'admin';
export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: AuthRole;
  language?: string;
  confirmed_at?: string | null;
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.access);
}
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.refresh);
}
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.user);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
export function persistAuth(payload: { access_token: string; refresh_token: string; user: AuthUser }) {
  localStorage.setItem(AUTH_STORAGE_KEYS.access,  payload.access_token);
  localStorage.setItem(AUTH_STORAGE_KEYS.refresh, payload.refresh_token);
  localStorage.setItem(AUTH_STORAGE_KEYS.user,    JSON.stringify(payload.user));
}
export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.access);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refresh);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

class ApiService {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });

    // Intercepteur de requête
    this.client.interceptors.request.use(
      (config) => {
        const token = getStoredAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log en dev
        if (import.meta.env.DEV) {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur de réponse — 401 → token refresh + retry (single-flight)
    this.client.interceptors.response.use(
      (response) => {
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.url}`, response.data);
        }
        return response;
      },
      async (error: AxiosError) => {
        const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
        const status   = error.response?.status;

        if (status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
          original._retried = true;
          try {
            const newToken = await this.refreshAccessToken();
            original.headers = original.headers ?? {};
            (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            return this.client.request(original);
          } catch (refreshErr) {
            clearStoredAuth();
            this.onUnauthorized?.();
            return Promise.reject(refreshErr);
          }
        }

        if (error.response) {
          console.error('❌ API Error:', error.response.status, error.response.data);
        } else if (error.request) {
          console.error('❌ Network Error:', error.message);
        } else {
          console.error('❌ Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== Auth ====================

  setUnauthorizedHandler(handler: (() => void) | null) {
    this.onUnauthorized = handler;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;

    const refresh = getStoredRefreshToken();
    if (!refresh) throw new Error('No refresh token');

    this.refreshPromise = axios
      .post(`${API_BASE_URL}/api/v1/auth/refresh`, { refresh_token: refresh }, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        withCredentials: true,
      })
      .then((res) => {
        const { access_token, refresh_token, user } = res.data as {
          access_token: string; refresh_token: string; user: AuthUser;
        };
        persistAuth({ access_token, refresh_token, user });
        return access_token;
      })
      .finally(() => { this.refreshPromise = null; });

    return this.refreshPromise;
  }

  async signUp(payload: { email: string; password: string; first_name?: string; last_name?: string; language?: string }) {
    const res = await this.client.post('/api/v1/auth/sign_up', { user: payload });
    persistAuth(res.data);
    return res.data as { access_token: string; refresh_token: string; user: AuthUser };
  }

  async signIn(payload: { email: string; password: string }) {
    const res = await this.client.post('/api/v1/auth/sign_in', payload);
    persistAuth(res.data);
    return res.data as { access_token: string; refresh_token: string; user: AuthUser };
  }

  async signOut() {
    const refresh = getStoredRefreshToken();
    try {
      if (refresh) await this.client.delete('/api/v1/auth/sign_out', { data: { refresh_token: refresh } });
    } finally {
      clearStoredAuth();
    }
  }

  async fetchMe() {
    const res = await this.client.get('/api/v1/auth/me');
    return res.data.user as AuthUser;
  }

  async requestPasswordReset(email: string) {
    const res = await this.client.post('/api/v1/auth/password', { email });
    return res.data;
  }

  async resetPassword(token: string, password: string) {
    const res = await this.client.patch('/api/v1/auth/password', { token, password });
    return res.data;
  }

  async requestEmailConfirmation(email: string) {
    const res = await this.client.post('/api/v1/auth/confirm', { email });
    return res.data;
  }

  async verifyEmailConfirmation(token: string) {
    const res = await this.client.post('/api/v1/auth/confirm/verify', { token });
    return res.data;
  }

  // ==================== Member: Appointments ====================

  async listAppointments(params?: { status?: string; page?: number }) {
    const res = await this.client.get('/api/v1/appointments', { params });
    return res.data;
  }
  async createAppointment(payload: any) {
    const res = await this.client.post('/api/v1/appointments', { appointment: payload });
    return res.data;
  }
  async cancelAppointment(id: string, reason?: string) {
    const res = await this.client.delete(`/api/v1/appointments/${id}`, { data: { reason } });
    return res.data;
  }

  // ==================== Member: Projects ====================

  async listProjects() {
    const res = await this.client.get('/api/v1/projects', { params: { include_associations: false } });
    return res.data;
  }
  async getProject(id: string) {
    const res = await this.client.get(`/api/v1/projects/${id}`, { params: { include_associations: true } });
    return res.data;
  }

  // ==================== Member: Billing ====================

  async listQuotes()   { return (await this.client.get('/api/v1/quotes')).data; }
  async getQuote(id: string)   { return (await this.client.get(`/api/v1/quotes/${id}`)).data; }
  async acceptQuote(id: string){ return (await this.client.post(`/api/v1/quotes/${id}/accept`)).data; }
  async rejectQuote(id: string){ return (await this.client.post(`/api/v1/quotes/${id}/reject`)).data; }

  async listInvoices() { return (await this.client.get('/api/v1/invoices')).data; }
  async getInvoice(id: string) { return (await this.client.get(`/api/v1/invoices/${id}`)).data; }

  // ==================== Admin ====================

  async adminInfrastructure()       { return (await this.client.get('/api/v1/admin/infrastructure')).data; }
  async adminInfrastructureHealth() { return (await this.client.get('/api/v1/admin/infrastructure/health')).data; }

  async adminTrackingOverview(params?: { start_date?: string; end_date?: string }) {
    return (await this.client.get('/api/v1/admin/tracking/overview', { params })).data;
  }
  async adminTrackingRealtime() { return (await this.client.get('/api/v1/admin/tracking/realtime')).data; }
  async adminTrackingSessions(params?: { page?: number; per_page?: number; consented?: 'true'; device?: string }) {
    return (await this.client.get('/api/v1/admin/tracking/sessions', { params })).data;
  }
  async adminTrackingSession(id: string) { return (await this.client.get(`/api/v1/admin/tracking/sessions/${id}`)).data; }
  async adminTrackingFunnel(params?: { start_date?: string; end_date?: string }) {
    return (await this.client.get('/api/v1/admin/tracking/funnel', { params })).data;
  }
  async adminTrackingGeo(params?: { start_date?: string; end_date?: string }) {
    return (await this.client.get('/api/v1/admin/tracking/geo', { params })).data;
  }

  async adminOuouConversations()                              { return (await this.client.get('/api/v1/admin/ouou/conversations')).data; }
  async adminOuouConversation(id: string)                     { return (await this.client.get(`/api/v1/admin/ouou/conversations/${id}`)).data; }
  async adminOuouCreateConversation(payload: { title?: string; provider?: string; model?: string; system_prompt?: string }) {
    return (await this.client.post('/api/v1/admin/ouou/conversations', { conversation: payload })).data;
  }
  async adminOuouSendMessage(id: string, content: string)     {
    return (await this.client.post(`/api/v1/admin/ouou/conversations/${id}/messages`, { message: { content } })).data;
  }
  async adminOuouArchive(id: string)                          { return (await this.client.post(`/api/v1/admin/ouou/conversations/${id}/archive`)).data; }
  async adminOuouQuota()                                      { return (await this.client.get('/api/v1/admin/ouou/quota')).data; }
  async adminOuouModels()                                     { return (await this.client.get('/api/v1/admin/ouou/models')).data; }

  async adminSeoPages(params?: { locale?: string }) { return (await this.client.get('/api/v1/admin/seo/pages', { params })).data; }
  async adminSeoPage(id: string)                    { return (await this.client.get(`/api/v1/admin/seo/pages/${id}`)).data; }
  async adminSeoCreatePage(payload: any)            { return (await this.client.post('/api/v1/admin/seo/pages', { page: payload })).data; }
  async adminSeoUpdatePage(id: string, payload: any){ return (await this.client.patch(`/api/v1/admin/seo/pages/${id}`, { page: payload })).data; }
  async adminSeoDeletePage(id: string)              { return (await this.client.delete(`/api/v1/admin/seo/pages/${id}`)).data; }
  async adminSeoAuditPage(id: string)               { return (await this.client.post(`/api/v1/admin/seo/pages/${id}/audit`)).data; }
  async adminSeoKeywords(params?: { locale?: string; page_id?: string }) {
    return (await this.client.get('/api/v1/admin/seo/keywords', { params })).data;
  }
  async adminSeoCreateKeyword(payload: any) { return (await this.client.post('/api/v1/admin/seo/keywords', { keyword: payload })).data; }

  // ==================== Contact ====================
  
  async submitContactForm(data: ContactFormInputs) {
    try {
      const response = await this.client.post('/api/v1/contacts', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Cookie Consent ====================
  
  async sendCookieConsent(data: ConsentPayload) {
    try {
      const response = await this.client.post('/api/v1/analytics/consent', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Analytics ====================
  
  async sendAnalyticsEvents(events: AnalyticsEvent[], sessionData: {
    id: string;
    userId?: string;
    startTime: number;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    consentedAnalytics: boolean;
    consentedMarketing: boolean;
  }) {
    try {
      const response = await this.client.post('/api/v1/analytics/events', {
        events,
        session: sessionData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== New Project ====================
  
  async submitNewProject(data: any) {
    try {
      const response = await this.client.post('/api/v1/new/project', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Newsletter ====================
  
  async subscribeNewsletter(email: string, preferences?: { language?: string; topics?: string[] }) {
    try {
      const response = await this.client.post('/api/v1/newsletter/subscribe', {
        email,
        preferences
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Blog ====================
  
  async getBlogPosts(params?: { category?: string; limit?: number; offset?: number }) {
    try {
      const response = await this.client.get('/api/v1/blog/posts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getBlogPost(slug: string) {
    try {
      const response = await this.client.get(`/api/v1/blog/posts/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Utilities ====================
  
  getBaseUrl(): string {
    return API_BASE_URL;
  }

  isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

export const apiService = new ApiService();
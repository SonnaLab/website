import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ContactFormInputs } from '@/schemas/contactSchema';
import type { AnalyticsEvent, ConsentPayload } from '@/types/analytics';
import type { BlogPost } from '@/types/blog';
import type { Budget, ProjectType, Timeline } from '@/types/consultation';

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

export interface NewProjectPayload {
  projectType: ProjectType;
  description: string;
  budget?: Budget | null;
  timeline?: Timeline | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string | null;
  role?: string | null;
}

// ==================== News types ====================

export type ArticleStatus = 'draft' | 'published' | 'scheduled';

export interface Article {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  locale: string;
  author?: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
  excerpt?: string;
  content_markdown?: string;
  content_json?: Record<string, unknown>;
  seo_title?: string;
  meta_description?: string;
  feature_image?: string;
  feature_image_alt?: string;
  reading_time_minutes?: number;
  is_featured?: boolean;
  tags?: string[];
  category?: string;
  lesankofa_transaction_id?: string | null;
  lesankofa_metadata?: Record<string, unknown>;
  published_url?: string | null;
}

export interface ArticleImageOption {
  id: string;
  provider: string;
  url: string;
  url_regular?: string;
  url_full?: string;
  url_small?: string;
  download_url?: string;
  alt?: string;
  query?: string;
  credit?: Record<string, unknown>;
}

export interface NewsPrompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsAIPrompt {
  id: string;
  generation_id: number;
  client_id?: string | null;
  editorial_calendar_id?: number | null;
  keyword?: string | null;
  title?: string | null;
  locale?: string | null;
  country_id?: string | null;
  article_format?: string | null;
  status: string;
  push_status?: string | null;
  push_endpoint?: string | null;
  reason?: string | null;
  error_message?: string | null;
  push_error_message?: string | null;
  prompt_system?: string | null;
  prompt_user?: string | null;
  prompt_version?: string | null;
  seo_rules_snapshot?: Array<Record<string, unknown>> | null;
  generation_payload?: Record<string, unknown> | null;
  push_response?: Record<string, unknown> | null;
  model_used?: string | null;
  provider?: string | null;
  temperature?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  generation_time_ms?: number | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface WeeklyObjective {
  id: string;
  label: string;
  done: boolean;
  week_start?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsStrategy {
  id?: string;
  goals?: string[];
  keywords?: string[];
  themes?: string[];
  frequency?: string;
  updated_at?: string;
}

export interface CalendarEntry {
  id: string;
  title: string;
  date: string;
  status: ArticleStatus;
  locale?: string;
  article_id?: string;
}

export interface AICalendarItem {
  id: number;
  keyword: string;
  locale: string;
  topic_cluster?: string | null;
  article_format: string;
  content_angle?: string | null;
  suggested_title?: string | null;
  priority: number;
  scheduled_for: string;
  status: string;
  rationale?: string | null;
}

export interface StrategicObjective {
  id: number;
  client_id: string;
  objective_type: string;
  title: string;
  description: string;
  priority: number;
  weight: number;
  target_locales: string[];
  target_countries: string[];
  target_topics: string[];
  target_keywords: string[];
  target_formats: string[];
  target_phase: string;
  success_metrics: Record<string, number>;
  constraints: Record<string, unknown>;
  is_active: boolean;
  valid_from: string;
  valid_until?: string | null;
}

export interface BlogCategorySummary {
  id: string;
  label: string;
  count: number;
}

export interface BlogPostsResponse {
  posts: Omit<BlogPost, 'content'>[];
  categories: BlogCategorySummary[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.access);
}
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.refresh);
}
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.user);
  if (!raw || raw === 'undefined' || raw === 'null') {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    return null;
  }
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

// Endpoints that create/rotate tokens — never retry on 401 for these
function isTokenEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/sign_in') ||
    url.includes('/auth/sign_up') ||
    url.includes('/auth/sign_out')
  );
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

        if (status === 401 && original && !original._retried && !isTokenEndpoint(original.url)) {
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
          access_token: string; refresh_token: string; user?: AuthUser;
        };
        if (user) {
          persistAuth({ access_token, refresh_token, user });
        } else {
          // Backend didn't return user — only rotate the tokens, keep existing user
          localStorage.setItem(AUTH_STORAGE_KEYS.access,  access_token);
          localStorage.setItem(AUTH_STORAGE_KEYS.refresh, refresh_token);
        }
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

  // ── Cookies / Tracking (app/cookies dans api.sonnalab.com) ──
  async analyticsOverview(_site: string) {
    return (await this.client.get('/api/v1/admin/cookies/overview')).data;
  }
  async analyticsVisitors(_site: string, params?: { page?: number; per_page?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/visitors', { params })).data;
  }
  async analyticsSessions(_site: string, params?: { page?: number; per_page?: number; active_only?: boolean; visitor_id?: string }) {
    return (await this.client.get('/api/v1/admin/cookies/sessions', { params })).data;
  }
  async analyticsVisitorPages(_site: string, visitorId: string, params?: { limit?: number }) {
    return (await this.client.get(`/api/v1/admin/cookies/visitors/${visitorId}/pages`, { params })).data;
  }
  async analyticsVisitorSessions(_site: string, visitorId: string, params?: { per_page?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/sessions', { params: { visitor_id: visitorId, ...params } })).data;
  }
  async analyticsPages(_site: string, params?: { days?: number; limit?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/pages', { params })).data;
  }
  async analyticsReferrals(_site: string, params?: { days?: number; limit?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/referrals', { params })).data;
  }
  async analyticsGeo(_site: string, params?: { days?: number; limit?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/geo', { params })).data;
  }
  async analyticsDevices(_site: string, params?: { days?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/overview', { params })).data;
  }
  async botsOverview(_site: string) {
    return (await this.client.get('/api/v1/admin/cookies/bots/overview')).data;
  }
  async botsVisits(_site: string, params?: { page?: number; per_page?: number; bot_type?: string }) {
    return (await this.client.get('/api/v1/admin/cookies/bots/visits', { params })).data;
  }
  async consentAdmin(_site: string, params?: { page?: number; per_page?: number }) {
    return (await this.client.get('/api/v1/admin/cookies/consent', { params })).data;
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

  // ==================== Admin: News ====================

  async adminNewsArticles(params?: { status?: string; locale?: string; page?: number; per_page?: number; q?: string; generated?: boolean }) {
    return (await this.client.get('/api/v1/admin/news/articles', { params })).data;
  }
  async adminNewsArticle(id: string) { return (await this.client.get(`/api/v1/admin/news/articles/${id}`)).data; }
  async adminNewsCreateArticle(payload: Partial<Article>) { return (await this.client.post('/api/v1/admin/news/articles', { article: payload })).data; }
  async adminNewsUpdateArticle(id: string, payload: Partial<Article>) { return (await this.client.patch(`/api/v1/admin/news/articles/${id}`, { article: payload })).data; }
  async adminNewsDeleteArticle(id: string) { return (await this.client.delete(`/api/v1/admin/news/articles/${id}`)).data; }
  async adminNewsPublishArticle(id: string) { return (await this.client.post(`/api/v1/admin/news/articles/${id}/publish`)).data; }
  async adminNewsUnpublishArticle(id: string) { return (await this.client.post(`/api/v1/admin/news/articles/${id}/unpublish`)).data; }

  async adminNewsPrompts(params?: { category?: string }) { return (await this.client.get('/api/v1/admin/news/prompts', { params })).data; }
  async adminNewsCreatePrompt(payload: Partial<NewsPrompt>) { return (await this.client.post('/api/v1/admin/news/prompts', { prompt: payload })).data; }
  async adminNewsUpdatePrompt(id: string, payload: Partial<NewsPrompt>) { return (await this.client.patch(`/api/v1/admin/news/prompts/${id}`, { prompt: payload })).data; }
  async adminNewsDeletePrompt(id: string) { return (await this.client.delete(`/api/v1/admin/news/prompts/${id}`)).data; }

  async adminNewsAIPrompts(params?: { limit?: number }): Promise<{ prompts: NewsAIPrompt[] }> { return (await this.client.get('/api/v1/admin/news/ai-prompts', { params })).data; }
  async adminNewsAIPrompt(id: string): Promise<{ prompt: NewsAIPrompt }> { return (await this.client.get(`/api/v1/admin/news/ai-prompts/${id}`)).data; }
  async adminNewsRestartAIPrompt(id: string): Promise<{ generation: any; prompt: NewsAIPrompt }> { return (await this.client.post(`/api/v1/admin/news/ai-prompts/${id}/restart`)).data; }
  async adminNewsAIReviewPrompt(id: string, payload: { action: 'approve' | 'reject' | 'rebuild'; notes?: string }): Promise<any> { return (await this.client.patch(`/api/v1/admin/news/ai-prompts/${id}/review`, payload)).data; }
  async adminNewsDeleteAIPrompt(id: string): Promise<{ success: boolean }> { return (await this.client.delete(`/api/v1/admin/news/ai-prompts/${id}`)).data; }

  async adminNewsCalendar(params?: { year?: number; month?: number }) { return (await this.client.get('/api/v1/admin/news/calendar', { params })).data; }
  async adminNewsAICalendar(params?: { view?: 'weekly' | 'monthly' | 'daily'; week_start?: string; year?: number; month?: number; date?: string }) { return (await this.client.get('/api/v1/admin/news/ai-calendar', { params })).data; }
  async adminNewsAIApplyCalendarReview(payload: { week_start: string; max_items_per_client: number }): Promise<{ generation: any; items: AICalendarItem[] }> { return (await this.client.post('/api/v1/admin/news/ai-calendar/apply-review', payload)).data; }
  async adminNewsArticleImages(params: { query: string; locale?: string; limit?: number }): Promise<{ images: ArticleImageOption[] }> { return (await this.client.get('/api/v1/admin/news/article-images', { params, timeout: 30000 })).data; }
  async adminNewsAIGenerateArticle(item: AICalendarItem): Promise<{ event_status: string; generation: any; article?: Article | null }> { return (await this.client.post('/api/v1/admin/news/ai-calendar/generate-article', { item }, { timeout: 210000 })).data; }
  async adminNewsAIGenerateNextArticle(): Promise<{ event_status: string; generation: any; item: AICalendarItem; article?: Article | null }> { return (await this.client.post('/api/v1/admin/news/ai-calendar/generate-next-article', undefined, { timeout: 210000 })).data; }
  async adminNewsAIStrategicObjectives(): Promise<{ objectives: StrategicObjective[] }> { return (await this.client.get('/api/v1/admin/news/ai-strategic-objectives')).data; }

  async adminNewsStrategy() { return (await this.client.get('/api/v1/admin/news/strategy')).data; }
  async adminNewsSaveStrategy(payload: Partial<NewsStrategy>) { return (await this.client.patch('/api/v1/admin/news/strategy', { strategy: payload })).data; }

  async adminNewsObjectives() { return (await this.client.get('/api/v1/admin/news/objectives')).data; }
  async adminNewsCreateObjective(payload: Partial<WeeklyObjective>) { return (await this.client.post('/api/v1/admin/news/objectives', { objective: payload })).data; }
  async adminNewsUpdateObjective(id: string, payload: Partial<WeeklyObjective>) { return (await this.client.patch(`/api/v1/admin/news/objectives/${id}`, { objective: payload })).data; }
  async adminNewsDeleteObjective(id: string) { return (await this.client.delete(`/api/v1/admin/news/objectives/${id}`)).data; }

  async adminNewsStats() { return (await this.client.get('/api/v1/admin/news/stats')).data; }

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
  
  async submitNewProject(data: NewProjectPayload) {
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
  
  async getBlogPosts(params?: { category?: string; locale?: string; q?: string; page?: number; per_page?: number; limit?: number; offset?: number }): Promise<BlogPostsResponse> {
    try {
      const response = await this.client.get('/api/v1/blog/posts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getBlogPost(slug: string, params?: { locale?: string }): Promise<{ post: BlogPost }> {
    try {
      const response = await this.client.get(`/api/v1/blog/posts/${slug}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Utilities ====================

  // ──────────────────────────────────────────────────
  // Lesankofa AI — proxy via api.sonnalab.com/admin
  // Le frontend ne contacte JAMAIS ai.sonnalab.com directement.
  // ──────────────────────────────────────────────────
  async adminLesankofaModels()            { return (await this.client.get('/api/v1/admin/lesankofa/models')).data; }
  async adminLesankofaModelStats()        { return (await this.client.get('/api/v1/admin/lesankofa/models/stats')).data; }
  async adminLesankofaModel(id: string)   { return (await this.client.get(`/api/v1/admin/lesankofa/models/${id}`)).data; }
  async adminLesankofaClients()           { return (await this.client.get('/api/v1/admin/lesankofa/clients')).data; }
  async adminLesankofaClientDetail(id: string) { return (await this.client.get(`/api/v1/admin/lesankofa/clients/${id}`)).data; }
  async adminLesankofaTasks()             { return (await this.client.get('/api/v1/admin/lesankofa/tasks')).data; }
  async adminLesankofaContainers()        { return (await this.client.get('/api/v1/admin/lesankofa/containers')).data; }
  async adminLesankofaContainerLogs(id: string, lines = 100) { return (await this.client.get(`/api/v1/admin/lesankofa/containers/${id}/logs`, { params: { lines } })).data; }
  async adminLesankofaHistory(limit = 20) { return (await this.client.get('/api/v1/admin/lesankofa/history', { params: { limit } })).data; }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

export const apiService = new ApiService();
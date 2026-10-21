import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ContactFormInputs } from '@/schemas/contactSchema';
import type { AnalyticsEvent, ConsentPayload } from '@/types/analytics';
import type { BlogPost } from '@/types/blog';
import type { Budget, ProjectType, Timeline } from '@/types/consultation';
import type {
  BillingRecipient,
  TravauxClient,
  TravauxClientsListResponse,
  TravauxContract,
  TravauxInvoice,
  TravauxObjective,
  TravauxPayload,
  TravauxPayment,
  TravauxTask,
} from '@/types/travaux';

const API_BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_PROD_URL || 'https://api.sonnalab.com'
  : import.meta.env.VITE_API_BASE_DEV_URL || 'http://localhost:4000';

/** Fichiers servis par l'API (logos, pièces jointes Travaux) : chemins relatifs → URL absolue. */
export function apiAssetUrl(path: string | null | undefined): string | null {
  return path ? `${API_BASE_URL}${path}` : null;
}

/**
 * Corps multipart à la Rails : `{ root: { key: value } }` → `root[key]=value`.
 * `null` vide le champ côté API (""), `undefined` ne l'envoie pas, un tableau
 * vide envoie `root[key][]=` pour pouvoir tout détacher (ex. member_ids).
 */
function toFormData(root: string, payload: TravauxPayload): FormData {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      if (value.length === 0) form.append(`${root}[${key}][]`, '');
      value.forEach((v) => form.append(`${root}[${key}][]`, v));
    } else if (value instanceof File) {
      form.append(`${root}[${key}]`, value);
    } else {
      form.append(`${root}[${key}]`, value === null ? '' : String(value));
    }
  });
  return form;
}

// Sans ce Content-Type, axios 1.x reconvertit un FormData en JSON (fichiers perdus)
// à cause du Content-Type JSON par défaut de l'instance.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/** Nom de fichier depuis Content-Disposition (exposé par le CORS de l'API). */
function filenameFrom(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Déclenche le téléchargement d'un blob — à appeler depuis un handler (jamais au rendu, SSR). */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---- Auth token storage helpers (single source of truth) ----
export const AUTH_STORAGE_KEYS = {
  access:  'auth_token',
  refresh: 'refresh_token',
  user:    'auth_user',
  // Holds the admin's own {access_token, refresh_token, user} while an
  // impersonation session is active — never touched by clearStoredAuth(),
  // so "return to my admin account" (AuthProvider.stopImpersonating) can
  // restore it client-side, without another sign-in.
  impersonationSnapshot: 'admin_impersonation_snapshot',
} as const;

export type AuthRole = 'user' | 'staff' | 'admin';
export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: AuthRole;
  language?: string;
  phone?: string | null;
  company?: string | null;
  confirmed_at?: string | null;
}

export interface ProfilePayload {
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  language: string;
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
  /** fr/en: the language of the confirmation e-mail. */
  language?: string;
  sourcePage?: string;
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
  linkedin_post_text?: string;
  facebook_post_text?: string;
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
  attempt_count?: number | null;
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

// ==================== Admin: Users ====================

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  role: AuthRole;
  language: string | null;
  confirmed: boolean;
  locked: boolean;
  /** The client company (Travaux) the account belongs to, if any. */
  client_id: string | null;
  client_name: string | null;
  created_at: string;
  // Only present when fetched with full: true (show/create/update/lock/unlock/impersonate)
  phone?: string | null;
  company?: string | null;
  sign_in_count?: number;
  last_sign_in_at?: string | null;
  failed_attempts?: number;
  locked_at?: string | null;
}

export interface AdminUsersListResponse {
  users: AdminUser[];
  meta: { total: number; page: number; per_page: number; pages: number };
}

/** AdminUser (admin listing shape) → AuthUser (session shape) — used when an
 * impersonated user's record becomes the active session's `user`. */
export function adminUserToAuthUser(u: AdminUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name ?? undefined,
    last_name: u.last_name ?? undefined,
    role: u.role,
    language: u.language ?? undefined,
  };
}

export interface AdminUsersOverview {
  total: number;
  admins: number;
  staff: number;
  clients: number;
  confirmed: number;
  unconfirmed: number;
  locked: number;
  new_last_7_days: number;
  new_last_30_days: number;
  /** Client companies (Travaux) and the accounts attached to them. */
  companies: number;
  company_members: number;
  /** Sign-ups not attached to a company yet (tab « Acquisition »). */
  acquisition: number;
}

// ── Mailing ──
export interface MailingOverview {
  subscribers: { confirmed: number; pending: number; unsubscribed: number };
  campaigns: { total: number; sent: number };
  delivered_30d: number;
}

export interface MailingSubscriber {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  language: string;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  source: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  preferences: Record<'newsletter' | 'updates' | 'events', boolean>;
}

export interface MailingCampaign {
  id: string;
  name: string;
  category: 'newsletter' | 'updates' | 'events';
  audience: 'subscribers' | 'clients' | 'all';
  status: 'draft' | 'sending' | 'sent' | 'failed';
  hero: string | null;
  cta_url?: string | null;
  sent_at: string | null;
  recipients_count: number;
  delivered_count: number;
  failed_count: number;
  audience_count?: number;
  created_at: string;
  subject_fr: string | null; subject_en: string | null;
  preheader_fr?: string | null; preheader_en?: string | null;
  title_fr?: string | null; title_en?: string | null;
  body_fr?: string | null; body_en?: string | null;
  cta_label_fr?: string | null; cta_label_en?: string | null;
}

export interface EmailPreferences {
  email: string;
  language: string;
  subscribed: boolean;
  preferences: Record<'newsletter' | 'updates' | 'events', boolean>;
}

// ── Gestion de l'infrastructure ──
export interface InfraDatabase {
  version: string;
  size_bytes: number;
  connections: number;
  max_connections: number;
  cache_hit_ratio: number | null;
  started_at: string;
  latest_migration: string;
  tables: { name: string; rows: number; bytes: number; seq_scan: number; idx_scan: number | null; last_vacuum_at: string | null }[];
}

export interface InfraCronjob {
  name: string;
  cron: string;
  job_class: string;
  queue: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: 'ok' | 'failed' | null;
  last_duration_ms: number | null;
  last_message: string | null;
}

export interface InfraBackup { name: string; size_bytes: number; created_at: string }

export interface ActivityEntry {
  id: string;
  created_at: string;
  action_key: string;
  http_method: string | null;
  path: string | null;
  status: number | null;
  resource_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  impersonated: boolean;
  ip: string | null;
  details: Record<string, unknown>;
}

/** « Aperçu des mails »: an e-mail rendered on sample data (nothing sent). */
export interface MailPreview {
  subject: string;
  from: string | null;
  to: string[] | null;
  reply_to: string[] | null;
  html: string;
  text: string | null;
  attachments: { filename: string; size: number }[];
}

export interface AdminImpersonateResponse {
  access_token: string;
  user: AdminUser;
  impersonator: { id: string; email: string; full_name: string | null };
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.access);
}
export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.refresh);
}
export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
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

// ---- Impersonation snapshot (see AUTH_STORAGE_KEYS.impersonationSnapshot) ----
interface ImpersonationSnapshot { access_token: string; refresh_token: string; user: AuthUser }

export function saveImpersonationSnapshot(snapshot: ImpersonationSnapshot) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEYS.impersonationSnapshot, JSON.stringify(snapshot));
}
export function getImpersonationSnapshot(): ImpersonationSnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.impersonationSnapshot);
  if (!raw) return null;
  try { return JSON.parse(raw) as ImpersonationSnapshot; } catch { return null; }
}
export function clearImpersonationSnapshot() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEYS.impersonationSnapshot);
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
  async updateMe(payload: ProfilePayload) {
    const res = await this.client.patch('/api/v1/me', { user: payload });
    return res.data.user as AuthUser;
  }
  async changeMyPassword(current_password: string, password: string) {
    return (await this.client.patch('/api/v1/me/password', { current_password, password, password_confirmation: password })).data;
  }
  async myBilling(): Promise<{ billing: MyBilling | null }> {
    return (await this.client.get('/api/v1/me/billing')).data;
  }
  async deleteMe(password: string) {
    return (await this.client.delete('/api/v1/me', { data: { password } })).data;
  }

  async requestPasswordReset(email: string) {
    const res = await this.client.post('/api/v1/auth/password', { email });
    return res.data;
  }

  async resetPassword(token: string, password: string) {
    const res = await this.client.patch('/api/v1/auth/password', { token, password, password_confirmation: password });
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

  // ==================== Member: Billing (devis/factures Travaux du client) ====================

  async listBillingDocuments(): Promise<{ documents: TravauxInvoice[] }> {
    return (await this.client.get('/api/v1/billing/documents')).data;
  }
  async downloadBillingDocumentPdf(id: string): Promise<{ blob: Blob; filename: string }> {
    const res = await this.client.get(`/api/v1/billing/documents/${id}/pdf`, { responseType: 'blob', timeout: 30000 });
    return { blob: res.data, filename: filenameFrom(res.headers['content-disposition'], 'document.pdf') };
  }

  // ==================== Admin: Travaux ====================

  async adminTravauxClients(params?: { q?: string; page?: number; per_page?: number }): Promise<TravauxClientsListResponse> {
    return (await this.client.get('/api/v1/admin/travaux/clients', { params })).data;
  }
  async adminTravauxClient(id: string): Promise<{ client: TravauxClient }> {
    return (await this.client.get(`/api/v1/admin/travaux/clients/${id}`)).data;
  }
  async adminTravauxCreateClient(payload: TravauxPayload): Promise<{ client: TravauxClient }> {
    return (await this.client.post('/api/v1/admin/travaux/clients', toFormData('client', payload), MULTIPART)).data;
  }
  async adminTravauxUpdateClient(id: string, payload: TravauxPayload): Promise<{ client: TravauxClient }> {
    return (await this.client.patch(`/api/v1/admin/travaux/clients/${id}`, toFormData('client', payload), MULTIPART)).data;
  }
  async adminTravauxDeleteClient(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/clients/${id}`)).data;
  }
  async adminTravauxIssuer(): Promise<{ issuer: TravauxClient | null }> {
    return (await this.client.get('/api/v1/admin/travaux/issuer')).data;
  }
  async adminTravauxUpdateIssuer(payload: TravauxPayload): Promise<{ issuer: TravauxClient }> {
    return (await this.client.put('/api/v1/admin/travaux/issuer', toFormData('client', payload), MULTIPART)).data;
  }

  // Projets d'un client : colonnes de l'onglet Livrables
  async adminTravauxProjects(clientId: string): Promise<{ projects: { id: string; name: string; status: string; progress: number; description?: string | null }[] }> {
    return (await this.client.get('/api/v1/admin/travaux/projects', { params: { client_id: clientId } })).data;
  }
  async adminTravauxCreateProject(payload: { client_id: string; name: string; description?: string }) {
    return (await this.client.post('/api/v1/admin/travaux/projects', { project: payload })).data;
  }
  async adminTravauxUpdateProject(id: string, payload: { name?: string; description?: string; status?: string }) {
    return (await this.client.patch(`/api/v1/admin/travaux/projects/${id}`, { project: payload })).data;
  }
  async adminTravauxDeleteProject(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/projects/${id}`)).data;
  }

  async adminTravauxObjectives(clientId: string, params?: { project_id?: string }): Promise<{ objectives: TravauxObjective[] }> {
    return (await this.client.get('/api/v1/admin/travaux/objectives', { params: { client_id: clientId, ...params } })).data;
  }
  async adminTravauxObjective(id: string): Promise<{ objective: TravauxObjective }> {
    return (await this.client.get(`/api/v1/admin/travaux/objectives/${id}`)).data;
  }
  async adminTravauxCreateObjective(payload: TravauxPayload): Promise<{ objective: TravauxObjective }> {
    return (await this.client.post('/api/v1/admin/travaux/objectives', { objective: payload })).data;
  }
  async adminTravauxUpdateObjective(id: string, payload: TravauxPayload): Promise<{ objective: TravauxObjective }> {
    return (await this.client.patch(`/api/v1/admin/travaux/objectives/${id}`, { objective: payload })).data;
  }
  async adminTravauxDeleteObjective(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/objectives/${id}`)).data;
  }

  async adminTravauxTasks(clientId: string, params?: { objective_id?: string }): Promise<{ tasks: TravauxTask[] }> {
    return (await this.client.get('/api/v1/admin/travaux/tasks', { params: { client_id: clientId, ...params } })).data;
  }
  async adminTravauxCreateTask(payload: TravauxPayload): Promise<{ task: TravauxTask }> {
    return (await this.client.post('/api/v1/admin/travaux/tasks', { task: payload })).data;
  }
  async adminTravauxUpdateTask(id: string, payload: TravauxPayload): Promise<{ task: TravauxTask }> {
    return (await this.client.patch(`/api/v1/admin/travaux/tasks/${id}`, { task: payload })).data;
  }
  async adminTravauxDeleteTask(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/tasks/${id}`)).data;
  }

  async adminTravauxContracts(clientId: string): Promise<{ contracts: TravauxContract[] }> {
    return (await this.client.get('/api/v1/admin/travaux/contracts', { params: { client_id: clientId } })).data;
  }
  async adminTravauxCreateContract(payload: TravauxPayload): Promise<{ contract: TravauxContract }> {
    return (await this.client.post('/api/v1/admin/travaux/contracts', toFormData('contract', payload), MULTIPART)).data;
  }
  async adminTravauxDeleteContract(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/contracts/${id}`)).data;
  }

  async adminTravauxInvoices(clientId: string, params?: { kind?: string; objective_id?: string }): Promise<{ invoices: TravauxInvoice[] }> {
    return (await this.client.get('/api/v1/admin/travaux/invoices', { params: { client_id: clientId, ...params } })).data;
  }
  async adminTravauxInvoice(id: string): Promise<{ invoice: TravauxInvoice }> {
    return (await this.client.get(`/api/v1/admin/travaux/invoices/${id}`)).data;
  }
  async adminTravauxCreateInvoice(payload: TravauxPayload): Promise<{ invoice: TravauxInvoice }> {
    return (await this.client.post('/api/v1/admin/travaux/invoices', toFormData('invoice', payload), MULTIPART)).data;
  }
  async adminTravauxUpdateInvoice(id: string, payload: TravauxPayload): Promise<{ invoice: TravauxInvoice }> {
    return (await this.client.patch(`/api/v1/admin/travaux/invoices/${id}`, toFormData('invoice', payload), MULTIPART)).data;
  }
  async adminTravauxDeleteInvoice(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/invoices/${id}`)).data;
  }
  async adminTravauxGenerateInvoice(id: string): Promise<{ invoice: TravauxInvoice }> {
    return (await this.client.post(`/api/v1/admin/travaux/invoices/${id}/generate_invoice`)).data;
  }
  /** « Envoyer » / « Relancer » by e-mail (PDF attached), each recipient in their language. */
  async adminTravauxInvoiceRecipients(id: string): Promise<{ recipients: BillingRecipient[] }> {
    return (await this.client.get(`/api/v1/admin/travaux/invoices/${id}/recipients`)).data;
  }
  async adminTravauxDeliverInvoice(id: string, recipients: string[]): Promise<{ invoice: TravauxInvoice; sent_to: string[] }> {
    return (await this.client.post(`/api/v1/admin/travaux/invoices/${id}/deliver`, { recipients }, { timeout: 30000 })).data;
  }
  async adminTravauxRemindInvoice(id: string, recipients: string[]): Promise<{ invoice: TravauxInvoice; sent_to: string[] }> {
    return (await this.client.post(`/api/v1/admin/travaux/invoices/${id}/remind`, { recipients }, { timeout: 30000 })).data;
  }
  async adminTravauxDownloadInvoicePdf(id: string): Promise<{ blob: Blob; filename: string }> {
    const res = await this.client.get(`/api/v1/admin/travaux/invoices/${id}/pdf`, { responseType: 'blob', timeout: 30000 });
    return { blob: res.data, filename: filenameFrom(res.headers['content-disposition'], 'document.pdf') };
  }

  async adminTravauxPayments(clientId: string): Promise<{ payments: TravauxPayment[] }> {
    return (await this.client.get('/api/v1/admin/travaux/payments', { params: { client_id: clientId } })).data;
  }
  /** `notify`: a completed payment sends its receipt to the client. */
  async adminTravauxCreatePayment(payload: TravauxPayload, notify = false): Promise<{ payment: TravauxPayment }> {
    return (await this.client.post('/api/v1/admin/travaux/payments', { payment: payload, notify })).data;
  }
  async adminTravauxDeletePayment(id: string) {
    return (await this.client.delete(`/api/v1/admin/travaux/payments/${id}`)).data;
  }

  // ==================== Admin: Users ====================

  // ── Mailing (back office) ──
  async adminMailingOverview(): Promise<MailingOverview> { return (await this.client.get('/api/v1/admin/mailing/overview')).data; }
  async adminMailingSubscribers(params: { q?: string; status?: string; page?: number }): Promise<{ subscribers: MailingSubscriber[]; meta: { total: number; page: number; pages: number } }> {
    return (await this.client.get('/api/v1/admin/mailing/subscribers', { params })).data;
  }
  async adminMailingCreateSubscriber(payload: { email: string; first_name?: string; last_name?: string; language: string }) {
    return (await this.client.post('/api/v1/admin/mailing/subscribers', payload)).data;
  }
  async adminMailingUpdateSubscriber(id: string, status: 'confirmed' | 'unsubscribed') {
    return (await this.client.patch(`/api/v1/admin/mailing/subscribers/${id}`, { status })).data;
  }
  async adminMailingDeleteSubscriber(id: string) { return (await this.client.delete(`/api/v1/admin/mailing/subscribers/${id}`)).data; }
  async adminMailingCampaigns(): Promise<{ campaigns: MailingCampaign[] }> { return (await this.client.get('/api/v1/admin/mailing/campaigns')).data; }
  async adminMailingCampaign(id: string): Promise<{ campaign: MailingCampaign }> { return (await this.client.get(`/api/v1/admin/mailing/campaigns/${id}`)).data; }
  async adminMailingSaveCampaign(payload: Partial<MailingCampaign>, id?: string): Promise<{ campaign: MailingCampaign }> {
    return id
      ? (await this.client.patch(`/api/v1/admin/mailing/campaigns/${id}`, { campaign: payload })).data
      : (await this.client.post('/api/v1/admin/mailing/campaigns', { campaign: payload })).data;
  }
  async adminMailingDeleteCampaign(id: string) { return (await this.client.delete(`/api/v1/admin/mailing/campaigns/${id}`)).data; }
  async adminMailingPreviewCampaign(id: string, locale: string): Promise<{ subject: string; html: string }> {
    return (await this.client.get(`/api/v1/admin/mailing/campaigns/${id}/preview`, { params: { locale } })).data;
  }
  async adminMailingTestCampaign(id: string, to: string, locale: string) {
    return (await this.client.post(`/api/v1/admin/mailing/campaigns/${id}/test`, { to, locale })).data;
  }
  async adminMailingSendCampaign(id: string) { return (await this.client.post(`/api/v1/admin/mailing/campaigns/${id}/send`)).data; }

  // ── Communication preferences (public, token from the e-mail's links) ──
  async emailPreferences(token: string): Promise<EmailPreferences> { return (await this.client.get(`/api/v1/email_preferences/${token}`)).data; }
  async updateEmailPreferences(token: string, payload: { preferences?: Record<string, boolean>; language?: string }): Promise<EmailPreferences> {
    return (await this.client.patch(`/api/v1/email_preferences/${token}`, payload)).data;
  }
  async unsubscribeEmail(token: string): Promise<EmailPreferences> { return (await this.client.post(`/api/v1/email_preferences/${token}/unsubscribe`)).data; }
  async resubscribeEmail(token: string): Promise<EmailPreferences> { return (await this.client.post(`/api/v1/email_preferences/${token}/resubscribe`)).data; }
  async confirmNewsletter(token: string): Promise<{ success: boolean; preferences_token: string }> {
    return (await this.client.post('/api/v1/newsletter/confirm', { token })).data;
  }

  async adminMailPreviews(): Promise<{ mailers: { key: string; emails: string[] }[] }> {
    return (await this.client.get('/api/v1/admin/mail_previews')).data;
  }
  async adminMailPreview(mailer: string, email: string, locale: string): Promise<MailPreview> {
    return (await this.client.get(`/api/v1/admin/mail_previews/${mailer}/${email}`, { params: { locale } })).data;
  }
  /** Sends the sample e-mail, marked « [Test] », to `to` only. */
  async adminMailPreviewDeliver(mailer: string, email: string, locale: string, to: string): Promise<{ delivered: boolean; to: string }> {
    return (await this.client.post(`/api/v1/admin/mail_previews/${mailer}/${email}/deliver`, { to, locale })).data;
  }
  async adminUsersOverview(): Promise<AdminUsersOverview> {
    return (await this.client.get('/api/v1/admin/users/overview')).data;
  }
  async adminUsersList(params?: { role?: AuthRole; q?: string; page?: number; per_page?: number; active?: 'true'; unconfirmed?: boolean; with_client?: 'true'; client_id?: string; segment?: 'active' | 'acquisition' }): Promise<AdminUsersListResponse> {
    return (await this.client.get('/api/v1/admin/users', { params })).data;
  }
  async adminUserDetail(id: string): Promise<{ user: AdminUser }> {
    return (await this.client.get(`/api/v1/admin/users/${id}`)).data;
  }
  async adminUserLock(id: string): Promise<{ user: AdminUser }> {
    return (await this.client.post(`/api/v1/admin/users/${id}/lock`)).data;
  }
  async adminUserUnlock(id: string): Promise<{ user: AdminUser }> {
    return (await this.client.post(`/api/v1/admin/users/${id}/unlock`)).data;
  }
  async adminImpersonateUser(id: string): Promise<AdminImpersonateResponse> {
    return (await this.client.post(`/api/v1/admin/users/${id}/impersonate`)).data;
  }

  // ==================== Admin ====================

  async adminInfrastructure()       { return (await this.client.get('/api/v1/admin/infrastructure')).data; }
  async adminInfrastructureHealth() { return (await this.client.get('/api/v1/admin/infrastructure/health')).data; }
  async adminInfraDatabase(): Promise<InfraDatabase> { return (await this.client.get('/api/v1/admin/infrastructure/database')).data; }
  async adminInfraCronjobs(): Promise<{ jobs: InfraCronjob[] }> { return (await this.client.get('/api/v1/admin/infrastructure/cronjobs')).data; }
  async adminInfraRunCronjob(name: string) { return (await this.client.post(`/api/v1/admin/infrastructure/cronjobs/${name}/run`)).data; }
  async adminInfraBackups(): Promise<{ backups: InfraBackup[]; keep: number; cron: string | null }> {
    return (await this.client.get('/api/v1/admin/infrastructure/backups')).data;
  }
  async adminInfraCreateBackup() { return (await this.client.post('/api/v1/admin/infrastructure/backups')).data; }
  async adminInfraDownloadBackup(name: string): Promise<{ blob: Blob; filename: string }> {
    const res = await this.client.get(`/api/v1/admin/infrastructure/backups/${encodeURIComponent(name)}`, { responseType: 'blob', timeout: 120000 });
    return { blob: res.data, filename: filenameFrom(res.headers['content-disposition'], name) };
  }
  async adminInfraActivities(params: { q?: string; kind?: string; page?: number; per_page?: number }): Promise<{ activities: ActivityEntry[]; meta: { total: number; page: number; per_page: number; pages: number } }> {
    return (await this.client.get('/api/v1/admin/infrastructure/activities', { params })).data;
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
  async adminNewsAIReviewPrompt(id: string, payload: { action: 'approve' | 'reject' | 'rebuild' | 'auto'; notes?: string }): Promise<any> { return (await this.client.patch(`/api/v1/admin/news/ai-prompts/${id}/review`, payload)).data; }
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
  async adminNewsDeleteFailedPrompts() { return (await this.client.delete('/api/v1/admin/news/ai-prompts/failed')).data; }

  async adminSocialArticleStatus(articleId: string) { return (await this.client.get(`/api/v1/admin/social/articles/${articleId}/status`)).data; }
  async adminSocialPublishLinkedin(articleId: string) { return (await this.client.post(`/api/v1/admin/social/articles/${articleId}/publish_linkedin`)).data; }
  async adminLinkedinStatus() { return (await this.client.get('/api/v1/admin/social/linkedin/status')).data; }
  async adminSocialPublishFacebook(articleId: string) { return (await this.client.post(`/api/v1/admin/social/articles/${articleId}/publish_facebook`)).data; }
  async adminSocialUnpublishLinkedin(articleId: string) { return (await this.client.post(`/api/v1/admin/social/articles/${articleId}/unpublish_linkedin`)).data; }
  async adminSocialUnpublishFacebook(articleId: string) { return (await this.client.post(`/api/v1/admin/social/articles/${articleId}/unpublish_facebook`)).data; }
  async adminFacebookStatus() { return (await this.client.get('/api/v1/admin/social/facebook/status')).data; }
  async adminFacebookConnectUrl() { return (await this.client.get('/api/v1/admin/social/facebook/connect_url')).data as { url: string }; }

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

  // ==================== Client space: Travaux ====================

  async memberTravaux(): Promise<MemberTravaux> {
    return (await this.client.get('/api/v1/travaux')).data;
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
  async adminLesankofaModelToggle(id: string) { return (await this.client.post(`/api/v1/admin/lesankofa/models/${id}/toggle`)).data; }
  async adminLesankofaClients()           { return (await this.client.get('/api/v1/admin/lesankofa/clients')).data; }
  async adminLesankofaClientDetail(id: string) { return (await this.client.get(`/api/v1/admin/lesankofa/clients/${id}`)).data; }
  async adminLesankofaClientUpdate(id: string, payload: Record<string, unknown>) { return (await this.client.patch(`/api/v1/admin/lesankofa/clients/${id}`, payload)).data; }
  async adminLesankofaTasks()             { return (await this.client.get('/api/v1/admin/lesankofa/tasks')).data; }
  async adminLesankofaContainers()        { return (await this.client.get('/api/v1/admin/lesankofa/containers')).data; }
  async adminLesankofaContainerLogs(id: string, lines = 100) { return (await this.client.get(`/api/v1/admin/lesankofa/containers/${id}/logs`, { params: { lines } })).data; }
  async adminLesankofaHistory(limit = 20) { return (await this.client.get('/api/v1/admin/lesankofa/history', { params: { limit } })).data; }
  async adminLesankofaGenerationControl()          { return (await this.client.get('/api/v1/admin/lesankofa/generation-control')).data; }
  async adminLesankofaGenerationPause(reason?: string) { return (await this.client.post('/api/v1/admin/lesankofa/generation-control/pause', null, { params: reason ? { reason } : {} })).data; }
  async adminLesankofaGenerationResume()           { return (await this.client.post('/api/v1/admin/lesankofa/generation-control/resume')).data; }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

export const apiService = new ApiService();

/** The progress of the work, as the client sees it (GET /api/v1/travaux). */
export interface MemberTravauxObjective {
  id: string; title: string; description: string | null; status: string; format: string;
  progress: number; due_on: string | null; tasks_total: number; tasks_done: number;
}
export interface MemberTravauxTask {
  id: string; title: string; description: string | null; column: 'todo' | 'in_progress' | 'review' | 'done'; priority: string;
  objective_id: string | null; objective_title: string | null; due_on: string | null; completed_at: string | null; updated_at: string;
}
export interface MemberTravaux {
  projects: Array<{ id: string; name: string; status: string; progress: number; due_on: string | null; objectives: MemberTravauxObjective[] }>;
  tasks: MemberTravauxTask[];
}

/** The company's billing details, as shown on the profile (read-only). */
export interface MyBilling {
  company: string; siret: string | null; vat_number: string | null; address: string[]; contact_email: string | null;
  referent: string | null; referent_email: string | null; referent_phone: string | null;
}

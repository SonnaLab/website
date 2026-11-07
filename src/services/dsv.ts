/**
 * Moteur d'articles DSV (Demande, Verite, Superiorite) de Lesankofa.
 *
 * Tout passe par le proxy d'api.sonnalab.com
 * (/api/v1/admin/lesankofa/dsv/... -> ai.sonnalab.com/api/v1/dsv/...) :
 * la cle API Lesankofa reste cote serveur. Les formes ci-dessous suivent
 * les schemas pydantic de ai.sonnalab.com/src/dsv/<module>/schemas.py.
 */
import { isAxiosError } from 'axios';

import { apiService } from '@/services/api';

// ─── Types ─────────────────────────────────────────────

export type DraftStatus = 'generated' | 'quality_failed' | 'in_review' | 'approved' | 'rejected' | 'published';
export type DecisionStatus =
  | 'proposed' | 'writing' | 'in_review' | 'approved' | 'published' | 'rejected' | 'failed' | 'dismissed';
export type QuestionStatus = 'candidate' | 'active' | 'covered' | 'dropped';

export interface QualityCheck {
  rule: string;
  passed: boolean;
  blocking: boolean;
  status?: 'passed' | 'failed' | 'not_implemented' | 'error';
  detail: string;
}

export interface QualityReport {
  id: number;
  draft_id?: number;
  passed: boolean;
  checks: QualityCheck[];
  created_at: string | null;
}

export interface DraftSummary {
  id: number;
  decision_id: number;
  client_id: string;
  language: string;
  attempt: number;
  title: string;
  slug: string;
  status: DraftStatus;
  created_at: string | null;
}

export interface Draft extends DraftSummary {
  seo_title: string;
  meta_description: string;
  excerpt: string | null;
  content_markdown: string;
  social_posts: Record<string, string> | null;
  image_query: string | null;
  brief: Record<string, unknown>;
  config_versions: Record<string, number>;
  model_used: string | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_url: string | null;
  external_id: string | null;
  published_at: string | null;
}

export interface EvidenceBrief {
  id: number;
  passed: string;
  level?: string | null;
  summary: string;
  expires_at?: string | null;
}

export interface EvidenceSnapshot {
  demand?: EvidenceBrief;
  superiority?: EvidenceBrief;
  truth?: EvidenceBrief;
  metrics?: {
    impressions?: number;
    clicks?: number;
    recent_28d?: number;
    previous_28d?: number;
    bing_volume?: number | null;
    pages?: Array<{ url: string; impressions: number; clicks: number; position: number | null }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ReviewDecision {
  id: number;
  question_id: number | null;
  action: string;
  priority: number;
  reason: string;
  target_url: string | null;
  status: DecisionStatus;
  status_note: string | null;
  evidence_snapshot: EvidenceSnapshot;
}

export interface EvidenceSummary {
  id: number;
  kind: string;
  passed: string;
  level: string | null;
  summary: string;
  collected_at: string | null;
  expires_at: string | null;
}

export interface DraftDetail {
  draft: Draft;
  decision: ReviewDecision | null;
  quality: QualityReport | null;
  blocking_failures: QualityCheck[];
  evidence: EvidenceSummary[];
}

export type DraftEdits = Partial<Pick<Draft,
  'title' | 'seo_title' | 'meta_description' | 'slug' | 'excerpt' | 'content_markdown'>> & {
  social_posts?: Record<string, string>;
};

export interface PublishEvent {
  id: number;
  client_id: string;
  draft_id: number | null;
  kind: string;
  target: string | null;
  status: 'success' | 'failed' | string;
  http_status: number | null;
  detail: Record<string, unknown> | null;
  created_at: string | null;
}

export interface Decision {
  id: number;
  client_id: string;
  question_id: number | null;
  question: string | null;
  language: string | null;
  decided_on: string;
  action: string;
  priority: number;
  reason: string;
  evidence_snapshot: EvidenceSnapshot;
  target_url: string | null;
  config_versions: Record<string, number>;
  status: DecisionStatus;
  status_note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Evidence {
  id: number;
  question_id?: number;
  kind: string;
  passed: string;
  level: string | null;
  summary: string;
  payload: Record<string, unknown>;
  collected_at: string | null;
  expires_at: string;
  valid?: boolean;
}

export interface OutcomeWindow {
  window?: [string, string];
  impressions?: number;
  clicks?: number;
  position?: number | null;
}

export interface Outcome {
  id: number;
  decision_id: number;
  client_id: string | null;
  action: string | null;
  question: string | null;
  url: string;
  published_on: string | null;
  baseline: OutcomeWindow | null;
  day_28: OutcomeWindow | null;
  day_56: OutcomeWindow | null;
  verdict: string | null;
  updated_at: string | null;
}

export interface DecisionQuestion {
  id: number;
  language: string;
  key: string;
  text: string;
  intent: string | null;
  node_key: string | null;
  status: string;
  target_url: string | null;
  target_kind: string | null;
}

export interface DecisionDetail {
  decision: Decision;
  question: DecisionQuestion | null;
  evidence: Evidence[];
  outcome: Outcome | null;
}

export interface QuestionVariant { id: number; query_norm: string; source: string }

export interface Question {
  id: number;
  client_id: string;
  language: string;
  key: string;
  text: string;
  intent: string | null;
  node_key: string | null;
  cluster_id: number | null;
  status: QuestionStatus;
  target_url: string | null;
  target_kind: 'article' | 'resource' | null;
  first_seen: string | null;
  last_seen: string | null;
  notes: string | null;
  variants: QuestionVariant[];
}

export interface QuestionPage { total: number; items: Question[] }

export interface QuestionPatch {
  status?: QuestionStatus;
  target_url?: string | null;
  target_kind?: 'article' | 'resource' | null;
  notes?: string | null;
}

export interface Cluster {
  id: number;
  client_id: string;
  language: string;
  key: string;
  label: string;
  node_key: string | null;
  pillar_question_id: number | null;
  questions: number;
}

export interface QuestionEvidence { question_id: number; gate_open: boolean; evidence: Evidence[] }

export interface ConfigVersion {
  id: number;
  scope: string;
  version: number;
  status: 'draft' | 'active' | 'archived' | string;
  payload: Record<string, unknown>;
  note: string | null;
  created_by: string;
}

export interface Fact {
  id: number;
  key: string;
  statement: string;
  exists: boolean;
  source: string;
  verified_by: string;
  is_active: boolean;
}

export type FactInput = Pick<Fact, 'key' | 'statement' | 'exists' | 'source'>;

export interface Resource {
  id: number;
  url: string;
  language: string;
  kind: string;
  title: string;
  summary: string | null;
  topics: string[];
  is_live: boolean;
}

export interface LinkPlan {
  id: number;
  decision_id: number | null;
  cluster_id: number | null;
  language: string;
  source_url: string | null;
  target_url: string;
  target_kind: string;
  relation: string;
  anchor_hint: string;
  required: boolean;
  status: string;
}

export interface OrphanArticle {
  slug: string;
  language: string | null;
  path: string;
  inbound: number;
  outbound: number | null;
  dead_links: string[];
}

export interface OrphanReport {
  client_id: string;
  source: string | null;
  error: string | null;
  tried: string[];
  articles: number;
  no_inbound: number;
  no_outbound: number;
  isolated: number;
  content_unknown: number;
  dead_links: number;
  partial: boolean;
  details: OrphanArticle[];
  errors: Array<Record<string, unknown>>;
}

export interface BriefPreview { brief: Record<string, unknown>; system: string; user: string }

// ─── Erreurs ───────────────────────────────────────────

/** Ce que le proxy a dit (message lisible), sinon le message reseau. */
export function dsvErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown } | undefined;
    if (data && typeof data.error === 'string' && data.error) return data.error;
    if (error.code === 'ECONNABORTED') return 'Délai dépassé : Lesankofa n’a pas répondu à temps.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Erreur inconnue';
}

/** Le `detail` d'origine renvoye par Lesankofa (ex. { message, failures }). */
export function dsvErrorDetail(error: unknown): unknown {
  if (!isAxiosError(error)) return undefined;
  return (error.response?.data as { detail?: unknown } | undefined)?.detail;
}

// ─── Appels ────────────────────────────────────────────

const call = apiService.adminLesankofaDsv.bind(apiService);
const enc = encodeURIComponent;

export const dsv = {
  // validation
  reviewQueue: (clientId: string, statuses: DraftStatus[]) =>
    call<DraftSummary[]>('get', `review/clients/${enc(clientId)}/queue`, { params: { status: statuses } }),
  draftDetail: (draftId: number) => call<DraftDetail>('get', `review/drafts/${draftId}`),
  editDraft: (draftId: number, edits: DraftEdits) =>
    call<DraftDetail>('patch', `review/drafts/${draftId}`, { body: edits, timeout: 65000 }),
  approveDraft: (draftId: number, notes?: string) =>
    call<DraftDetail>('post', `review/drafts/${draftId}/approve`, { body: { notes: notes || null }, timeout: 65000 }),
  rejectDraft: (draftId: number, notes: string) =>
    call<DraftDetail>('post', `review/drafts/${draftId}/reject`, { body: { notes }, timeout: 65000 }),

  // qualite
  qualityReports: (draftId: number) => call<QualityReport[]>('get', `quality/drafts/${draftId}/reports`),
  runQuality: (draftId: number) => call<QualityReport>('post', `quality/drafts/${draftId}/check`, { timeout: 65000 }),

  // redaction
  decisionDrafts: (decisionId: number) => call<DraftSummary[]>('get', `writing/decisions/${decisionId}/drafts`),
  briefPreview: (decisionId: number) => call<BriefPreview>('get', `writing/decisions/${decisionId}/brief`),
  regenerate: (decisionId: number) =>
    call<Draft>('post', `writing/decisions/${decisionId}/regenerate`, { timeout: 195000 }),

  // publication
  publishDraft: (draftId: number) =>
    call<PublishEvent>('post', `publishing/drafts/${draftId}/publish`, { timeout: 125000 }),
  publishEvents: (clientId: string, params: { draft_id?: number; kind?: string; limit?: number } = {}) =>
    call<PublishEvent[]>('get', `publishing/clients/${enc(clientId)}/events`, { params }),

  // decisions et resultats
  decisions: (params: { client_id?: string; status?: string; action?: string; since?: string; limit?: number; offset?: number }) =>
    call<Decision[]>('get', 'decisions', { params }),
  decisionDetail: (decisionId: number) => call<DecisionDetail>('get', `decisions/${decisionId}`),
  outcomes: (params: { client_id?: string; pending?: boolean; limit?: number; offset?: number }) =>
    call<Outcome[]>('get', 'outcomes', { params }),

  // liens
  decisionLinks: (decisionId: number) => call<LinkPlan[]>('get', `links/decisions/${decisionId}`),
  orphanReport: (clientId: string) =>
    call<OrphanReport>('get', `links/clients/${enc(clientId)}/orphans`, { timeout: 185000 }),

  // questions
  questions: (clientId: string, params: {
    language?: string; status?: string; node_key?: string; cluster_id?: number; q?: string; limit?: number; offset?: number;
  }) => call<QuestionPage>('get', `questions/clients/${enc(clientId)}/questions`, { params }),
  question: (questionId: number) => call<Question>('get', `questions/questions/${questionId}`),
  patchQuestion: (questionId: number, patch: QuestionPatch) =>
    call<Question>('patch', `questions/questions/${questionId}`, { body: patch }),
  clusters: (clientId: string, params: { language?: string; node_key?: string; min_questions?: number; limit?: number }) =>
    call<Cluster[]>('get', `questions/clients/${enc(clientId)}/clusters`, { params }),
  questionEvidence: (questionId: number) => call<QuestionEvidence>('get', `evidence/questions/${questionId}`),

  // configuration
  configVersions: (scope: string) => call<ConfigVersion[]>('get', `config/${enc(scope)}/versions`),
  createConfigVersion: (scope: string, payload: Record<string, unknown>, note?: string) =>
    call<ConfigVersion>('post', `config/${enc(scope)}/versions`, { body: { payload, note: note || null } }),
  activateConfigVersion: (versionId: number) => call<ConfigVersion>('post', `config/versions/${versionId}/activate`),
  facts: (clientId: string) => call<Fact[]>('get', `config/clients/${enc(clientId)}/facts`),
  putFact: (clientId: string, fact: FactInput) => call<Fact>('put', `config/clients/${enc(clientId)}/facts`, { body: fact }),
  resources: (clientId: string, language?: string) =>
    call<Resource[]>('get', `config/clients/${enc(clientId)}/resources`, { params: { language }, timeout: 65000 }),
};

/**
 * Module Travaux (porté d'elancevae) — miroir du JSON renvoyé par
 * api.sonnalab.com (/api/v1/admin/travaux/*, /api/v1/billing/documents).
 * Montants en centimes, dates ISO (YYYY-MM-DD), clés snake_case.
 */

export interface TravauxClientStats {
  projects_count: number;
  objectives_in_progress: number;
  invoiced_cents: number;
  paid_cents: number;
  /** Accounts attached to the company (its team). */
  members_count?: number;
}

export interface TravauxClientProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  due_on: string | null;
}

export interface TravauxClientMember {
  id: string;
  email: string;
  full_name: string | null;
}

export interface TravauxClient {
  id: string;
  name: string;
  siret: string | null;
  contact_email: string | null;
  referent_first_name: string | null;
  referent_last_name: string | null;
  referent_email: string | null;
  referent_phone: string | null;
  /** Coordonnées et mentions légales : en-tête / pied de page des documents (fiche émetteur). */
  legal_name: string | null;
  legal_form: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  rcs: string | null;
  capital: string | null;
  vat_number: string | null;
  iban: string | null;
  bic: string | null;
  tagline: string | null;
  /** « SONNALAB · Capital 1 000 € · RCS … · SIRET … » calculée par l'API. */
  legal_line: string;
  is_issuer: boolean;
  initials: string;
  /** Chemin relatif à l'API (proxy ActiveStorage) — voir apiAssetUrl(). */
  logo_path: string | null;
  created_at: string;
  updated_at: string;
  stats?: TravauxClientStats;
  projects?: TravauxClientProject[];
  members?: TravauxClientMember[];
}

export interface TravauxClientsListResponse {
  clients: TravauxClient[];
  meta: { total: number; page: number; per_page: number; pages: number };
}

export type ObjectiveStatus = 'planned' | 'in_progress' | 'done' | 'at_risk';
export type ObjectiveFormat = 'web' | 'mobile';

export interface TravauxObjective {
  id: string;
  project_id: string;
  project_name: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  format: ObjectiveFormat;
  progress: number;
  due_on: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  tasks?: TravauxTask[];
}

export type KanbanColumn = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TravauxTask {
  id: string;
  client_id: string;
  objective_id: string | null;
  objective_title: string | null;
  title: string;
  description: string | null;
  column: KanbanColumn;
  priority: TaskPriority;
  position: number;
  due_on: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  score: number | null;
  /** When it reached « Terminé » (null elsewhere). */
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated';

export interface TravauxContract {
  id: string;
  client_id: string;
  title: string;
  amount_cents: number | null;
  starts_on: string | null;
  ends_on: string | null;
  status: ContractStatus;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceKind = 'quote' | 'invoice';
export type InvoiceStatus = 'draft' | 'sent' | 'accepted' | 'paid' | 'overdue' | 'cancelled';

export interface TravauxInvoice {
  id: string;
  client_id: string;
  client_name: string | null;
  issuer_id: string | null;
  issuer_name: string | null;
  kind: InvoiceKind;
  number: string;
  printed_number: string;
  title: string;
  amount_cents: number;
  daily_rate_cents: number | null;
  status: InvoiceStatus;
  issued_on: string | null;
  due_on: string | null;
  objective_id: string | null;
  objective_title: string | null;
  contract_id: string | null;
  contract_title: string | null;
  source_quote_id: string | null;
  source_quote_number: string | null;
  generated_invoice_id: string | null;
  current_version: number;
  last_reminded_on?: string | null;
  /** Member billing only: what the invoice has received (completed payments). */
  paid_cents?: number;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'transfer' | 'card' | 'check' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface TravauxPayment {
  id: string;
  client_id: string;
  invoice_id: string | null;
  invoice_title: string | null;
  invoice_number: string | null;
  amount_cents: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  paid_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Valeurs de formulaire envoyées en multipart (fichiers) ou JSON. */
export type TravauxFormValue = string | number | boolean | File | null | undefined | string[];
export type TravauxPayload = Record<string, TravauxFormValue>;

/** Who a client's quotes, invoices and receipts can be e-mailed to. */
export interface BillingRecipient {
  email: string;
  name?: string | null;
  role: 'referent' | 'contact' | 'member';
  language: string;
}

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { apiService } from '@/services/api';
import { DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClipboardListIcon, EyeIcon, FolderKanbanIcon, LayoutDashboardIcon } from '@icons';

type UnknownRecord = Record<string, unknown>;

interface Project extends UnknownRecord {
  id: string;
  slug?: string;
  name?: string;
  title?: string;
  status?: string;
  progress?: number | string;
  starts_on?: string;
  ends_on?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  submitted_at?: string;
  milestones?: Milestone[];
  updates?: ProjectUpdate[];
}
interface Milestone     { id: string; title: string; status: string; due_on?: string; completed_on?: string }
interface ProjectUpdate { id: string; kind: string; title?: string; body: string; created_at: string }

interface ProjectSubmissionPreview {
  projectType?: string;
  description?: string;
  budget?: string;
  timeline?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  submittedOn?: string;
}

const EMPTY_VALUE = '—';

const REQUEST_KEYS = [
  'request',
  'client_request',
  'project_request',
  'requestPayload',
  'request_payload',
  'submittedData',
  'submitted_data',
  'consultation',
  'lead',
  'payload',
  'metadata',
  'meta',
];

const PROJECT_DETAIL_KEYS = ['projectDetails', 'project_details', 'project', 'details'];
const CONTACT_DETAIL_KEYS = ['contactInfo', 'contact_info', 'contact', 'client', 'customer', 'lead', 'user'];

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}

function addRecord(target: UnknownRecord[], value: unknown) {
  const record = asRecord(value);
  if (record && !target.includes(record)) target.push(record);
}

function nestedRecords(records: UnknownRecord[], keys: string[]) {
  const nested: UnknownRecord[] = [];
  records.forEach((record) => keys.forEach((key) => addRecord(nested, record[key])));
  return nested;
}

function buildSubmissionSources(project: Project) {
  const root = project as UnknownRecord;
  const requestRecords: UnknownRecord[] = [root];
  REQUEST_KEYS.forEach((key) => addRecord(requestRecords, root[key]));

  const projectDetailRecords = nestedRecords(requestRecords, PROJECT_DETAIL_KEYS);
  const contactDetailRecords = nestedRecords(requestRecords, CONTACT_DETAIL_KEYS);
  const projectRecords = [...projectDetailRecords, ...requestRecords];
  const contactRecords = [...contactDetailRecords, ...requestRecords];

  return {
    allRecords: [...projectRecords, ...contactRecords],
    projectRecords,
    contactRecords,
    contactDetailRecords,
  };
}

function pickString(records: UnknownRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
  }
  return undefined;
}

function normalizeSubmission(project: Project): ProjectSubmissionPreview {
  const { allRecords, projectRecords, contactRecords, contactDetailRecords } = buildSubmissionSources(project);
  const firstName = pickString(contactRecords, ['firstName', 'first_name', 'firstname', 'givenName', 'given_name']);
  const lastName = pickString(contactRecords, ['lastName', 'last_name', 'lastname', 'familyName', 'family_name']);

  return {
    projectType: pickString(projectRecords, ['projectType', 'project_type', 'type', 'kind', 'category']),
    description: pickString(projectRecords, ['description', 'projectDescription', 'project_description', 'message', 'brief', 'requirements', 'body']),
    budget: pickString(projectRecords, ['budget', 'budgetRange', 'budget_range']),
    timeline: pickString(projectRecords, ['timeline', 'deadline', 'expectedTimeline', 'expected_timeline']),
    firstName,
    lastName,
    fullName: pickString(contactDetailRecords, ['fullName', 'full_name', 'name']) || [firstName, lastName].filter(Boolean).join(' ') || pickString(contactRecords, ['fullName', 'full_name']),
    email: pickString(contactRecords, ['email', 'email_address']),
    phone: pickString(contactRecords, ['phone', 'phone_number', 'telephone']),
    company: pickString(contactRecords, ['company', 'company_name', 'organization', 'organisation']),
    role: pickString(contactRecords, ['role', 'jobTitle', 'job_title', 'position']),
    submittedOn: pickString(allRecords, ['submitted_at', 'submittedAt', 'created_at', 'createdAt', 'requested_at', 'requestedAt']),
  };
}

function normalizeKey(value?: string) {
  return (value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function getProjectName(project: Project, fallback: string) {
  return project.name || project.title || project.slug || fallback;
}

function getProjectProgress(project: Project) {
  const value = Number(project.progress ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function dateTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function statusVariant(status?: string) {
  switch (normalizeKey(status)) {
    case 'completed':
    case 'done':
      return 'success' as const;
    case 'active':
    case 'in_progress':
    case 'started':
      return 'info' as const;
    case 'pending':
    case 'new':
    case 'draft':
      return 'muted' as const;
    case 'paused':
    case 'on_hold':
      return 'warning' as const;
    case 'cancelled':
    case 'canceled':
    case 'failed':
      return 'danger' as const;
    default:
      return 'default' as const;
  }
}

export function ProjectsList() {
  const { t, i18n } = useTranslation('member');
  const [items, setItems]     = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    apiService.listProjects()
      .then((res) => setItems(res.projects || []))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((project) => normalizeKey(project.status) === 'completed').length;
    const active = items.filter((project) => ['active', 'in_progress', 'started'].includes(normalizeKey(project.status))).length;
    const avgProgress = total
      ? Math.round(items.reduce((sum, project) => sum + getProjectProgress(project), 0) / total)
      : 0;

    return { total, active, completed, avgProgress };
  }, [items]);

  const recentProjects = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aSubmitted = normalizeSubmission(a).submittedOn || a.created_at || '';
        const bSubmitted = normalizeSubmission(b).submittedOn || b.created_at || '';
        return dateTime(bSubmitted) - dateTime(aSubmitted);
      })
      .slice(0, 5);
  }, [items]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return EMPTY_VALUE;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(date);
  };

  const formatPeriod = (project: Project) => {
    const start = project.starts_on || project.start_date;
    const end = project.ends_on || project.end_date;
    if (!start && !end) return EMPTY_VALUE;
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const translateStatus = (status?: string) => {
    if (!status) return t('projects.statuses.unknown');
    return t(`projects.statuses.${normalizeKey(status)}`, { defaultValue: humanize(status) });
  };

  const translateProjectType = (value?: string) => value
    ? t(`projects.preview.values.projectTypes.${value}`, { defaultValue: humanize(value) })
    : EMPTY_VALUE;

  const translateBudget = (value?: string) => value
    ? t(`projects.preview.values.budgets.${value}`, { defaultValue: humanize(value) })
    : EMPTY_VALUE;

  const translateTimeline = (value?: string) => value
    ? t(`projects.preview.values.timelines.${value}`, { defaultValue: humanize(value) })
    : EMPTY_VALUE;

  const selectedSubmission = selectedProject ? normalizeSubmission(selectedProject) : null;
  const selectedProjectName = selectedProject ? getProjectName(selectedProject, t('projects.untitled')) : '';

  return (
    <div className="member-projects">
      <header className="member-projects__header">
        <div className="member-projects__header-title">
          <FolderKanbanIcon size={22} />
          <h1>{t('projects.title')}</h1>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" icon={<LayoutDashboardIcon size={14} />}>
            {t('projects.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="projects" icon={<FolderKanbanIcon size={14} />} count={items.length}>
            {t('projects.tabs.projects')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="member-projects-overview">
            <div className="member-projects-overview__stats">
              <div className="member-projects-overview__stat-card">
                <span className="member-projects-overview__stat-value">{stats.total}</span>
                <span className="member-projects-overview__stat-label">{t('projects.overview.total')}</span>
              </div>
              <div className="member-projects-overview__stat-card">
                <span className="member-projects-overview__stat-value">{stats.active}</span>
                <span className="member-projects-overview__stat-label">{t('projects.overview.active')}</span>
              </div>
              <div className="member-projects-overview__stat-card">
                <span className="member-projects-overview__stat-value">{stats.completed}</span>
                <span className="member-projects-overview__stat-label">{t('projects.overview.completed')}</span>
              </div>
              <div className="member-projects-overview__stat-card">
                <span className="member-projects-overview__stat-value">{stats.avgProgress}%</span>
                <span className="member-projects-overview__stat-label">{t('projects.overview.avgProgress')}</span>
              </div>
            </div>

            <section className="member-projects-overview__block">
              <div className="member-projects-overview__block-head">
                <h2>{t('projects.overview.latestRequests')}</h2>
              </div>
              {loading ? (
                <p className="adm-empty-state-text">{t('projects.loading')}</p>
              ) : recentProjects.length === 0 ? (
                <p className="adm-empty-state-text">{t('projects.empty')}</p>
              ) : (
                <ul className="member-projects-overview__list">
                  {recentProjects.map((project) => {
                    const submission = normalizeSubmission(project);
                    const name = getProjectName(project, t('projects.untitled'));
                    return (
                      <li key={project.id} className="member-projects-overview__item">
                        <div className="member-projects-overview__item-main">
                          <Link to={`/dashboard/projects/${project.id}`}>{name}</Link>
                          <span>{formatDate(submission.submittedOn || project.created_at)}</span>
                        </div>
                        <div className="member-projects-overview__item-actions">
                          <StatusBadge label={translateStatus(project.status)} variant={statusVariant(project.status)} />
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost adm-btn--xs"
                            onClick={() => setSelectedProject(project)}
                            aria-label={t('projects.actions.previewProject', { name })}
                            title={t('projects.actions.preview')}
                          >
                            <EyeIcon size={13} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>{t('projects.columns.project')}</DataTableTh>
                <DataTableTh>{t('projects.columns.status')}</DataTableTh>
                <DataTableTh>{t('projects.columns.progress')}</DataTableTh>
                <DataTableTh>{t('projects.columns.period')}</DataTableTh>
                <DataTableTh>{t('projects.columns.submitted')}</DataTableTh>
                <DataTableTh className="member-projects__actions-cell">{t('projects.columns.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <DataTableEmpty label={t('projects.loading')} />
              ) : items.length === 0 ? (
                <DataTableEmpty icon={<FolderKanbanIcon size={28} />} label={t('projects.empty')} />
              ) : items.map((project) => {
                const submission = normalizeSubmission(project);
                const progress = getProjectProgress(project);
                const name = getProjectName(project, t('projects.untitled'));

                return (
                  <DataTableRow key={project.id}>
                    <DataTableTd>
                      <div className="member-projects__title-cell">
                        <Link to={`/dashboard/projects/${project.id}`}>{name}</Link>
                        <span>{submission.description || t('projects.preview.noDescription')}</span>
                      </div>
                    </DataTableTd>
                    <DataTableTd>
                      <StatusBadge label={translateStatus(project.status)} variant={statusVariant(project.status)} />
                    </DataTableTd>
                    <DataTableTd>
                      <div className="member-projects__progress" aria-label={`${progress}%`}>
                        <span>{progress}%</span>
                        <div className="member-projects__progress-track">
                          <div className="member-projects__progress-bar" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </DataTableTd>
                    <DataTableTd>{formatPeriod(project)}</DataTableTd>
                    <DataTableTd>{formatDate(submission.submittedOn || project.created_at)}</DataTableTd>
                    <DataTableTd className="member-projects__actions-cell">
                      <div className="adm-table__actions member-projects__actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost adm-btn--xs"
                          onClick={() => setSelectedProject(project)}
                          aria-label={t('projects.actions.previewProject', { name })}
                          title={t('projects.actions.preview')}
                        >
                          <EyeIcon size={13} />
                        </button>
                      </div>
                    </DataTableTd>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </TabsContent>
      </Tabs>

      <Modal
        open={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        title={t('projects.preview.title')}
        size="lg"
        badge={<><ClipboardListIcon size={12} />{t('projects.preview.badge')}</>}
        footer={(
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setSelectedProject(null)}>
            {t('projects.preview.close')}
          </button>
        )}
      >
        {selectedProject && selectedSubmission && (
          <article className="member-project-preview">
            <div className="member-project-preview__head">
              <div>
                <span>{translateProjectType(selectedSubmission.projectType)}</span>
                <h2>{selectedProjectName}</h2>
              </div>
              <StatusBadge label={translateStatus(selectedProject.status)} variant={statusVariant(selectedProject.status)} />
            </div>

            <p className="member-project-preview__description">
              {selectedSubmission.description || t('projects.preview.noDescription')}
            </p>

            <div className="member-project-preview__grid">
              <section className="member-project-preview__panel">
                <h3>{t('projects.preview.project')}</h3>
                <PreviewRow label={t('projects.preview.fields.projectType')} value={translateProjectType(selectedSubmission.projectType)} />
                <PreviewRow label={t('projects.preview.fields.budget')} value={translateBudget(selectedSubmission.budget)} />
                <PreviewRow label={t('projects.preview.fields.timeline')} value={translateTimeline(selectedSubmission.timeline)} />
                <PreviewRow label={t('projects.preview.fields.submittedOn')} value={formatDate(selectedSubmission.submittedOn || selectedProject.created_at)} />
              </section>

              <section className="member-project-preview__panel">
                <h3>{t('projects.preview.contact')}</h3>
                <PreviewRow label={t('projects.preview.fields.name')} value={selectedSubmission.fullName || EMPTY_VALUE} />
                <PreviewRow label={t('projects.preview.fields.email')} value={selectedSubmission.email || EMPTY_VALUE} />
                <PreviewRow label={t('projects.preview.fields.phone')} value={selectedSubmission.phone || EMPTY_VALUE} />
                <PreviewRow label={t('projects.preview.fields.company')} value={selectedSubmission.company || EMPTY_VALUE} />
                <PreviewRow label={t('projects.preview.fields.role')} value={selectedSubmission.role || EMPTY_VALUE} />
              </section>
            </div>
          </article>
        )}
      </Modal>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="member-project-preview__row">
      <span>{label}</span>
      <strong>{value || EMPTY_VALUE}</strong>
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('member');
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!id) return;
    apiService.getProject(id).then((res) => setProject(res.project));
  }, [id]);

  if (!project) return <p className="text-sm text-muted-foreground">…</p>;

  const fmt = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(iso)) : '—';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link to="/dashboard/projects" className="text-sm text-muted-foreground hover:text-foreground">← {t('projects.title')}</Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{project.name}</h1>
          <Badge variant="secondary" className="capitalize">{project.status}</Badge>
        </div>
        <Progress value={getProjectProgress(project)} />
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">{t('projects.milestones')}</h2>
        <Card className="divide-y divide-border">
          {(project.milestones || []).map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(m.due_on)} {m.completed_on && `• ${fmt(m.completed_on)}`}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{m.status}</Badge>
            </div>
          ))}
          {(!project.milestones || project.milestones.length === 0) && (
            <p className="p-4 text-sm text-muted-foreground">{t('projects.empty')}</p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">{t('projects.updates')}</h2>
        <div className="space-y-3">
          {(project.updates || []).map((u) => (
            <Card key={u.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{u.title || u.kind}</p>
                <span className="text-xs text-muted-foreground">{fmt(u.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{u.body}</p>
            </Card>
          ))}
          {(!project.updates || project.updates.length === 0) && (
            <p className="text-sm text-muted-foreground">{t('projects.noUpdates')}</p>
          )}
        </div>
      </section>
    </div>
  );
}

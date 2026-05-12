import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import type { AICalendarItem, Article, ArticleStatus, CalendarEntry, NewsPrompt, NewsStrategy, StrategicObjective, WeeklyObjective } from '@/services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';

import {
  NewsIcon,
  EyeIcon,
  PenLineIcon,
  ClipboardListIcon,
  CalendarDaysIcon,
  TargetIcon,
  PlusIcon,
  Trash2Icon,
  SearchIcon,
  CheckIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  TrendingUpIcon,
  GlobeIcon,
  LayersIcon,
  ZapIcon,
} from '@icons';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function articleStatusVariant(status: ArticleStatus) {
  switch (status) {
    case 'published': return 'success' as const;
    case 'draft':     return 'warning' as const;
    case 'scheduled': return 'info' as const;
    default:          return 'default' as const;
  }
}

function fmtDate(iso?: string | null, locale = 'fr') {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

// ─────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────

export default function AdminNews() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('overview');

  return (
    <div className="admin-news">
      <header className="admin-news__header">
        <div className="admin-news__header-title">
          <NewsIcon size={22} />
          <h1>{t('news.title')}</h1>
        </div>
        <p className="admin-news__header-sub">{t('news.subtitle')}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" icon={<EyeIcon size={14} />}>{t('news.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="articles" icon={<PenLineIcon size={14} />}>{t('news.tabs.articles')}</TabsTrigger>
          <TabsTrigger value="prompts"  icon={<ClipboardListIcon size={14} />}>{t('news.tabs.prompts')}</TabsTrigger>
          <TabsTrigger value="calendar" icon={<CalendarDaysIcon size={14} />}>{t('news.tabs.calendar')}</TabsTrigger>
          <TabsTrigger value="strategy" icon={<TargetIcon size={14} />}>{t('news.tabs.strategy')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="articles"><ArticlesTab /></TabsContent>
        <TabsContent value="prompts"><PromptsTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="strategy"><StrategyTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Overview
// ─────────────────────────────────────────────

function OverviewTab() {
  const { t, i18n } = useTranslation('admin');
  const [objectives, setObjectives] = useState<WeeklyObjective[]>([]);
  const [articles, setArticles]     = useState<Article[]>([]);
  const [stats, setStats]           = useState<{ published?: number; drafts?: number; this_week?: number; total?: number } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [newLabel, setNewLabel]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    try {
      const [objRes, artRes, stRes] = await Promise.allSettled([
        apiService.adminNewsObjectives(),
        apiService.adminNewsArticles({ per_page: 5 }),
        apiService.adminNewsStats(),
      ]);
      if (objRes.status === 'fulfilled') setObjectives(objRes.value.objectives ?? []);
      if (artRes.status === 'fulfilled') setArticles(artRes.value.articles ?? []);
      if (stRes.status === 'fulfilled')  setStats(stRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const addObjective = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      await apiService.adminNewsCreateObjective({ label, done: false });
      setNewLabel('');
      reload();
    } catch { toast.error(t('common.error')); }
  };

  const toggleObjective = async (obj: WeeklyObjective) => {
    try {
      await apiService.adminNewsUpdateObjective(obj.id, { done: !obj.done });
      setObjectives(prev => prev.map(o => o.id === obj.id ? { ...o, done: !o.done } : o));
    } catch { toast.error(t('common.error')); }
  };

  const deleteObjective = async (id: string) => {
    try {
      await apiService.adminNewsDeleteObjective(id);
      setObjectives(prev => prev.filter(o => o.id !== id));
    } catch { toast.error(t('common.error')); }
  };

  if (loading) return <p className="adm-loading">{t('common.loading')}</p>;

  return (
    <div className="admin-news-overview">
      {/* Stats row */}
      {stats && (
        <div className="admin-news-overview__stats">
          {[
            { label: t('news.overview.stats.published'), value: stats.published ?? '—' },
            { label: t('news.overview.stats.drafts'),    value: stats.drafts ?? '—' },
            { label: t('news.overview.stats.thisWeek'),  value: stats.this_week ?? '—' },
            { label: t('news.overview.stats.total'),     value: stats.total ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="admin-news-overview__stat-card">
              <span className="admin-news-overview__stat-value">{value}</span>
              <span className="admin-news-overview__stat-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="admin-news-overview__cols">
        {/* Weekly objectives */}
        <div className="admin-news-overview__block">
          <div className="admin-news-overview__block-head">
            <h3>{t('news.overview.objectives')}</h3>
          </div>

          <ul className="admin-news-overview__objectives">
            {objectives.length === 0 && (
              <li className="admin-news-overview__objectives-empty">{t('news.overview.noObjectives')}</li>
            )}
            {objectives.map(obj => (
              <li key={obj.id} className={`admin-news-overview__obj${obj.done ? ' admin-news-overview__obj--done' : ''}`}>
                <button
                  type="button"
                  className="admin-news-overview__obj-check"
                  onClick={() => toggleObjective(obj)}
                  aria-label={obj.done ? 'Marquer non fait' : 'Marquer fait'}
                >
                  {obj.done && <CheckIcon size={11} />}
                </button>
                <span className="admin-news-overview__obj-label">{obj.label}</span>
                <button
                  type="button"
                  className="admin-news-overview__obj-del"
                  onClick={() => deleteObjective(obj.id)}
                  aria-label={t('common.delete')}
                >
                  <Trash2Icon size={13} />
                </button>
              </li>
            ))}
          </ul>

          <div className="admin-news-overview__obj-form">
            <input
              ref={inputRef}
              type="text"
              className="adm-input"
              placeholder={t('news.overview.newObjectivePlaceholder')}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addObjective(); }}
            />
            <button type="button" className="adm-btn adm-btn--primary" onClick={addObjective}>
              <PlusIcon size={14} />
              {t('news.overview.addObjective')}
            </button>
          </div>
        </div>

        {/* Recent articles */}
        <div className="admin-news-overview__block">
          <div className="admin-news-overview__block-head">
            <h3>{t('news.overview.recentArticles')}</h3>
          </div>

          {articles.length === 0 ? (
            <p className="admin-news-overview__objectives-empty">{t('news.overview.noRecent')}</p>
          ) : (
            <ul className="admin-news-overview__recent">
              {articles.map(a => (
                <li key={a.id} className="admin-news-overview__recent-item">
                  <span className="admin-news-overview__recent-title">{a.title}</span>
                  <StatusBadge
                    label={t(`news.articles.statuses.${a.status}`)}
                    variant={articleStatusVariant(a.status)}
                  />
                  <span className="admin-news-overview__recent-date">{fmtDate(a.published_at ?? a.created_at, i18n.language)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Articles
// ─────────────────────────────────────────────

const ARTICLE_FORM_DEFAULTS: Partial<Article> = {
  title: '', excerpt: '', locale: 'fr', status: 'draft', category: '', tags: [],
};

function ArticlesTab() {
  const { t, i18n } = useTranslation('admin');
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Partial<Article>>(ARTICLE_FORM_DEFAULTS);
  const [saving, setSaving]       = useState(false);

  const reload = (q = search) =>
    apiService.adminNewsArticles(q ? { q } : undefined)
      .then(d => setArticles(d.articles ?? []))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const openNew    = () => { setEditing(ARTICLE_FORM_DEFAULTS); setModalOpen(true); };
  const openEdit   = (a: Article) => { setEditing(a); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(ARTICLE_FORM_DEFAULTS); };

  const save = async () => {
    if (!editing.title?.trim()) return;
    setSaving(true);
    try {
      if (editing.id) {
        await apiService.adminNewsUpdateArticle(editing.id, editing);
        toast.success(t('common.save'));
      } else {
        await apiService.adminNewsCreateArticle(editing);
        toast.success(t('common.create'));
      }
      closeModal();
      reload();
    } catch { toast.error(t('common.error')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm(t('news.articles.confirmDelete'))) return;
    try { await apiService.adminNewsDeleteArticle(id); reload(); }
    catch { toast.error(t('common.error')); }
  };

  const togglePublish = async (a: Article) => {
    try {
      if (a.status === 'published') await apiService.adminNewsUnpublishArticle(a.id);
      else await apiService.adminNewsPublishArticle(a.id);
      reload();
    } catch { toast.error(t('common.error')); }
  };

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-news-articles">
      <div className="admin-news-articles__toolbar">
        <div className="adm-search">
          <SearchIcon size={15} />
          <input
            type="text"
            className="adm-search__input"
            placeholder={t('news.articles.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); reload(e.target.value); }}
          />
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={openNew}>
          <PlusIcon size={14} />
          {t('news.articles.new')}
        </button>
      </div>

      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableTh>{t('news.articles.title')}</DataTableTh>
            <DataTableTh>{t('news.articles.status')}</DataTableTh>
            <DataTableTh>{t('news.articles.locale')}</DataTableTh>
            <DataTableTh>{t('news.articles.date')}</DataTableTh>
            <DataTableTh>{t('news.articles.actions')}</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableTd className="adm-table__loading">{t('common.loading')}</DataTableTd>
            </DataTableRow>
          ) : filtered.length === 0 ? (
            <DataTableEmpty label={t('news.articles.empty')} />
          ) : filtered.map(a => (
            <DataTableRow key={a.id}>
              <DataTableTd>
                <button type="button" className="adm-table__title-btn" onClick={() => openEdit(a)}>
                  {a.title}
                </button>
              </DataTableTd>
              <DataTableTd>
                <StatusBadge label={t(`news.articles.statuses.${a.status}`)} variant={articleStatusVariant(a.status)} />
              </DataTableTd>
              <DataTableTd>{a.locale?.toUpperCase()}</DataTableTd>
              <DataTableTd>{fmtDate(a.published_at ?? a.created_at, i18n.language)}</DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--xs"
                    onClick={() => togglePublish(a)}
                  >
                    {a.status === 'published' ? t('news.articles.unpublish') : t('news.articles.publish')}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--xs adm-btn--danger"
                    onClick={() => remove(a.id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2Icon size={13} />
                  </button>
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing.id ? t('common.edit') : t('news.articles.new')}
        size="lg"
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>{t('common.cancel')}</button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
              {saving ? <RefreshCwIcon size={14} className="adm-spin" /> : null}
              {t('common.save')}
            </button>
          </>
        }
      >
        <div className="adm-form">
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.articles.form.title')}</label>
            <input
              type="text"
              className="adm-input"
              placeholder={t('news.articles.form.titlePlaceholder')}
              value={editing.title ?? ''}
              onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.articles.form.excerpt')}</label>
            <textarea
              className="adm-textarea"
              rows={3}
              placeholder={t('news.articles.form.excerptPlaceholder')}
              value={editing.excerpt ?? ''}
              onChange={e => setEditing(p => ({ ...p, excerpt: e.target.value }))}
            />
          </div>
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.locale')}</label>
              <select
                className="adm-select"
                value={editing.locale ?? 'fr'}
                onChange={e => setEditing(p => ({ ...p, locale: e.target.value }))}
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
              </select>
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.status')}</label>
              <select
                className="adm-select"
                value={editing.status ?? 'draft'}
                onChange={e => setEditing(p => ({ ...p, status: e.target.value as ArticleStatus }))}
              >
                <option value="draft">{t('news.articles.statuses.draft')}</option>
                <option value="published">{t('news.articles.statuses.published')}</option>
                <option value="scheduled">{t('news.articles.statuses.scheduled')}</option>
              </select>
            </div>
          </div>
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.category')}</label>
              <input
                type="text"
                className="adm-input"
                placeholder={t('news.articles.form.categoryPlaceholder')}
                value={editing.category ?? ''}
                onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.tags')}</label>
              <input
                type="text"
                className="adm-input"
                placeholder={t('news.articles.form.tagsPlaceholder')}
                value={(editing.tags ?? []).join(', ')}
                onChange={e => setEditing(p => ({ ...p, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Prompts
// ─────────────────────────────────────────────

const PROMPT_FORM_DEFAULTS: Partial<NewsPrompt> = { title: '', content: '', category: '' };

function PromptsTab() {
  const { t, i18n } = useTranslation('admin');
  const [prompts, setPrompts]     = useState<NewsPrompt[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Partial<NewsPrompt>>(PROMPT_FORM_DEFAULTS);
  const [saving, setSaving]       = useState(false);

  const reload = () =>
    apiService.adminNewsPrompts()
      .then(d => setPrompts(d.prompts ?? []))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const openNew    = () => { setEditing(PROMPT_FORM_DEFAULTS); setModalOpen(true); };
  const openEdit   = (p: NewsPrompt) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(PROMPT_FORM_DEFAULTS); };

  const save = async () => {
    if (!editing.title?.trim()) return;
    setSaving(true);
    try {
      if (editing.id) await apiService.adminNewsUpdatePrompt(editing.id, editing);
      else await apiService.adminNewsCreatePrompt(editing);
      toast.success(t('common.save'));
      closeModal();
      reload();
    } catch { toast.error(t('common.error')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm(t('news.prompts.confirmDelete'))) return;
    try { await apiService.adminNewsDeletePrompt(id); reload(); }
    catch { toast.error(t('common.error')); }
  };

  return (
    <div className="admin-news-prompts">
      <div className="admin-news-prompts__toolbar">
        <button type="button" className="adm-btn adm-btn--primary" onClick={openNew}>
          <PlusIcon size={14} />
          {t('news.prompts.new')}
        </button>
      </div>

      {loading ? (
        <p className="adm-loading">{t('common.loading')}</p>
      ) : prompts.length === 0 ? (
        <div className="adm-empty-state">
          <ClipboardListIcon size={36} />
          <p>{t('news.prompts.empty')}</p>
        </div>
      ) : (
        <div className="admin-news-prompts__grid">
          {prompts.map(p => (
            <div key={p.id} className="admin-news-prompts__card" onClick={() => openEdit(p)}>
              <div className="admin-news-prompts__card-top">
                <span className="admin-news-prompts__card-title">{p.title}</span>
                {p.category && <StatusBadge label={p.category} variant="info" />}
              </div>
              <p className="admin-news-prompts__card-content">{p.content}</p>
              <div className="admin-news-prompts__card-footer">
                <span className="admin-news-prompts__card-date">{fmtDate(p.created_at, i18n.language)}</span>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost adm-btn--xs adm-btn--danger"
                  onClick={e => { e.stopPropagation(); remove(p.id); }}
                  aria-label={t('common.delete')}
                >
                  <Trash2Icon size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing.id ? t('common.edit') : t('news.prompts.new')}
        size="md"
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>{t('common.cancel')}</button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
              {t('common.save')}
            </button>
          </>
        }
      >
        <div className="adm-form">
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.prompts.form.title')}</label>
            <input
              type="text"
              className="adm-input"
              placeholder={t('news.prompts.form.titlePlaceholder')}
              value={editing.title ?? ''}
              onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.prompts.form.category')}</label>
            <input
              type="text"
              className="adm-input"
              placeholder={t('news.prompts.form.categoryPlaceholder')}
              value={editing.category ?? ''}
              onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
            />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.prompts.form.content')}</label>
            <textarea
              className="adm-textarea"
              rows={6}
              placeholder={t('news.prompts.form.contentPlaceholder')}
              value={editing.content ?? ''}
              onChange={e => setEditing(p => ({ ...p, content: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Calendar
// ─────────────────────────────────────────────

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CLUSTER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6'];
function clusterColor(cluster?: string | null): string {
  if (!cluster) return '#9ca3af';
  let h = 0;
  for (let i = 0; i < cluster.length; i++) h = (h * 31 + cluster.charCodeAt(i)) & 0xffffffff;
  return CLUSTER_COLORS[Math.abs(h) % CLUSTER_COLORS.length];
}

function aiStatusVariant(status: string): string {
  switch (status) {
    case 'approved': case 'generated': case 'published': return 'success';
    case 'planned':  return 'info';
    case 'draft':    return 'warning';
    case 'failed':   return 'danger';
    default:         return 'default';
  }
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function CalendarTab() {
  const { t, i18n } = useTranslation('admin');
  const today = new Date();

  const [viewMode, setViewMode]     = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [year, setYear]             = useState(today.getFullYear());
  const [month, setMonth]           = useState(today.getMonth()); // 0-based
  const [weekStart, setWeekStart]   = useState<Date>(getMonday(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [aiItems, setAiItems]       = useState<AICalendarItem[]>([]);
  const [entries, setEntries]       = useState<CalendarEntry[]>([]);
  const [loading, setLoading]       = useState(true);

  const isFr = i18n.language.startsWith('fr');
  const DAYS = isFr ? DAYS_FR : DAYS_EN;
  const MONTHS = isFr ? MONTHS_FR : MONTHS_EN;

  useEffect(() => {
    setLoading(true);
    if (viewMode === 'weekly') {
      apiService.adminNewsAICalendar({ view: 'weekly', week_start: toISODate(weekStart) })
        .then(d => setAiItems(d.items ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (viewMode === 'monthly') {
      Promise.all([
        apiService.adminNewsCalendar({ year, month: month + 1 }),
        apiService.adminNewsAICalendar({ view: 'monthly', year, month: month + 1 }),
      ])
        .then(([cal, ai]) => { setEntries(cal.entries ?? []); setAiItems(ai.items ?? []); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      apiService.adminNewsAICalendar({ view: 'daily', date: toISODate(selectedDay) })
        .then(d => setAiItems(d.items ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [viewMode, weekStart, year, month, selectedDay]);

  // ── Navigation helpers ──────────────────────
  const prevPeriod = () => {
    if (viewMode === 'daily') {
      const d = new Date(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(d);
    } else if (viewMode === 'weekly') {
      const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d);
    } else {
      if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    }
  };
  const nextPeriod = () => {
    if (viewMode === 'daily') {
      const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d);
    } else if (viewMode === 'weekly') {
      const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d);
    } else {
      if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    }
  };
  const goToday = () => {
    setSelectedDay(today);
    setWeekStart(getMonday(today));
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  // ── Period label ────────────────────────────
  const periodLabel = () => {
    if (viewMode === 'daily') {
      return new Intl.DateTimeFormat(isFr ? 'fr' : 'en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDay);
    } else if (viewMode === 'weekly') {
      const wEnd = new Date(weekStart); wEnd.setDate(wEnd.getDate() + 4);
      const fmt = new Intl.DateTimeFormat(isFr ? 'fr' : 'en', { day: 'numeric', month: 'short' });
      return `${fmt.format(weekStart)} – ${fmt.format(wEnd)} ${weekStart.getFullYear()}`;
    } else {
      return `${MONTHS[month]} ${year}`;
    }
  };

  // ── Weekly view ─────────────────────────────
  const renderWeekly = () => {
    const cols = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      return d;
    });
    return (
      <div className="admin-news-calendar--weekly">
        {cols.map((day, i) => {
          const dateStr = toISODate(day);
          const dayItems = aiItems.filter(it => it.scheduled_for === dateStr);
          const isToday = dateStr === toISODate(today);
          return (
            <div key={i} className={`admin-news-calendar__week-col${isToday ? ' admin-news-calendar__week-col--today' : ''}`}>
              <div className="admin-news-calendar__week-col-header">
                <span className="admin-news-calendar__week-day-name">{DAYS[i]}</span>
                <span className={`admin-news-calendar__week-day-num${isToday ? ' admin-news-calendar__week-day-num--today' : ''}`}>{day.getDate()}</span>
              </div>
              <div className="admin-news-calendar__week-col-body">
                {dayItems.map(item => (
                  <div key={item.id} className="admin-news-calendar__ai-item">
                    <span className="admin-news-calendar__ai-item-keyword">{item.keyword}</span>
                    {item.topic_cluster && (
                      <span className="admin-news-calendar__ai-item-cluster" style={{ background: clusterColor(item.topic_cluster) }}>
                        {item.topic_cluster}
                      </span>
                    )}
                    <span className={`admin-news-calendar__status admin-news-calendar__status--${aiStatusVariant(item.status)}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Monthly view ────────────────────────────
  const renderMonthly = () => {
    const firstDay    = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const entriesForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return entries.filter(e => e.date.startsWith(dateStr));
    };
    const aiForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return aiItems.filter(it => it.scheduled_for === dateStr);
    };

    return (
      <div className="admin-news-calendar__grid">
        {DAYS.map(d => <div key={d} className="admin-news-calendar__day-header">{d}</div>)}
        {cells.map((day, idx) => {
          const isToday = day !== null && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const dayEntries = day ? entriesForDay(day) : [];
          const dayAI = day ? aiForDay(day) : [];
          return (
            <div key={idx} className={['admin-news-calendar__cell', !day ? 'admin-news-calendar__cell--empty' : '', isToday ? 'admin-news-calendar__cell--today' : ''].filter(Boolean).join(' ')}>
              {day && <span className="admin-news-calendar__cell-day">{day}</span>}
              {dayEntries.map(e => (
                <span key={e.id} className={`admin-news-calendar__event admin-news-calendar__event--${e.status}`} title={e.title}>{e.title}</span>
              ))}
              {dayAI.map(it => (
                <span key={`ai-${it.id}`} className="admin-news-calendar__ai-chip" style={{ borderLeft: `3px solid ${clusterColor(it.topic_cluster)}` }} title={it.keyword}>
                  {it.keyword}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Daily view ──────────────────────────────
  const renderDaily = () => (
    <div className="admin-news-calendar__daily-list">
      {aiItems.length === 0 && !loading && (
        <p className="adm-empty-state-text">{t('news.calendar.empty')}</p>
      )}
      {aiItems.map(item => (
        <div key={item.id} className="admin-news-calendar__daily-item">
          <div className="admin-news-calendar__daily-item-header">
            <span className="admin-news-calendar__daily-item-keyword">{item.keyword}</span>
            <span className={`admin-news-calendar__status admin-news-calendar__status--${aiStatusVariant(item.status)}`}>{item.status}</span>
          </div>
          {item.topic_cluster && (
            <span className="admin-news-calendar__ai-item-cluster" style={{ background: clusterColor(item.topic_cluster) }}>
              {item.topic_cluster}
            </span>
          )}
          {item.suggested_title && <p className="admin-news-calendar__daily-item-title">{item.suggested_title}</p>}
          {item.content_angle && <p className="admin-news-calendar__daily-item-angle">{item.content_angle}</p>}
          {item.rationale && <p className="admin-news-calendar__daily-item-rationale">{item.rationale}</p>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="admin-news-calendar">
      <div className="admin-news-calendar__toolbar">
        <div className="admin-news-calendar__view-switcher">
          {(['daily', 'weekly', 'monthly'] as const).map(v => (
            <button key={v} type="button" className={`adm-btn adm-btn--sm${viewMode === v ? ' adm-btn--primary' : ' adm-btn--ghost'}`} onClick={() => setViewMode(v)}>
              {v === 'daily' ? (isFr ? 'Jour' : 'Day') : v === 'weekly' ? (isFr ? 'Semaine' : 'Week') : (isFr ? 'Mois' : 'Month')}
            </button>
          ))}
        </div>
        <div className="admin-news-calendar__nav">
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={prevPeriod}>‹</button>
          <span className="admin-news-calendar__month-label">{periodLabel()}</span>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={nextPeriod}>›</button>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={goToday}>
            {t('news.calendar.today')}
          </button>
        </div>
      </div>

      {loading ? <p className="adm-loading">{t('common.loading')}</p> : (
        <>
          {viewMode === 'weekly'  && renderWeekly()}
          {viewMode === 'monthly' && renderMonthly()}
          {viewMode === 'daily'   && renderDaily()}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Strategy
// ─────────────────────────────────────────────

// Local form type uses strings so textarea/input can hold unsaved text.
interface StrategyForm {
  id?: string;
  goals?: string;
  keywords?: string;
  themes?: string;
  frequency?: string;
  updated_at?: string;
}

// ─── Strategy helpers ────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  foundation:        'Foundation',
  cluster_expansion: 'Cluster Expansion',
  scale:             'Scale',
};

const LOCALE_LABELS: Record<string, string> = {
  fr: 'FR', en: 'EN', es: 'ES', it: 'IT', de: 'DE',
};

const CHART_GRAYS = ['#111111', '#3d3d3d', '#666666', '#8a8a8a', '#aaaaaa', '#cccccc'];

function formatObjectiveType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function StrategyTab() {
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [loading, setLoading]       = useState(true);
  const [openIds, setOpenIds]       = useState<number[]>([]);
  const [activeType, setActiveType] = useState<string>('');
  const [selectedObjective, setSelectedObjective] = useState<StrategicObjective | null>(null);

  useEffect(() => {
    apiService.adminNewsAIStrategicObjectives()
      .then(d => {
        const objs = d.objectives ?? [];
        setObjectives(objs);
        if (objs.length > 0) {
          const sorted = [...objs].sort((a, b) => b.priority - a.priority);
          setActiveType(sorted[0].objective_type);
          setOpenIds([sorted[0].id]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const totalArticles = objectives.reduce((s, o) => s + (o.success_metrics?.articles_per_month_target ?? 0), 0);
  const totalLeads    = objectives.reduce((s, o) => s + (o.success_metrics?.monthly_leads ?? 0), 0);
  const avgPriority   = objectives.length ? Math.round(objectives.reduce((s, o) => s + o.priority, 0) / objectives.length) : 0;

  const sortedByPriority = [...objectives].sort((a, b) => b.priority - a.priority);
  const typeOrder = [...new Set(sortedByPriority.map(o => o.objective_type))];

  const articlesData = sortedByPriority.map(o => ({
    name: o.title.length > 28 ? o.title.slice(0, 28) + '…' : o.title,
    articles: o.success_metrics?.articles_per_month_target ?? 0,
  }));

  const typeData = typeOrder.map(type => ({
    name: formatObjectiveType(type),
    value: objectives.filter(o => o.objective_type === type).length,
  }));

  const localeData = Object.entries(
    objectives.reduce<Record<string, number>>((acc, o) => {
      (o.target_locales ?? []).forEach(l => { acc[l] = (acc[l] ?? 0) + 1; });
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([locale, count]) => ({ name: LOCALE_LABELS[locale] ?? locale.toUpperCase(), count }));

  const phaseData = Object.entries(
    objectives.reduce<Record<string, number>>((acc, o) => {
      const p = o.target_phase ?? 'unknown';
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([phase, count]) => ({ name: PHASE_LABELS[phase] ?? phase, count }));

  const filteredObjectives = sortedByPriority.filter(o => o.objective_type === activeType);
  const firstObjectiveId = filteredObjectives[0]?.id ?? null;

  if (loading) return <p className="adm-loading"><RefreshCwIcon size={14} className="adm-spin" /> Chargement…</p>;

  return (
    <div className="strat-page">

      {/* ── KPI Cards ── */}
      <div className="strat-kpi-row">
        <div className="strat-kpi-card">
          <span className="strat-kpi-value">{totalArticles}</span>
          <span className="strat-kpi-label">Articles / mois (cible)</span>
        </div>
        <div className="strat-kpi-card">
          <span className="strat-kpi-value">{totalLeads}</span>
          <span className="strat-kpi-label">Leads / mois (cible)</span>
        </div>
        <div className="strat-kpi-card">
          <span className="strat-kpi-value">{avgPriority}</span>
          <span className="strat-kpi-label">Priorité moyenne</span>
        </div>
        <div className="strat-kpi-card">
          <span className="strat-kpi-value">{objectives.filter(o => o.is_active).length}</span>
          <span className="strat-kpi-label">Objectifs actifs</span>
        </div>
        <div className="strat-kpi-card">
          <span className="strat-kpi-value">{typeOrder.length}</span>
          <span className="strat-kpi-label">Types d'objectifs</span>
        </div>
        <div className="strat-kpi-card">
          <span className="strat-kpi-value">{localeData.length}</span>
          <span className="strat-kpi-label">Locales couvertes</span>
        </div>
      </div>

      {/* ── Charts row (3 inline) ── */}
      <div className="strat-charts-3col">
        <div className="strat-chart-block">
          <h4 className="strat-chart-title"><ZapIcon size={12} /> Articles / mois par objectif</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={articlesData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="articles" fill="#111111" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="strat-chart-block">
          <h4 className="strat-chart-title">Types d'objectifs</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="44%" outerRadius={72} innerRadius={36} paddingAngle={3}>
                {typeData.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_GRAYS[i % CHART_GRAYS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="strat-chart-block">
          <h4 className="strat-chart-title">Distribution par phase</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={phaseData} margin={{ left: 0, right: 8, top: 4, bottom: 28 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {phaseData.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_GRAYS[i % CHART_GRAYS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Locales row ── */}
      <div className="strat-chart-block strat-chart-block--full">
        <h4 className="strat-chart-title"><GlobeIcon size={12} /> Couverture par locale</h4>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={localeData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#111111" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Objectives by type — tabs ── */}
      <div className="strat-obj-section">
        <div className="strat-obj-header">
          <h3 className="strat-section-title">
            <TargetIcon size={15} /> Objectifs stratégiques ({objectives.length})
          </h3>
        </div>
        <div className="strat-type-tabs">
          {typeOrder.map(type => (
            <button
              key={type}
              type="button"
              className={`strat-type-tab${activeType === type ? ' strat-type-tab--active' : ''}`}
              onClick={() => {
                const firstForType = sortedByPriority.find(objective => objective.objective_type === type);
                setActiveType(type);
                setOpenIds(firstForType ? [firstForType.id] : []);
              }}
            >
              {formatObjectiveType(type)}
              <span className="strat-type-tab__count">
                {objectives.filter(o => o.objective_type === type).length}
              </span>
            </button>
          ))}
        </div>

        <div className="strat-accordions">
          {filteredObjectives.map(obj => {
            const expanded = obj.id === firstObjectiveId || openIds.includes(obj.id);
            const articlesTarget = obj.success_metrics?.articles_per_month_target ?? 0;
            const leadsTarget = obj.success_metrics?.monthly_leads ?? 0;

            return (
            <div key={obj.id} className={`strat-accord${expanded ? ' strat-accord--open' : ''}`}>
              <div className="strat-accord__header">
                <button
                  type="button"
                  className="strat-accord__toggle"
                  onClick={() => {
                    if (obj.id === firstObjectiveId) return;
                    setOpenIds(current => current.includes(obj.id)
                      ? current.filter(id => id !== obj.id)
                      : [...current, obj.id]
                    );
                  }}
                >
                  <span className="strat-accord__left">
                    <span className="strat-accord__rank">#{filteredObjectives.indexOf(obj) + 1}</span>
                    <span className="strat-accord__title">{obj.title}</span>
                  </span>
                  <span className="strat-accord__right">
                    <span className="strat-accord__mini">{articlesTarget} articles/mois</span>
                    <span className="strat-priority-pill">{obj.priority}</span>
                    <ChevronDownIcon size={14} className={`strat-chevron${expanded ? ' strat-chevron--up' : ''}`} />
                  </span>
                </button>
                <button type="button" className="strat-detail-btn strat-detail-btn--header" onClick={() => setSelectedObjective(obj)}>
                  <EyeIcon size={13} /> Détail complet
                </button>
              </div>

              {expanded && (
                <div className="strat-accord__body">
                  <div className="strat-accord__lead">
                    <p className="strat-desc">{obj.description}</p>
                  </div>

                  <div className="strat-summary-grid">
                    <div className="strat-summary-item">
                      <span>Articles/mois</span>
                      <strong>{articlesTarget}</strong>
                    </div>
                    <div className="strat-summary-item">
                      <span>Leads/mois</span>
                      <strong>{leadsTarget}</strong>
                    </div>
                    <div className="strat-summary-item">
                      <span>Poids</span>
                      <strong>{obj.weight}</strong>
                    </div>
                    <div className="strat-summary-item">
                      <span>Phase</span>
                      <strong>{PHASE_LABELS[obj.target_phase] ?? obj.target_phase}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
          })}
        </div>
      </div>

      <Modal
        open={Boolean(selectedObjective)}
        onClose={() => setSelectedObjective(null)}
        title={selectedObjective?.title ?? 'Objectif stratégique'}
        size="lg"
      >
        {selectedObjective && (
          <div className="strat-modal-detail">
            <p className="strat-modal-desc">{selectedObjective.description}</p>

            <div className="strat-modal-grid">
              <div className="strat-modal-panel">
                <span className="strat-tag-label">Cibles marché</span>
                <div className="strat-chip-row">
                  {(selectedObjective.target_locales ?? []).map(locale => (
                    <span key={locale} className="strat-locale-tag">{LOCALE_LABELS[locale] ?? locale.toUpperCase()}</span>
                  ))}
                </div>
                {(selectedObjective.target_countries ?? []).length > 0 && (
                  <p className="strat-compact-note">{selectedObjective.target_countries.join(', ')}</p>
                )}
              </div>

              <div className="strat-modal-panel">
                <span className="strat-tag-label">Pilotage</span>
                <div className="strat-modal-kv"><span>Type</span><strong>{formatObjectiveType(selectedObjective.objective_type)}</strong></div>
                <div className="strat-modal-kv"><span>Priorité</span><strong>{selectedObjective.priority}</strong></div>
                <div className="strat-modal-kv"><span>Poids</span><strong>{selectedObjective.weight}</strong></div>
                <div className="strat-modal-kv"><span>Phase</span><strong>{PHASE_LABELS[selectedObjective.target_phase] ?? selectedObjective.target_phase}</strong></div>
              </div>
            </div>

            <div className="strat-modal-panel">
              <span className="strat-tag-label">KPIs cibles</span>
              <div className="strat-metrics__grid strat-metrics__grid--modal">
                {Object.entries(selectedObjective.success_metrics ?? {}).map(([metricKey, metricValue]) => (
                  <div key={metricKey} className="strat-metric-item">
                    <span className="strat-metric-key">{metricKey.replace(/_/g, ' ')}</span>
                    <span className="strat-metric-val">{metricValue}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="strat-modal-panel">
              <span className="strat-tag-label">Topics</span>
              <div className="strat-chip-row">
                {(selectedObjective.target_topics ?? []).map(topic => <span key={topic} className="strat-tag strat-tag--topic">{topic}</span>)}
              </div>
            </div>

            <div className="strat-modal-panel">
              <span className="strat-tag-label">Keywords</span>
              <div className="strat-chip-row">
                {(selectedObjective.target_keywords ?? []).map(keyword => <span key={keyword} className="strat-tag">{keyword}</span>)}
              </div>
            </div>

            <div className="strat-modal-panel">
              <span className="strat-tag-label">Formats</span>
              <div className="strat-chip-row">
                {(selectedObjective.target_formats ?? []).map(format => <span key={format} className="strat-tag strat-tag--format">{format}</span>)}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


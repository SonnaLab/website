import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import type { Article, ArticleStatus, CalendarEntry, NewsPrompt, NewsStrategy, WeeklyObjective } from '@/services/api';

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

function CalendarTab() {
  const { t, i18n } = useTranslation('admin');
  const today = new Date();
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth()); // 0-based
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isFr = i18n.language.startsWith('fr');
  const DAYS = isFr ? DAYS_FR : DAYS_EN;
  const MONTHS = isFr ? MONTHS_FR : MONTHS_EN;

  useEffect(() => {
    setLoading(true);
    apiService.adminNewsCalendar({ year, month: month + 1 })
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const firstDay    = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const entriesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries.filter(e => e.date.startsWith(dateStr));
  };

  return (
    <div className="admin-news-calendar">
      <div className="admin-news-calendar__nav">
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={prevMonth}>‹</button>
        <span className="admin-news-calendar__month-label">{MONTHS[month]} {year}</span>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={nextMonth}>›</button>
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--sm"
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
        >
          {t('news.calendar.today')}
        </button>
      </div>

      {loading ? <p className="adm-loading">{t('common.loading')}</p> : (
        <div className="admin-news-calendar__grid">
          {DAYS.map(d => <div key={d} className="admin-news-calendar__day-header">{d}</div>)}
          {cells.map((day, idx) => {
            const isToday = day !== null
              && year === today.getFullYear()
              && month === today.getMonth()
              && day === today.getDate();
            const dayEntries = day ? entriesForDay(day) : [];
            return (
              <div
                key={idx}
                className={[
                  'admin-news-calendar__cell',
                  !day ? 'admin-news-calendar__cell--empty' : '',
                  isToday ? 'admin-news-calendar__cell--today' : '',
                ].filter(Boolean).join(' ')}
              >
                {day && <span className="admin-news-calendar__cell-day">{day}</span>}
                {dayEntries.map(e => (
                  <span
                    key={e.id}
                    className={`admin-news-calendar__event admin-news-calendar__event--${e.status}`}
                    title={e.title}
                  >
                    {e.title}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <p className="adm-empty-state-text">{t('news.calendar.empty')}</p>
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

function StrategyTab() {
  const { t } = useTranslation('admin');
  const [form, setForm]       = useState<StrategyForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    apiService.adminNewsStrategy()
      .then(d => {
        const s = d.strategy ?? {};
        setForm({
          ...s,
          goals:    Array.isArray(s.goals)    ? s.goals.join('\n')    : (s.goals    ?? ''),
          keywords: Array.isArray(s.keywords) ? s.keywords.join(', ') : (s.keywords ?? ''),
          themes:   Array.isArray(s.themes)   ? s.themes.join(', ')   : (s.themes   ?? ''),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Partial<NewsStrategy> = {
        frequency: form.frequency,
        goals:    form.goals    ? form.goals.split('\n').map(s => s.trim()).filter(Boolean)    : [],
        keywords: form.keywords ? form.keywords.split(',').map(s => s.trim()).filter(Boolean)  : [],
        themes:   form.themes   ? form.themes.split(',').map(s => s.trim()).filter(Boolean)    : [],
      };
      await apiService.adminNewsSaveStrategy(payload);
      toast.success(t('news.strategy.saved'));
    } catch { toast.error(t('common.error')); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="adm-loading">{t('common.loading')}</p>;

  return (
    <div className="admin-news-strategy">
      <div className="adm-form">
        <div className="adm-form__field">
          <label className="adm-form__label">{t('news.strategy.goals')}</label>
          <textarea
            className="adm-textarea"
            rows={3}
            placeholder={t('news.strategy.goalsPlaceholder')}
            value={form.goals ?? ''}
            onChange={e => setForm(p => ({ ...p, goals: e.target.value }))}
          />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label">{t('news.strategy.keywords')}</label>
          <input
            type="text"
            className="adm-input"
            placeholder={t('news.strategy.keywordsPlaceholder')}
            value={form.keywords ?? ''}
            onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))}
          />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label">{t('news.strategy.themes')}</label>
          <input
            type="text"
            className="adm-input"
            placeholder={t('news.strategy.themesPlaceholder')}
            value={form.themes ?? ''}
            onChange={e => setForm(p => ({ ...p, themes: e.target.value }))}
          />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label">{t('news.strategy.frequency')}</label>
          <input
            type="text"
            className="adm-input"
            placeholder={t('news.strategy.frequencyPlaceholder')}
            value={form.frequency ?? ''}
            onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
          />
        </div>
        <div className="admin-news-strategy__footer">
          <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
            {saving ? <RefreshCwIcon size={14} className="adm-spin" /> : <TargetIcon size={14} />}
            {t('news.strategy.save')}
          </button>
        </div>
      </div>
    </div>
  );
}


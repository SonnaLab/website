import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import type { AICalendarItem, Article, ArticleImageOption, ArticleStatus, CalendarEntry, NewsAIPrompt, NewsStrategy, StrategicObjective, WeeklyObjective } from '@/services/api';

// Fire-and-forget: régénère sitemap.xml sur le serveur après publication/dépublication
async function triggerSitemapRefresh(): Promise<void> {
  const token = import.meta.env.VITE_SITEMAP_REFRESH_TOKEN;
  if (!token) return;
  try {
    await fetch('/sitemap/refresh', {
      method: 'POST',
      headers: { 'X-Sitemap-Token': token },
    });
  } catch {
    // silencieux — le cron horaire prend le relai
  }
}
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MarkdownRenderer } from '@/components/public/blog/MarkdownRenderer';

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
  CheckCircle2Icon,
  RefreshCwIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  TrendingUpIcon,
  GlobeIcon,
  LayersIcon,
  ZapIcon,
  ArrowUpRightIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  MegaphoneOffIcon,
  TerminalIcon,
  LinkedinIcon,
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

interface NewsStatsSummary {
  published?: number;
  drafts?: number;
  this_week?: number;
  total?: number;
  failed?: number;
}

function normalizeNewsStats(payload: any): NewsStatsSummary {
  const stats = payload?.stats ?? payload ?? {};

  return {
    published: stats.published ?? stats.published_articles,
    drafts: stats.drafts ?? stats.draft_articles,
    this_week: stats.this_week,
    total: stats.total ?? stats.total_articles,
    failed: stats.failed_generations,
  };
}

// ─────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────

const NEWS_VALID_TABS = ['overview', 'articles', 'prompts', 'calendar', 'strategy'] as const;
type NewsTabValue = typeof NEWS_VALID_TABS[number];

function readNewsHashTab(): NewsTabValue {
  const hash = window.location.hash.replace('#tab-', '');
  return (NEWS_VALID_TABS as readonly string[]).includes(hash) ? (hash as NewsTabValue) : 'overview';
}

export default function AdminNews() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState<NewsTabValue>(readNewsHashTab);
  const [kpiKey, setKpiKey] = useState(0);
  const refreshKpis = () => setKpiKey(k => k + 1);

  useEffect(() => {
    const onPop = () => setTab(readNewsHashTab());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleTabChange = (v: string) => {
    setTab(v as NewsTabValue);
    history.replaceState(null, '', `#tab-${v}`);
  };

  return (
    <div className="admin-news">
      <header className="admin-news__header">
        <div className="admin-news__header-title">
          <NewsIcon size={22} />
          <h1>{t('news.title')}</h1>
        </div>
        <p className="admin-news__header-sub">{t('news.subtitle')}</p>
      </header>

      <AdminNewsKpis refreshKey={kpiKey} />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview" icon={<EyeIcon size={14} />}>{t('news.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="articles" icon={<PenLineIcon size={14} />}>{t('news.tabs.articles')}</TabsTrigger>
          <TabsTrigger value="prompts"  icon={<ClipboardListIcon size={14} />}>{t('news.tabs.prompts')}</TabsTrigger>
          <TabsTrigger value="calendar" icon={<CalendarDaysIcon size={14} />}>{t('news.tabs.calendar')}</TabsTrigger>
          <TabsTrigger value="strategy" icon={<TargetIcon size={14} />}>{t('news.tabs.strategy')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab setTab={handleTabChange} /></TabsContent>
        <TabsContent value="articles"><ArticlesTab onStatsChange={refreshKpis} /></TabsContent>
        <TabsContent value="prompts"><PromptsTab onStatsChange={refreshKpis} /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="strategy"><StrategyTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminNewsKpis({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation('admin');
  const [stats, setStats] = useState<NewsStatsSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    apiService.adminNewsStats()
      .then(response => {
        if (mounted) setStats(normalizeNewsStats(response));
      })
      .catch(() => {
        if (mounted) setStats(null);
      });

    return () => { mounted = false; };
  }, [refreshKey]);

  const items = [
    { label: t('news.overview.stats.published'), value: stats?.published ?? '—' },
    { label: t('news.overview.stats.drafts'), value: stats?.drafts ?? '—' },
    { label: t('news.overview.stats.thisWeek'), value: stats?.this_week ?? '—' },
    { label: t('news.overview.stats.total'), value: stats?.total ?? '—' },
    { label: t('news.overview.stats.failed'), value: stats?.failed ?? '—', danger: true },
  ];

  return (
    <div className="admin-news-overview__stats">
      {items.map(({ label, value, danger }) => (
        <div key={label} className={`admin-news-overview__stat-card${danger ? ' admin-news-overview__stat-card--danger' : ''}`}>
          <span className="admin-news-overview__stat-value">{value}</span>
          <span className="admin-news-overview__stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Overview
// ─────────────────────────────────────────────

function OverviewTab({ setTab }: { setTab: (tab: string) => void }) {
  const { t, i18n } = useTranslation('admin');
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>([]);
  const [calendarItems, setCalendarItems]             = useState<AICalendarItem[]>([]);
  const [articles, setArticles]                       = useState<Article[]>([]);
  const [loading, setLoading]                         = useState(true);
  const [showAllObj, setShowAllObj]                   = useState(false);
  const OBJ_COLLAPSE = 4;

  const reload = async () => {
    try {
      const weekStart = getMonday(new Date());
      const [objRes, artRes, calRes] = await Promise.allSettled([
        apiService.adminNewsAIStrategicObjectives(),
        apiService.adminNewsArticles({ per_page: 5 }),
        apiService.adminNewsAICalendar({ view: 'weekly', week_start: toISODate(weekStart) }),
      ]);
      if (objRes.status === 'fulfilled') {
        const objs = [...(objRes.value.objectives ?? [])].sort((a, b) => b.priority - a.priority);
        setStrategicObjectives(objs);
      }
      if (artRes.status === 'fulfilled') setArticles(artRes.value.articles ?? []);
      if (calRes.status === 'fulfilled') setCalendarItems(calRes.value.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const coverage = strategicObjectives.map(obj => ({
    obj,
    covered: calendarItems.some(item => itemMatchesObjective(item, obj)),
  }));
  const coveredCount = coverage.filter(x => x.covered).length;

  if (loading) return <p className="adm-loading">{t('common.loading')}</p>;

  return (
    <div className="admin-news-overview">
      <div className="admin-news-overview__cols">
        {/* Strategic objectives coverage */}
        <div className="admin-news-overview__block">
          <div className="admin-news-overview__block-head">
            <h3>
              <TargetIcon size={13} />
              Objectifs stratégiques ({strategicObjectives.length})
            </h3>
            <div className="admin-news-overview__block-right">
              {strategicObjectives.length > 0 && (
                <span className="admin-news-overview__coverage">{coveredCount}/{strategicObjectives.length}</span>
              )}
              <button type="button" className="admin-news-overview__block-link" onClick={() => setTab('strategy')}>
                Détail <ArrowUpRightIcon size={11} />
              </button>
            </div>
          </div>

          {strategicObjectives.length === 0 ? (
            <p className="admin-news-overview__objectives-empty">{t('news.articles.empty')}</p>
          ) : (
            <>
              <ul className="admin-news-overview__objectives">
                {(showAllObj ? coverage : coverage.slice(0, OBJ_COLLAPSE)).map(({ obj, covered }) => (
                  <li key={obj.id} className={`admin-news-overview__obj${covered ? ' admin-news-overview__obj--covered' : ''}`}>
                    <span className={`admin-news-overview__obj-check${covered ? ' admin-news-overview__obj-check--done' : ''}`}>
                      {covered && <CheckIcon size={10} />}
                    </span>
                    <span className="admin-news-overview__obj-label">{obj.title}</span>
                    <span className="admin-news-overview__obj-meta">{obj.success_metrics?.articles_per_month_target ?? 0} art/mois</span>
                  </li>
                ))}
              </ul>
              {coverage.length > OBJ_COLLAPSE && (
                <button
                  type="button"
                  className="admin-news-overview__obj-toggle"
                  onClick={() => setShowAllObj(v => !v)}
                >
                  {showAllObj ? 'Réduire' : `Voir plus (${coverage.length - OBJ_COLLAPSE})`}
                </button>
              )}
            </>
          )}
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

const ARTICLE_LOCALES = ['fr', 'en', 'es', 'de', 'it'];

type ArticleModalMode = 'preview' | 'edit';
type ArticleGenerationModalState = 'idle' | 'running' | 'success' | 'failed';
type ReviewOutcome = 'approve' | 'reject' | 'rebuild';
interface ReviewModalState {
  open: boolean;
  article: Article | null;
  status: 'idle' | 'reviewing' | 'approved' | 'rejected' | 'rebuilt' | 'error';
  message: string;
  errorMsg: string;
}

function articleMetadataValue(article: Partial<Article>, key: string) {
  const metadata = article.lesankofa_metadata ?? {};
  const nested = metadata.metadata && typeof metadata.metadata === 'object' ? metadata.metadata as Record<string, unknown> : {};
  const value = metadata[key] ?? nested[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function articlePublicUrl(article: Partial<Article>) {
  return article.published_url || (article.slug ? `/blog/${article.slug}` : '');
}

function ArticlesTab({ onStatsChange }: { onStatsChange?: () => void }) {
  const { t, i18n } = useTranslation('admin');
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ArticleModalMode>('preview');
  const [editing, setEditing]     = useState<Partial<Article>>(ARTICLE_FORM_DEFAULTS);
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<ArticleGenerationModalState>('idle');
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationResultArticle, setGenerationResultArticle] = useState<Article | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageQuery, setImageQuery] = useState('');
  const [imageResults, setImageResults] = useState<ArticleImageOption[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [actionId, setActionId]   = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<ReviewModalState>({
    open: false, article: null, status: 'idle', message: '', errorMsg: '',
  });
  const [articleGeneration, setArticleGeneration] = useState<NewsAIPrompt | null>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptModalData, setPromptModalData] = useState<NewsAIPrompt | null>(null);
  const [promptModalLoading, setPromptModalLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const PER_PAGE = 10;
  const [previewTab, setPreviewTab] = useState<'web' | 'linkedin' | 'facebook'>('web');
  const [fbConnecting, setFbConnecting] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<{ linkedin: boolean; facebook: boolean }>({ linkedin: false, facebook: false });
  const [editSocialPlatform, setEditSocialPlatform] = useState<'linkedin' | 'facebook' | null>(null);
  const [cameFromPreview, setCameFromPreview] = useState(false);
  const [socialStatus, setSocialStatus] = useState<{
    linkedin: { status: string; posted_at?: string; platform_post_id?: string; error?: string } | null;
    facebook: { status: string; posted_at?: string; platform_post_id?: string; error?: string } | null;
  } | null>(null);
  const [socialPublishing, setSocialPublishing] = useState(false);

  const reload = (q = search, status = statusFilter, pg = page) => {
    setLoading(true);
    return apiService.adminNewsArticles({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: pg, per_page: PER_PAGE })
      .then(d => { setArticles(d.articles ?? []); setTotal(d.total ?? 0); })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    apiService.adminFacebookStatus()
      .then(s => setFbConnected(!!s.connected && !s.expired))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.has('facebook')) {
      toast.success('Facebook connecté avec succès');
      setFbConnected(true);
      params.delete('facebook');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    } else if (params.has('facebook_error')) {
      toast.error(`Connexion Facebook échouée : ${params.get('facebook_error')}`);
      params.delete('facebook_error');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    }
  }, []);

  const openArticle = async (article: Article, mode: ArticleModalMode) => {
    setModalMode(mode);
    setEditing(article);
    setModalOpen(true);
    setArticleGeneration(null);
    setSocialStatus(null);
    setExpandedPosts({ linkedin: false, facebook: false });
    setEditSocialPlatform(null);
    setCameFromPreview(false);
    apiService.adminSocialArticleStatus(article.id).then(setSocialStatus).catch(() => {});
    try {
      const data = await apiService.adminNewsArticle(article.id);
      setEditing(data.article ?? article);
      const transactionId = (data.article ?? article).lesankofa_transaction_id;
      if (transactionId) {
        try {
          const genData = await apiService.adminNewsAIPrompt(String(transactionId));
          setArticleGeneration(genData.prompt ?? null);
        } catch {
          // non-critique, on ignore silencieusement
        }
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setImagePickerOpen(false);
    setEditing(ARTICLE_FORM_DEFAULTS);
    setArticleGeneration(null);
  };

  const openPromptModal = async (a: Article) => {
    if (!a.lesankofa_transaction_id) return;
    setPromptModalData(null);
    setPromptModalOpen(true);
    setPromptModalLoading(true);
    try {
      const data = await apiService.adminNewsAIPrompt(String(a.lesankofa_transaction_id));
      setPromptModalData(data.prompt ?? null);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPromptModalLoading(false);
    }
  };

  const closeGenerationModal = () => {
    if (generationStatus === 'running') return;
    setGenerationStatus('idle');
    setGenerationMessage('');
    setGenerationResultArticle(null);
  };

  const previewGeneratedArticle = () => {
    if (!generationResultArticle) return;
    closeGenerationModal();
    setModalMode('preview');
    setEditing(generationResultArticle);
    setModalOpen(true);
  };

  const save = async () => {
    if (!editing.id || !editing.title?.trim()) return;
    setSaving(true);
    try {
      await apiService.adminNewsUpdateArticle(editing.id, editing);
      toast.success(t('common.save'));
      closeModal();
      reload();
    } catch { toast.error(t('common.error')); }
    finally { setSaving(false); }
  };

  const searchImages = async (query = imageQuery) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setImageResults([]);
      return;
    }

    setImageLoading(true);
    try {
      const data = await apiService.adminNewsArticleImages({
        query: cleanQuery,
        locale: editing.locale || i18n.language || 'fr',
        limit: 12,
      });
      setImageResults(data.images ?? []);
    } catch {
      toast.error(t('news.articles.imagePickerError'));
    } finally {
      setImageLoading(false);
    }
  };

  const openImagePicker = () => {
    const seed = articleMetadataValue(editing, 'feature_image_query') || editing.category || editing.title || '';
    setImageQuery(seed);
    setImagePickerOpen(true);
    searchImages(seed);
  };

  const selectArticleImage = (image: ArticleImageOption) => {
    const url = image.url_regular || image.url || image.url_full || image.url_small || '';
    setEditing(current => ({
      ...current,
      feature_image: url,
      feature_image_alt: image.alt || current.feature_image_alt || current.title || '',
      lesankofa_metadata: {
        ...(current.lesankofa_metadata ?? {}),
        feature_image_query: image.query || imageQuery,
        feature_image_credit: image.credit ?? (current.lesankofa_metadata ?? {}).feature_image_credit,
      },
    }));
    setImagePickerOpen(false);
  };

  // Review IA v3 : purement automatique. L'ouverture du modal déclenche
  // immédiatement le juge holistique côté Lesankofa (titre+meta+contenu vs
  // profil client) — pas de choix manuel Approuver/Rejeter/Regénérer, le
  // modal ne sert qu'à animer l'attente pendant que la décision se prend et,
  // si besoin, qu'un article de remplacement est généré et poussé.
  const openReview = async (a: Article) => {
    const genId = a.lesankofa_transaction_id;
    if (!genId) {
      setReviewModal({ open: true, article: a, status: 'error', message: '', errorMsg: 'Aucun ID de génération associé.' });
      return;
    }
    setReviewModal({ open: true, article: a, status: 'reviewing', message: '', errorMsg: '' });
    try {
      const res = await apiService.adminNewsAIReviewPrompt(String(genId), { action: 'auto' });
      const action = (res?.action as ReviewOutcome | undefined) ?? 'approve';
      if (action === 'reject' && a.status === 'published') {
        await apiService.adminNewsUnpublishArticle(a.id);
        setArticles(prev => prev.map(x => x.id === a.id ? { ...x, status: 'draft' as const } : x));
        triggerSitemapRefresh();
      }
      const doneStatus: ReviewModalState['status'] =
        action === 'approve' ? 'approved' : action === 'rebuild' ? 'rebuilt' : 'rejected';
      setReviewModal(v => ({ ...v, status: doneStatus, message: res?.message || '' }));
      toast.success(
        action === 'approve' ? 'Article validé ✓'
        : action === 'rebuild' ? 'Article hors-sujet — régénéré automatiquement ✓'
        : 'Article rejeté'
      );
      reload(search, statusFilter, page);
      setTimeout(() => setReviewModal(v => ({ ...v, open: false })), 2400);
    } catch (e: any) {
      setReviewModal(v => ({ ...v, status: 'error', errorMsg: e?.response?.data?.detail || e?.response?.data?.error || e?.message || 'Erreur' }));
    }
  };

  const togglePublish = async (article: Article | Partial<Article>) => {
    if (!article.id) return;
    setActionId(`publish-${article.id}`);
    try {
      const data = article.status === 'published'
        ? await apiService.adminNewsUnpublishArticle(article.id)
        : await apiService.adminNewsPublishArticle(article.id);
      if (editing.id === article.id) setEditing(current => ({ ...current, ...(data.article ?? {}) }));
      await reload();
      onStatsChange?.();
      triggerSitemapRefresh();
    } catch { toast.error(t('common.error')); }
    finally { setActionId(null); }
  };

  const generateNextArticle = async () => {
    setGenerating(true);
    setGenerationResultArticle(null);
    setGenerationStatus('running');
    setGenerationMessage(t('news.articles.generation.runningMessage'));
    try {
      const data = await apiService.adminNewsAIGenerateNextArticle();
      setGenerationResultArticle(data.article ?? null);
      setGenerationStatus('success');
      setGenerationMessage(data.article ? t('news.articles.generation.successMessage') : t('news.articles.generation.successWithoutArticle'));
      toast.success(t('news.articles.generateSuccess'));
      await reload();
      onStatsChange?.();
    } catch {
      setGenerationStatus('failed');
      setGenerationMessage(t('news.articles.generation.failedMessage'));
      toast.error(t('news.articles.generateUnavailable'));
    } finally {
      setGenerating(false);
    }
  };

  const gotoArticle = (article: Article | Partial<Article>) => {
    if (article.status !== 'published') return;
    const url = articlePublicUrl(article);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const deleteArticle = async (article: Article) => {
    if (!confirm(t('news.articles.confirmDelete'))) return;
    try {
      await apiService.adminNewsDeleteArticle(article.id);
      toast.success(t('news.articles.deleted'));
      reload(search, statusFilter, page);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const publishToLinkedin = async () => {
    if (!editing.id) return;
    setSocialPublishing(true);
    try {
      await apiService.adminSocialPublishLinkedin(editing.id);
      toast.success('Publication LinkedIn en cours…');
      const data = await apiService.adminSocialArticleStatus(editing.id);
      setSocialStatus(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erreur publication LinkedIn');
    } finally {
      setSocialPublishing(false);
    }
  };

  const publishToFacebook = async () => {
    if (!editing.id) return;
    setSocialPublishing(true);
    try {
      await apiService.adminSocialPublishFacebook(editing.id);
      toast.success('Publication Facebook en cours…');
      const data = await apiService.adminSocialArticleStatus(editing.id);
      setSocialStatus(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erreur publication Facebook');
    } finally {
      setSocialPublishing(false);
    }
  };

  const socialPostUrl = (platform: 'linkedin' | 'facebook', postId?: string | null) => {
    if (!postId) return '#';
    return platform === 'facebook'
      ? `https://www.facebook.com/${postId}`
      : `https://www.linkedin.com/feed/update/${postId}/`;
  };

  const unpublishFromSocial = async (platform: 'linkedin' | 'facebook') => {
    if (!editing.id) return;
    setSocialPublishing(true);
    try {
      await (platform === 'linkedin' ? apiService.adminSocialUnpublishLinkedin(editing.id) : apiService.adminSocialUnpublishFacebook(editing.id));
      toast.success(platform === 'linkedin' ? 'Post LinkedIn supprimé' : 'Post Facebook supprimé');
      const data = await apiService.adminSocialArticleStatus(editing.id);
      setSocialStatus(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erreur lors de la dépublication');
    } finally {
      setSocialPublishing(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const paginated = articles;
  const localeOptions = Array.from(new Set([...ARTICLE_LOCALES, editing.locale].filter(Boolean) as string[]));

  return (
    <div className="admin-news-articles">
      <div className="admin-news-articles__toolbar">
        <div className="admin-news-articles__search-group">
          <div className="adm-search">
            <SearchIcon size={15} />
            <input
              type="text"
              className="adm-search__input"
              placeholder={t('news.articles.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); reload(e.target.value, statusFilter, 1); }}
            />
          </div>
          <select
            className="adm-select adm-select--sm"
            value={statusFilter}
            onChange={e => { const v = e.target.value; setStatusFilter(v); setPage(1); reload(search, v, 1); }}
            aria-label={t('news.articles.allStatuses')}
          >
            <option value="">{t('news.articles.allStatuses')}</option>
            <option value="draft">{t('news.articles.statuses.draft')}</option>
            <option value="scheduled">{t('news.articles.statuses.scheduled')}</option>
            <option value="published">{t('news.articles.statuses.published')}</option>
          </select>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={generateNextArticle} disabled={generating}>
          {generating ? <RefreshCwIcon size={14} className="adm-spin" /> : <ZapIcon size={14} />}
          {t('news.articles.generate')}
        </button>
      </div>

      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableTh>N°</DataTableTh>
            <DataTableTh>{t('news.articles.cover')}</DataTableTh>
            <DataTableTh>{t('news.articles.title')}</DataTableTh>
            <DataTableTh>{t('news.articles.status')}</DataTableTh>
            <DataTableTh>{t('news.articles.locale')}</DataTableTh>
            <DataTableTh>{t('news.articles.format')}</DataTableTh>
            <DataTableTh>{t('news.articles.date')}</DataTableTh>
            <DataTableTh>{t('news.articles.actions')}</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableTd className="adm-table__loading">{t('common.loading')}</DataTableTd>
            </DataTableRow>
          ) : articles.length === 0 ? (
            <DataTableEmpty label={t('news.articles.empty')} />
          ) : paginated.map(a => (
            <DataTableRow key={a.id}>
              <DataTableTd>
                <span className="adm-table__id-cell">{a.lesankofa_transaction_id ? `#${a.lesankofa_transaction_id}` : '—'}</span>
              </DataTableTd>
              <DataTableTd>
                {a.feature_image ? (
                  <img
                    src={a.feature_image}
                    alt={a.feature_image_alt || a.title || ''}
                    className="adm-table__cover-thumb"
                    loading="lazy"
                  />
                ) : (
                  <span className="adm-table__cover-missing" title={t('news.articles.noContent')}>—</span>
                )}
              </DataTableTd>
              <DataTableTd>
                <div className="admin-news-articles__title-cell">
                  <button type="button" className="adm-table__title-btn" onClick={() => { setPreviewTab('web'); openArticle(a, 'preview'); }}>
                    {a.title.length > 60 ? `${a.title.slice(0, 60)}…` : a.title}
                  </button>
                </div>
              </DataTableTd>
              <DataTableTd>
                <StatusBadge label={t(`news.articles.statuses.${a.status}`)} variant={articleStatusVariant(a.status)} />
              </DataTableTd>
              <DataTableTd>{a.locale?.toUpperCase()}</DataTableTd>
              <DataTableTd>{articleMetadataValue(a, 'article_format') || '—'}</DataTableTd>
              <DataTableTd>{fmtDate(a.published_at ?? a.created_at, i18n.language)}</DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--xs"
                    onClick={() => openArticle(a, 'preview')}
                    aria-label={t('news.articles.preview')}
                    title={t('news.articles.preview')}
                  >
                    <EyeIcon size={13} />
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--xs"
                    onClick={() => openArticle(a, 'edit')}
                    aria-label={t('common.edit')}
                    title={t('common.edit')}
                  >
                    <PenLineIcon size={13} />
                  </button>
                  {!!a.lesankofa_transaction_id && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--xs"
                      onClick={() => openReview(a)}
                      disabled={reviewModal.open && reviewModal.article?.id === a.id && reviewModal.status === 'reviewing'}
                      aria-label="Review IA"
                      title="Review IA"
                    >
                      <RefreshCwIcon size={13} />
                    </button>
                  )}
                  {!!a.lesankofa_transaction_id && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--xs"
                      onClick={e => { e.stopPropagation(); openPromptModal(a); }}
                      aria-label="Détails du prompt"
                      title="Détails du prompt"
                    >
                      <TerminalIcon size={13} />
                    </button>
                  )}
                  {a.status === 'published' && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--xs"
                      onClick={() => gotoArticle(a)}
                      aria-label={t('news.articles.goto')}
                      title={t('news.articles.goto')}
                    >
                      <ArrowUpRightIcon size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--xs adm-btn--danger"
                    onClick={() => deleteArticle(a)}
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                  >
                    <Trash2Icon size={13} />
                  </button>
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {totalPages > 1 && (
        <div className="adm-pagination">
          <span className="adm-pagination__info">
            {total} &middot; {page} / {totalPages}
          </span>
          <div className="adm-pagination__nav">
            <button
              type="button"
              className="adm-btn adm-btn--ghost adm-btn--xs"
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); reload(search, statusFilter, p); }}
            >
              <ChevronLeftIcon size={13} />
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--ghost adm-btn--xs"
              disabled={page >= totalPages}
              onClick={() => { const p = page + 1; setPage(p); reload(search, statusFilter, p); }}
            >
              <ChevronRightIcon size={13} />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalMode === 'edit' ? t('common.edit') : t('news.articles.preview')}
        size="lg"
        footer={
          modalMode === 'edit' ? (
            <>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => { if (cameFromPreview) { setEditSocialPlatform(null); setModalMode('preview'); } else { closeModal(); } }}
              >
                {t('common.cancel')}
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
                {saving ? <RefreshCwIcon size={14} className="adm-spin" /> : null}
                {t('common.save')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>{t('common.cancel')}</button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => { setEditSocialPlatform(previewTab === 'web' ? null : previewTab); setCameFromPreview(true); setModalMode('edit'); }}
                disabled={!editing.id}
              >
                <PenLineIcon size={14} />
                {t('common.edit')}
              </button>
              {previewTab === 'web' ? (
                <>
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => togglePublish(editing)} disabled={!editing.id || actionId === `publish-${editing.id}`}>
                    {actionId === `publish-${editing.id}` ? <RefreshCwIcon size={14} className="adm-spin" /> : editing.status === 'published' ? <MegaphoneOffIcon size={14} /> : <MegaphoneIcon size={14} />}
                    {editing.status === 'published' ? t('news.articles.unpublish') : t('news.articles.publish')}
                  </button>
                  <button type="button" className="adm-btn adm-btn--primary" onClick={() => gotoArticle(editing)} disabled={editing.status !== 'published'}>
                    <ArrowUpRightIcon size={14} />
                    {t('news.articles.goto')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => socialStatus?.[previewTab]?.status === 'posted' ? unpublishFromSocial(previewTab) : (previewTab === 'linkedin' ? publishToLinkedin() : publishToFacebook())}
                    disabled={
                      socialPublishing ||
                      (socialStatus?.[previewTab]?.status !== 'posted' && (editing.status !== 'published' || socialStatus?.[previewTab]?.status === 'pending'))
                    }
                  >
                    {socialPublishing
                      ? <RefreshCwIcon size={14} className="adm-spin" />
                      : socialStatus?.[previewTab]?.status === 'posted' ? <MegaphoneOffIcon size={14} /> : <MegaphoneIcon size={14} />}
                    {socialStatus?.[previewTab]?.status === 'posted' ? 'Dépublier' : 'Publier'}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--primary"
                    onClick={() => window.open(socialPostUrl(previewTab, socialStatus?.[previewTab]?.platform_post_id), '_blank')}
                    disabled={socialStatus?.[previewTab]?.status !== 'posted'}
                  >
                    <ArrowUpRightIcon size={14} />
                    Voir le post
                  </button>
                </>
              )}
            </>
          )
        }
      >
        {modalMode === 'preview' ? (
          <div>
            <div className="adm-tabs__list" style={{ marginBottom: 16 }}>
              <button type="button" role="tab" aria-selected={previewTab === 'web'} className={`adm-tabs__trigger${previewTab === 'web' ? ' adm-tabs__trigger--active' : ''}`} onClick={() => setPreviewTab('web')}>
                <GlobeIcon size={13} /> Web
              </button>
              <button type="button" role="tab" aria-selected={previewTab === 'linkedin'} className={`adm-tabs__trigger${previewTab === 'linkedin' ? ' adm-tabs__trigger--active' : ''}`} onClick={() => setPreviewTab('linkedin')}>
                <LinkedinIcon size={13} /> LinkedIn
                {socialStatus?.linkedin?.status === 'posted' && <StatusBadge label="Publié" variant="success" />}
              </button>
              <button type="button" role="tab" aria-selected={previewTab === 'facebook'} className={`adm-tabs__trigger${previewTab === 'facebook' ? ' adm-tabs__trigger--active' : ''}`} onClick={() => setPreviewTab('facebook')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
                {fbConnected && <span className="adm-tabs__connected-dot" title="Compte Facebook connecté" />}
                {socialStatus?.facebook?.status === 'posted' && <StatusBadge label="Publié" variant="success" />}
              </button>
            </div>
            {previewTab === 'web' ? (
              <article className="admin-news-articles__preview">
                {editing.feature_image ? (
                  <div className="admin-news-articles__preview-hero">
                    <img src={editing.feature_image} alt={editing.feature_image_alt || editing.title || ''} />
                    {editing.feature_image_alt && (
                      <span className="admin-news-articles__preview-hero-credit">{articleMetadataValue(editing, 'feature_image_credit') || editing.feature_image_alt}</span>
                    )}
                  </div>
                ) : (
                  <div className="admin-news-articles__preview-hero admin-news-articles__preview-hero--empty">
                    <CameraIcon size={28} />
                    <span>Pas d'image</span>
                  </div>
                )}

                <div className="admin-news-articles__preview-body">
                  <div className="admin-news-articles__preview-topbar">
                    <div className="admin-news-articles__preview-badges">
                      {editing.category && <span className="preview-badge preview-badge--category">{editing.category}</span>}
                      <span className="preview-badge">{formatOptional(editing.locale).toUpperCase()}</span>
                      {articleMetadataValue(editing, 'article_format') && (
                        <span className="preview-badge preview-badge--format">{articleMetadataValue(editing, 'article_format')}</span>
                      )}
                    </div>
                    {editing.status && (
                      <StatusBadge label={t(`news.articles.statuses.${editing.status}`)} variant={articleStatusVariant(editing.status)} />
                    )}
                  </div>

                  <h2 className="admin-news-articles__preview-title">{editing.title || t('news.articles.noContent')}</h2>

                  {editing.excerpt && (
                    <p className="admin-news-articles__preview-excerpt">{editing.excerpt}</p>
                  )}

                  <div className="admin-news-articles__preview-datebar">
                    {editing.reading_time_minutes && <span>{editing.reading_time_minutes} min de lecture</span>}
                    <span>{fmtDate(editing.published_at ?? editing.created_at, i18n.language)}</span>
                    {editing.lesankofa_transaction_id && <span className="preview-badge--number">#{editing.lesankofa_transaction_id}</span>}
                  </div>

                  {!!editing.tags?.length && (
                    <div className="admin-news-articles__tags">
                      {editing.tags.map(tag => <span key={tag}>#{tag}</span>)}
                    </div>
                  )}

                  {articleGeneration?.push_status === 'failed' && (
                    <div className="admin-news-articles__push-error">
                      <AlertTriangleIcon size={15} />
                      <div>
                        <strong>Push échoué</strong>
                        <p>{articleGeneration.push_error_message || articleGeneration.error_message || 'Erreur inconnue'}</p>
                      </div>
                    </div>
                  )}

                  <div className="admin-news-articles__preview-divider" />

                  <div className="admin-news-articles__markdown">
                    {editing.content_markdown ? <MarkdownRenderer content={editing.content_markdown} /> : <p className="preview-no-content">{t('news.articles.noContent')}</p>}
                  </div>
                </div>
              </article>
            ) : previewTab === 'linkedin' ? (
              <div className="admin-news-articles__social-preview">

                {/* ── LinkedIn ── */}
                <div className="spc spc--linkedin">
                  <div className="spc__bar spc__bar--linkedin">
                    <LinkedinIcon size={14} />
                    <span>Aperçu LinkedIn</span>
                  </div>
                  <div className="spc__li-previews">

                    {/* Desktop */}
                    <div className="spc__li-col">
                      <span className="spc__preview-label">Desktop</span>
                      <div className="spc__feed spc__feed--linkedin">
                        <div className="spc__post">
                          <div className="spc__author">
                            <img className="spc__favicon" src="/favicon/favicon-32x32.png" alt="SonnaLab" />
                            <div className="spc__author-info">
                              <strong>SonnaLab</strong>
                              <span>Page entreprise · {fmtDate(editing.published_at ?? editing.created_at, i18n.language)}</span>
                            </div>
                          </div>
                          <p className={`spc__text${expandedPosts.linkedin ? '' : ' spc__text--clamped'}`}>{editing.linkedin_post_text || editing.title}</p>
                          {(editing.linkedin_post_text || editing.title || '').length > 180 && (
                            <button type="button" className="spc__see-more" onClick={() => setExpandedPosts(p => ({ ...p, linkedin: !p.linkedin }))}>
                              {expandedPosts.linkedin ? 'Voir moins' : 'Voir plus'}
                            </button>
                          )}
                          {!editing.linkedin_post_text && !!editing.tags?.length && (
                            <p className="spc__hashtags">{editing.tags.slice(0, 4).map(tag => `#${tag}`).join(' ')}</p>
                          )}
                          {editing.feature_image && (
                            <img className="spc__native-image" src={editing.feature_image} alt={editing.feature_image_alt || ''} />
                          )}
                          <div className="spc__reactions">
                            <em>42 réactions</em>
                            <span>12 commentaires · 5 partages</span>
                          </div>
                          <div className="spc__actions spc__actions--linkedin">
                            <button type="button">J'aime</button>
                            <button type="button">Commenter</button>
                            <button type="button">Envoyer</button>
                            <button type="button">Partager</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="spc__li-col">
                      <span className="spc__preview-label">Mobile</span>
                      <div className="spc__feed spc__feed--linkedin">
                        <div className="spc__post">
                          <div className="spc__author">
                            <img className="spc__favicon" src="/favicon/favicon-32x32.png" alt="SonnaLab" />
                            <div className="spc__author-info">
                              <strong>SonnaLab</strong>
                              <span>Page entreprise · {fmtDate(editing.published_at ?? editing.created_at, i18n.language)}</span>
                            </div>
                          </div>
                          <p className={`spc__text${expandedPosts.linkedin ? '' : ' spc__text--clamped'}`}>{editing.linkedin_post_text || editing.title}</p>
                          {(editing.linkedin_post_text || editing.title || '').length > 180 && (
                            <button type="button" className="spc__see-more" onClick={() => setExpandedPosts(p => ({ ...p, linkedin: !p.linkedin }))}>
                              {expandedPosts.linkedin ? 'Voir moins' : 'Voir plus'}
                            </button>
                          )}
                          {!editing.linkedin_post_text && !!editing.tags?.length && (
                            <p className="spc__hashtags">{editing.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}</p>
                          )}
                          {editing.feature_image && (
                            <img className="spc__native-image" src={editing.feature_image} alt={editing.feature_image_alt || ''} />
                          )}
                          <div className="spc__reactions">
                            <em>42 réactions</em>
                            <span>12 commentaires</span>
                          </div>
                          <div className="spc__actions spc__actions--linkedin">
                            <button type="button">J'aime</button>
                            <button type="button">Commenter</button>
                            <button type="button">Envoyer</button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="admin-news-articles__social-preview">

                {/* ── Facebook ── */}
                <div className="spc spc--facebook">
                  <div className="spc__bar spc__bar--facebook">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span>Aperçu Facebook</span>
                    {fbConnected ? (
                      <button
                        type="button"
                        className="spc__bar-connect-btn spc__bar-connect-btn--icon"
                        disabled={fbConnecting}
                        title="Reconnecter Facebook (par ex. après l'ajout d'une nouvelle permission côté Meta)"
                        onClick={async () => {
                          setFbConnecting(true);
                          try {
                            const { url } = await apiService.adminFacebookConnectUrl();
                            window.location.href = url;
                          } catch (e: any) {
                            toast.error(e?.response?.data?.error || 'Erreur de connexion à Facebook');
                            setFbConnecting(false);
                          }
                        }}
                      >
                        <RefreshCwIcon size={12} className={fbConnecting ? 'adm-spin' : undefined} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="spc__bar-connect-btn"
                        disabled={fbConnecting}
                        onClick={async () => {
                          setFbConnecting(true);
                          try {
                            const { url } = await apiService.adminFacebookConnectUrl();
                            window.location.href = url;
                          } catch (e: any) {
                            toast.error(e?.response?.data?.error || 'Erreur de connexion à Facebook');
                            setFbConnecting(false);
                          }
                        }}
                      >
                        {fbConnecting ? <RefreshCwIcon size={12} className="adm-spin" /> : null}
                        Connecter Facebook
                      </button>
                    )}
                  </div>
                  <div className="spc__fb-previews">

                    {/* Desktop — 1.91:1, image full-width + info strip */}
                    <div className="spc__li-col">
                      <span className="spc__preview-label">Desktop</span>
                      <div className="spc__feed spc__feed--facebook">
                        <div className="spc__post">
                          <div className="spc__author">
                            <img className="spc__favicon spc__favicon--fb" src="/favicon/favicon-32x32.png" alt="SonnaLab" />
                            <div className="spc__author-info">
                              <strong>SonnaLab <span className="spc__verified">v</span></strong>
                              <span>{fmtDate(editing.published_at ?? editing.created_at, i18n.language)} · Public</span>
                            </div>
                          </div>
                          <p className={`spc__text${expandedPosts.facebook ? '' : ' spc__text--clamped'}`}>{editing.facebook_post_text || editing.title}</p>
                          {(editing.facebook_post_text || editing.title || '').length > 180 && (
                            <button type="button" className="spc__see-more" onClick={() => setExpandedPosts(p => ({ ...p, facebook: !p.facebook }))}>
                              {expandedPosts.facebook ? 'Voir moins' : 'Voir plus'}
                            </button>
                          )}
                          {editing.feature_image && (
                            <img className="spc__native-image" src={editing.feature_image} alt={editing.feature_image_alt || ''} />
                          )}
                          <div className="spc__reactions spc__reactions--facebook">
                            <em>118 réactions</em>
                            <span>34 commentaires · 21 partages</span>
                          </div>
                          <div className="spc__actions spc__actions--facebook">
                            <button type="button">J'aime</button>
                            <button type="button">Commenter</button>
                            <button type="button">Partager</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile — 1:1 square crop, narrower card */}
                    <div className="spc__li-col">
                      <span className="spc__preview-label">Mobile</span>
                      <div className="spc__feed spc__feed--facebook">
                        <div className="spc__post">
                          <div className="spc__author">
                            <img className="spc__favicon spc__favicon--fb" src="/favicon/favicon-32x32.png" alt="SonnaLab" />
                            <div className="spc__author-info">
                              <strong>SonnaLab <span className="spc__verified">v</span></strong>
                              <span>{fmtDate(editing.published_at ?? editing.created_at, i18n.language)}</span>
                            </div>
                          </div>
                          <p className={`spc__text${expandedPosts.facebook ? '' : ' spc__text--clamped'}`}>{editing.facebook_post_text || editing.title}</p>
                          {(editing.facebook_post_text || editing.title || '').length > 180 && (
                            <button type="button" className="spc__see-more" onClick={() => setExpandedPosts(p => ({ ...p, facebook: !p.facebook }))}>
                              {expandedPosts.facebook ? 'Voir moins' : 'Voir plus'}
                            </button>
                          )}
                          {editing.feature_image && (
                            <img className="spc__native-image" src={editing.feature_image} alt={editing.feature_image_alt || ''} />
                          )}
                          <div className="spc__reactions spc__reactions--facebook">
                            <em>118 réactions</em>
                            <span>34 commentaires</span>
                          </div>
                          <div className="spc__actions spc__actions--facebook">
                            <button type="button">J'aime</button>
                            <button type="button">Commenter</button>
                            <button type="button">Partager</button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </div>
        ) : editSocialPlatform ? (
          <div className="adm-form">
            <div className="adm-form__field">
              <label className="adm-form__label">
                Texte du post {editSocialPlatform === 'linkedin' ? 'LinkedIn' : 'Facebook'}
              </label>
              <textarea
                className="adm-input"
                rows={12}
                value={(editSocialPlatform === 'linkedin' ? editing.linkedin_post_text : editing.facebook_post_text) ?? ''}
                onChange={e => setEditing(p => ({
                  ...p,
                  [editSocialPlatform === 'linkedin' ? 'linkedin_post_text' : 'facebook_post_text']: e.target.value,
                }))}
              />
            </div>
          </div>
        ) : (
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
            <label className="adm-form__label">{t('news.articles.form.slug')}</label>
            <input
              type="text"
              className="adm-input"
              placeholder={t('news.articles.form.slugPlaceholder')}
              value={editing.slug ?? ''}
              onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))}
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
                {localeOptions.map(locale => (
                  <option key={locale} value={locale}>{locale.toUpperCase()}</option>
                ))}
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
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.seoTitle')}</label>
              <input
                type="text"
                className="adm-input"
                placeholder={t('news.articles.form.seoTitlePlaceholder')}
                value={editing.seo_title ?? ''}
                onChange={e => setEditing(p => ({ ...p, seo_title: e.target.value }))}
              />
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.readingTime')}</label>
              <input
                type="number"
                className="adm-input"
                min={1}
                value={editing.reading_time_minutes ?? 5}
                onChange={e => setEditing(p => ({ ...p, reading_time_minutes: Number(e.target.value) || 5 }))}
              />
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.articles.form.metaDescription')}</label>
            <textarea
              className="adm-textarea"
              rows={3}
              placeholder={t('news.articles.form.metaDescriptionPlaceholder')}
              value={editing.meta_description ?? ''}
              onChange={e => setEditing(p => ({ ...p, meta_description: e.target.value }))}
            />
          </div>
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.featureImage')}</label>
              <div className="admin-news-articles__image-input">
                <input
                  type="text"
                  className="adm-input"
                  placeholder={t('news.articles.form.featureImagePlaceholder')}
                  value={editing.feature_image ?? ''}
                  onChange={e => setEditing(p => ({ ...p, feature_image: e.target.value }))}
                />
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost admin-news-articles__image-button"
                  onClick={openImagePicker}
                  aria-label={t('news.articles.imagePickerOpen')}
                  title={t('news.articles.imagePickerOpen')}
                >
                  <CameraIcon size={14} />
                </button>
              </div>
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label">{t('news.articles.form.featureImageAlt')}</label>
              <input
                type="text"
                className="adm-input"
                placeholder={t('news.articles.form.featureImageAltPlaceholder')}
                value={editing.feature_image_alt ?? ''}
                onChange={e => setEditing(p => ({ ...p, feature_image_alt: e.target.value }))}
              />
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label">{t('news.articles.form.content')}</label>
            <textarea
              className="adm-textarea admin-news-articles__content-input"
              rows={14}
              placeholder={t('news.articles.form.contentPlaceholder')}
              value={editing.content_markdown ?? ''}
              onChange={e => setEditing(p => ({ ...p, content_markdown: e.target.value }))}
            />
          </div>
        </div>
        )}
      </Modal>

      <Modal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        title={t('news.articles.imagePickerTitle')}
        size="lg"
        footer={
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setImagePickerOpen(false)}>
            {t('common.cancel')}
          </button>
        }
      >
        <div className="admin-news-image-picker">
          {editing.feature_image && (
            <div className="admin-news-image-picker__current">
              <img src={editing.feature_image} alt={editing.feature_image_alt || editing.title || ''} />
              <div>
                <span>{t('news.articles.imagePickerCurrent')}</span>
                <strong>{editing.feature_image_alt || editing.title || editing.feature_image}</strong>
              </div>
            </div>
          )}

          <div className="admin-news-image-picker__search">
            <div className="adm-search">
              <SearchIcon size={15} />
              <input
                type="text"
                className="adm-search__input"
                placeholder={t('news.articles.imagePickerSearchPlaceholder')}
                value={imageQuery}
                onChange={event => setImageQuery(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') searchImages(); }}
              />
            </div>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => searchImages()} disabled={imageLoading}>
              {imageLoading ? <RefreshCwIcon size={14} className="adm-spin" /> : <SearchIcon size={14} />}
              {t('news.articles.imagePickerSearch')}
            </button>
          </div>

          {imageLoading ? (
            <p className="adm-loading">{t('news.articles.imagePickerLoading')}</p>
          ) : imageResults.length === 0 ? (
            <p className="adm-empty-state-text">{t('news.articles.imagePickerEmpty')}</p>
          ) : (
            <div className="admin-news-image-picker__grid">
              {imageResults.map(image => {
                const imageUrl = image.url_small || image.url || image.url_regular;
                const credit = image.credit?.photographer ? String(image.credit.photographer) : 'Unsplash';

                return (
                  <button
                    key={image.id || image.url}
                    type="button"
                    className="admin-news-image-picker__card"
                    onClick={() => selectArticleImage(image)}
                  >
                    {imageUrl && <img src={imageUrl} alt={image.alt || image.query || ''} loading="lazy" />}
                    <span>{image.alt || image.query || t('news.articles.imagePickerSelect')}</span>
                    <small>{t('news.articles.imagePickerCredit', { photographer: credit })}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={reviewModal.open}
        onClose={() => reviewModal.status !== 'reviewing' && setReviewModal(v => ({ ...v, open: false }))}
        title="Review IA"
        size="sm"
        footer={null}
      >
        <div className="adm-review-modal">
          <p className="adm-review-modal__article-title">{reviewModal.article?.title}</p>

          {reviewModal.status === 'reviewing' && (
            <div className="adm-review-modal__done">
              <RefreshCwIcon size={38} className="adm-spin" />
              <p>Vérification automatique en cours…</p>
            </div>
          )}

          {reviewModal.status === 'approved' && (
            <div className="adm-review-modal__done adm-review-modal__done--success">
              <CheckCircle2Icon size={38} />
              <p>Article validé</p>
              {reviewModal.message && <p className="adm-review-modal__reason">{reviewModal.message}</p>}
            </div>
          )}

          {reviewModal.status === 'rebuilt' && (
            <div className="adm-review-modal__done adm-review-modal__done--warn">
              <RefreshCwIcon size={38} />
              <p>Article hors-sujet — régénéré automatiquement</p>
              {reviewModal.message && <p className="adm-review-modal__reason">{reviewModal.message}</p>}
            </div>
          )}

          {reviewModal.status === 'rejected' && (
            <div className="adm-review-modal__done adm-review-modal__done--warn">
              <AlertTriangleIcon size={38} />
              <p>Article rejeté</p>
              {reviewModal.message && <p className="adm-review-modal__reason">{reviewModal.message}</p>}
            </div>
          )}

          {reviewModal.status === 'error' && (
            <div className="adm-review-modal__done adm-review-modal__done--error">
              <XCircleIcon size={38} />
              <p>{reviewModal.errorMsg}</p>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={promptModalOpen}
        onClose={() => { setPromptModalOpen(false); setPromptModalData(null); }}
        title={promptModalData ? `Prompt #${promptModalData.generation_id}` : 'Prompt details'}
        size="lg"
        footer={
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setPromptModalOpen(false); setPromptModalData(null); }}>
            {t('common.cancel')}
          </button>
        }
      >
        {promptModalLoading && <p className="adm-loading">{t('common.loading')}</p>}
        {!promptModalLoading && promptModalData && (
          <div className="admin-news-prompts__modal">
            <div className="admin-news-prompts__modal-head">
              <div>
                <h3>{promptModalData.title || promptModalData.keyword || t('news.prompts.noPrompt')}</h3>
                <p>{formatOptional(promptModalData.keyword)} · {formatOptional(promptModalData.locale).toUpperCase()} · {formatOptional(promptModalData.article_format)}</p>
              </div>
              {(() => {
                const si = aiPromptStatusInfo(promptModalData);
                return (
                  <div className="admin-news-prompts__status">
                    <StatusBadge label={t(si.labelKey, { defaultValue: si.fallback })} variant={si.variant} />
                    {si.detailKey && <span className="admin-news-prompts__status-detail">{t(si.detailKey)}</span>}
                  </div>
                );
              })()}
            </div>

            <div className="admin-news-prompts__reason-box">
              <span>{t('news.prompts.reason')}</span>
              <p>{promptReason(promptModalData, t('news.prompts.noReason'))}</p>
            </div>

            <div className="admin-news-prompts__details">
              {([
                [t('news.prompts.client'),          formatOptional(promptModalData.client_id)],
                [t('news.prompts.generationStatus'), t(`news.prompts.statuses.${promptModalData.status}`, { defaultValue: promptModalData.status })],
                [t('news.prompts.pushStatus'),       t(`news.prompts.pushStatuses.${promptModalData.push_status || 'unknown'}`, { defaultValue: formatOptional(promptModalData.push_status) })],
                [t('news.prompts.pushEndpoint'),     formatOptional(promptModalData.push_endpoint)],
                [t('news.prompts.model'),            formatOptional(promptModalData.model_used)],
                [t('news.prompts.provider'),         formatOptional(promptModalData.provider)],
                [t('news.prompts.temperature'),      formatOptional(promptModalData.temperature)],
                [t('news.prompts.tokens'),           formatOptional(promptModalData.total_tokens)],
                [t('news.prompts.duration'),         formatDuration(promptModalData.generation_time_ms)],
                [t('news.prompts.createdAt'),        fmtDate(promptModalData.created_at, i18n.language)],
                [t('news.prompts.completedAt'),      promptModalData.completed_at ? fmtDate(promptModalData.completed_at, i18n.language) : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="admin-news-prompts__detail">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="admin-news-prompts__prompt-grid">
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.systemPrompt')}</h4>
                <pre>{promptModalData.prompt_system || t('news.prompts.noPrompt')}</pre>
              </section>
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.userPrompt')}</h4>
                <pre>{promptModalData.prompt_user || t('news.prompts.noPrompt')}</pre>
              </section>
            </div>

            <div className="admin-news-prompts__prompt-grid">
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.seoRules')}</h4>
                <pre>{formatJson(promptModalData.seo_rules_snapshot)}</pre>
              </section>
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.payload')}</h4>
                <pre>{formatJson(promptModalData.generation_payload)}</pre>
              </section>
            </div>

            {promptModalData.push_response && (
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.pushResponse')}</h4>
                <pre>{formatJson(promptModalData.push_response)}</pre>
              </section>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={generationStatus !== 'idle'}
        onClose={closeGenerationModal}
        title={t('news.articles.generation.title')}
        size="md"
        footer={
          generationStatus === 'running' ? (
            <button type="button" className="adm-btn adm-btn--ghost" disabled>
              <RefreshCwIcon size={14} className="adm-spin" />
              {t('news.articles.generation.running')}
            </button>
          ) : generationStatus === 'success' ? (
            <>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeGenerationModal}>{t('news.articles.generation.close')}</button>
              {generationResultArticle && (
                <button type="button" className="adm-btn adm-btn--primary" onClick={previewGeneratedArticle}>
                  <EyeIcon size={14} />
                  {t('news.articles.preview')}
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeGenerationModal}>{t('news.articles.generation.close')}</button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={generateNextArticle}>
                <RefreshCwIcon size={14} />
                {t('news.articles.generation.retry')}
              </button>
            </>
          )
        }
      >
        <div className={`admin-news-articles-generation admin-news-articles-generation--${generationStatus}`} role="status" aria-live="polite">
          <div className="admin-news-articles-generation__visual">
            {generationStatus === 'running' && (
              <>
                <RefreshCwIcon size={34} className="adm-spin" />
                <span />
              </>
            )}
            {generationStatus === 'success' && <CheckCircle2Icon size={38} />}
            {generationStatus === 'failed' && <XCircleIcon size={38} />}
          </div>
          <div className="admin-news-articles-generation__copy">
            <h3>{t(`news.articles.generation.${generationStatus}`)}</h3>
            <p>{generationMessage}</p>
          </div>
          {generationResultArticle && generationStatus === 'success' && (
            <div className="admin-news-articles-generation__article">
              <strong>{generationResultArticle.title}</strong>
              <span>{generationResultArticle.locale?.toUpperCase()} · {generationResultArticle.slug}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Prompts
// ─────────────────────────────────────────────

type StatusBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
const PROMPTS_PER_PAGE = 10;

function aiPromptStatusInfo(prompt: NewsAIPrompt): { labelKey: string; fallback: string; variant: StatusBadgeVariant; detailKey?: string } {
  if (prompt.push_status === 'failed') {
    return {
      labelKey: 'news.prompts.pushFailed',
      fallback: 'Push failed',
      variant: 'danger',
      detailKey: prompt.status === 'success' ? 'news.prompts.generatedOk' : undefined,
    };
  }

  if (prompt.status === 'success') {
    return {
      labelKey: prompt.push_status === 'success' ? 'news.prompts.pushSucceeded' : 'news.prompts.generated',
      fallback: prompt.push_status === 'success' ? 'Push succeeded' : 'Generated',
      variant: prompt.push_status === 'success' ? 'success' : 'warning',
      detailKey: prompt.push_status === 'success' ? 'news.prompts.generatedOk' : 'news.prompts.pushPending',
    };
  }

  switch (prompt.status) {
    case 'failed': return { labelKey: 'news.prompts.statuses.failed', fallback: 'Failed', variant: 'danger' };
    case 'running': return { labelKey: 'news.prompts.statuses.running', fallback: 'Running', variant: 'info' };
    case 'pending': return { labelKey: 'news.prompts.statuses.pending', fallback: 'Pending', variant: 'warning' };
    case 'rejected': return { labelKey: 'news.prompts.statuses.rejected', fallback: 'Rejected', variant: 'muted' };
    default: return { labelKey: `news.prompts.statuses.${prompt.status}`, fallback: prompt.status || 'Unknown', variant: 'default' };
  }
}

function formatOptional(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function formatDuration(ms?: number | null) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function formatJson(value?: Record<string, unknown> | Array<Record<string, unknown>> | null) {
  if (!value) return '—';
  if (Array.isArray(value) && value.length === 0) return '—';
  if (!Array.isArray(value) && Object.keys(value).length === 0) return '—';
  return JSON.stringify(value, null, 2);
}

function promptReason(prompt: NewsAIPrompt, fallback: string) {
  return prompt.error_message || prompt.push_error_message || prompt.reason || fallback;
}

function PromptsTab({ onStatsChange }: { onStatsChange?: () => void }) {
  const { t, i18n } = useTranslation('admin');
  const [prompts, setPrompts]     = useState<NewsAIPrompt[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<NewsAIPrompt | null>(null);
  const [actionId, setActionId]   = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [localeFilter, setLocaleFilter] = useState('');

  const reload = () => {
    setLoading(true);
    return apiService.adminNewsAIPrompts({ limit: 200 })
      .then(d => { setPrompts(d.prompts ?? []); setPage(1); })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const openPreview = async (prompt: NewsAIPrompt) => {
    setSelectedPrompt(prompt);
    setModalOpen(true);
    try {
      const data = await apiService.adminNewsAIPrompt(prompt.id);
      setSelectedPrompt(data.prompt ?? prompt);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const closeModal = () => { setModalOpen(false); setSelectedPrompt(null); };

  const restart = async (id: string) => {
    setActionId(`restart-${id}`);
    try {
      const data = await apiService.adminNewsRestartAIPrompt(id);
      if (selectedPrompt?.id === id) setSelectedPrompt(data.prompt);
      toast.success(t('news.prompts.restartQueued'));
      await reload();
      onStatsChange?.();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('news.prompts.confirmDelete'))) return;
    setActionId(`delete-${id}`);
    try {
      await apiService.adminNewsDeleteAIPrompt(id);
      toast.success(t('news.prompts.deleted'));
      if (selectedPrompt?.id === id) closeModal();
      await reload();
      onStatsChange?.();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => { setPage(1); }, [statusFilter, localeFilter]);

  const filteredPrompts = prompts.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (localeFilter && p.locale !== localeFilter) return false;
    return true;
  });

  const selectedReason = selectedPrompt ? promptReason(selectedPrompt, t('news.prompts.noReason')) : '';
  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PROMPTS_PER_PAGE;
  const pageEnd = Math.min(pageStart + PROMPTS_PER_PAGE, filteredPrompts.length);
  const visiblePrompts = filteredPrompts.slice(pageStart, pageEnd);
  const selectedStatusInfo = selectedPrompt ? aiPromptStatusInfo(selectedPrompt) : null;

  const selectedDetails = selectedPrompt ? [
    [t('news.prompts.client'), formatOptional(selectedPrompt.client_id)],
    [t('news.prompts.calendarId'), formatOptional(selectedPrompt.editorial_calendar_id)],
    [t('news.prompts.attemptCount'), selectedPrompt.attempt_count && selectedPrompt.attempt_count > 1 ? `${selectedPrompt.attempt_count} (échecs précédents masqués, dernière tentative affichée)` : '1'],
    [t('news.prompts.generationStatus'), t(`news.prompts.statuses.${selectedPrompt.status}`, { defaultValue: selectedPrompt.status })],
    [t('news.prompts.pushStatus'), t(`news.prompts.pushStatuses.${selectedPrompt.push_status || 'unknown'}`, { defaultValue: formatOptional(selectedPrompt.push_status) })],
    [t('news.prompts.pushEndpoint'), formatOptional(selectedPrompt.push_endpoint)],
    [t('news.prompts.model'), formatOptional(selectedPrompt.model_used)],
    [t('news.prompts.provider'), formatOptional(selectedPrompt.provider)],
    [t('news.prompts.temperature'), formatOptional(selectedPrompt.temperature)],
    [t('news.prompts.tokens'), formatOptional(selectedPrompt.total_tokens)],
    [t('news.prompts.duration'), formatDuration(selectedPrompt.generation_time_ms)],
    [t('news.prompts.createdAt'), fmtDate(selectedPrompt.created_at, i18n.language)],
    [t('news.prompts.updatedAt'), fmtDate(selectedPrompt.updated_at, i18n.language)],
    [t('news.prompts.completedAt'), selectedPrompt.completed_at ? fmtDate(selectedPrompt.completed_at, i18n.language) : '—'],
  ] : [];

  const failedCount = prompts.filter(p => p.status === 'failed' || p.status === 'rejected').length;

  const purgeFailed = async () => {
    if (!confirm(`Supprimer les ${failedCount} générations échouées / rejetées ?`)) return;
    try {
      await apiService.adminNewsDeleteFailedPrompts();
      toast.success('Générations supprimées');
      await reload();
      onStatsChange?.();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="admin-news-prompts">
      <div className="admin-news-prompts__toolbar">
        <div className="admin-news-prompts__filters">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="adm-select adm-select--sm"
          >
            <option value="">{t('news.articles.allStatuses')}</option>
            <option value="pending">{t('news.prompts.statuses.pending')}</option>
            <option value="running">{t('news.prompts.statuses.running')}</option>
            <option value="failed">{t('news.prompts.statuses.failed')}</option>
            <option value="rejected">{t('news.prompts.statuses.rejected')}</option>
          </select>
          <select
            value={localeFilter}
            onChange={e => setLocaleFilter(e.target.value)}
            className="adm-select adm-select--sm"
          >
            <option value="">{t('news.prompts.allLocales')}</option>
            {ARTICLE_LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
        {failedCount > 0 && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={purgeFailed}>
            <Trash2Icon size={13} />
            Purger les échecs ({failedCount})
          </button>
        )}
      </div>
      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableTh>{t('news.prompts.title')}</DataTableTh>
            <DataTableTh>{t('news.prompts.status')}</DataTableTh>
            <DataTableTh>{t('news.prompts.locale')}</DataTableTh>
            <DataTableTh>{t('news.prompts.format')}</DataTableTh>
            <DataTableTh>{t('news.prompts.reason')}</DataTableTh>
            <DataTableTh>{t('news.prompts.date')}</DataTableTh>
            <DataTableTh>{t('news.prompts.actions')}</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableTd className="adm-table__loading">{t('common.loading')}</DataTableTd>
            </DataTableRow>
          ) : prompts.length === 0 ? (
            <DataTableEmpty icon={<ClipboardListIcon size={28} />} label={t('news.prompts.empty')} />
          ) : visiblePrompts.map(prompt => {
            const statusInfo = aiPromptStatusInfo(prompt);

            return (
              <DataTableRow key={prompt.id} onClick={() => openPreview(prompt)}>
                <DataTableTd>
                  <div className="admin-news-prompts__name">
                    <span className="admin-news-prompts__title">{prompt.title || prompt.keyword || `#${prompt.generation_id}`}</span>
                    <span className="admin-news-prompts__meta">
                      #{prompt.generation_id} · {formatOptional(prompt.keyword)}
                      {(prompt.attempt_count ?? 1) > 1 ? ` · ${prompt.attempt_count} tentatives` : ''}
                    </span>
                  </div>
                </DataTableTd>
                <DataTableTd>
                  <div className="admin-news-prompts__status">
                    <StatusBadge
                      label={t(statusInfo.labelKey, { defaultValue: statusInfo.fallback })}
                      variant={statusInfo.variant}
                    />
                    {statusInfo.detailKey && <span className="admin-news-prompts__status-detail">{t(statusInfo.detailKey)}</span>}
                  </div>
                </DataTableTd>
                <DataTableTd>
                  <span className="admin-news-prompts__locale">{formatOptional(prompt.locale).toUpperCase()}</span>
                </DataTableTd>
                <DataTableTd>{formatOptional(prompt.article_format)}</DataTableTd>
                <DataTableTd>
                  <span className="admin-news-prompts__reason">{promptReason(prompt, t('news.prompts.noReason'))}</span>
                </DataTableTd>
                <DataTableTd>{fmtDate(prompt.created_at, i18n.language)}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--xs"
                      onClick={event => { event.stopPropagation(); restart(prompt.id); }}
                      disabled={actionId === `restart-${prompt.id}`}
                      aria-label={t('news.prompts.restart')}
                      title={t('news.prompts.restart')}
                    >
                      <RefreshCwIcon size={13} className={actionId === `restart-${prompt.id}` ? 'adm-spin' : undefined} />
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--xs"
                      onClick={event => { event.stopPropagation(); openPreview(prompt); }}
                      aria-label={t('news.prompts.preview')}
                      title={t('news.prompts.preview')}
                    >
                      <EyeIcon size={13} />
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost adm-btn--xs adm-btn--danger"
                      onClick={event => { event.stopPropagation(); remove(prompt.id); }}
                      disabled={actionId === `delete-${prompt.id}`}
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                    >
                      <Trash2Icon size={13} />
                    </button>
                  </div>
                </DataTableTd>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      {!loading && filteredPrompts.length > 0 && (
        <div className="admin-news-prompts__pagination" aria-label={t('news.prompts.pagination')}>
          <span>{t('news.prompts.paginationSummary', { from: pageStart + 1, to: pageEnd, total: filteredPrompts.length })}</span>
          <div className="admin-news-prompts__pagination-actions">
            <button
              type="button"
              className="adm-btn adm-btn--ghost adm-btn--xs"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              aria-label={t('news.prompts.previousPage')}
              title={t('news.prompts.previousPage')}
            >
              &lt;
            </button>
            <strong>{t('news.prompts.pageIndicator', { page: currentPage, total: totalPages })}</strong>
            <button
              type="button"
              className="adm-btn adm-btn--ghost adm-btn--xs"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              aria-label={t('news.prompts.nextPage')}
              title={t('news.prompts.nextPage')}
            >
              &gt;
            </button>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={selectedPrompt ? `${t('news.prompts.modalTitle')} #${selectedPrompt.generation_id}` : t('news.prompts.modalTitle')}
        size="lg"
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>{t('common.cancel')}</button>
            {selectedPrompt && (
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--danger"
                onClick={() => remove(selectedPrompt.id)}
                disabled={actionId === `delete-${selectedPrompt.id}`}
              >
                <Trash2Icon size={14} />
                {t('common.delete')}
              </button>
            )}
            {selectedPrompt && (
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                onClick={() => restart(selectedPrompt.id)}
                disabled={actionId === `restart-${selectedPrompt.id}`}
              >
                <RefreshCwIcon size={14} className={actionId === `restart-${selectedPrompt.id}` ? 'adm-spin' : undefined} />
                {t('news.prompts.restart')}
              </button>
            )}
          </>
        }
      >
        {selectedPrompt && (
          <div className="admin-news-prompts__modal">
            <div className="admin-news-prompts__modal-head">
              <div>
                <h3>{selectedPrompt.title || selectedPrompt.keyword || t('news.prompts.noPrompt')}</h3>
                <p>{formatOptional(selectedPrompt.keyword)} · {formatOptional(selectedPrompt.locale).toUpperCase()} · {formatOptional(selectedPrompt.article_format)}</p>
              </div>
              {selectedStatusInfo && (
                <div className="admin-news-prompts__status">
                  <StatusBadge
                    label={t(selectedStatusInfo.labelKey, { defaultValue: selectedStatusInfo.fallback })}
                    variant={selectedStatusInfo.variant}
                  />
                  {selectedStatusInfo.detailKey && <span className="admin-news-prompts__status-detail">{t(selectedStatusInfo.detailKey)}</span>}
                </div>
              )}
            </div>

            <div className="admin-news-prompts__reason-box">
              <span>{t('news.prompts.reason')}</span>
              <p>{selectedReason}</p>
            </div>

            <div className="admin-news-prompts__details">
              {selectedDetails.map(([label, value]) => (
                <div key={label} className="admin-news-prompts__detail">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="admin-news-prompts__prompt-grid">
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.systemPrompt')}</h4>
                <pre>{selectedPrompt.prompt_system || t('news.prompts.noPrompt')}</pre>
              </section>
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.userPrompt')}</h4>
                <pre>{selectedPrompt.prompt_user || t('news.prompts.noPrompt')}</pre>
              </section>
            </div>

            <div className="admin-news-prompts__prompt-grid">
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.seoRules')}</h4>
                <pre>{formatJson(selectedPrompt.seo_rules_snapshot)}</pre>
              </section>
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.payload')}</h4>
                <pre>{formatJson(selectedPrompt.generation_payload)}</pre>
              </section>
            </div>

            {selectedPrompt.push_response && (
              <section className="admin-news-prompts__prompt-block">
                <h4>{t('news.prompts.pushResponse')}</h4>
                <pre>{formatJson(selectedPrompt.push_response)}</pre>
              </section>
            )}
          </div>
        )}
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

function aiStatusVariant(status: string): string {
  switch (status) {
    case 'published': return 'published';
    case 'pushed':    return 'pushed';
    case 'generated': return 'generated';
    case 'in_generation': return 'generating';
    case 'planned':  return 'planned';
    case 'failed':   return 'danger';
    default:         return 'default';
  }
}

type GenerationState = 'idle' | 'generating' | 'generated' | 'published' | 'error';
type ReviewDecision = 'applied' | 'ignored';

interface CalendarReviewRecommendation {
  id: string;
  title: string;
  detail: string;
  status: 'ready' | 'ok' | 'review';
  canApply: boolean;
}

interface CalendarSyncReview {
  score: number;
  summary: string;
  weekStart: string;
  totalItems: number;
  targetItems: number;
  volumeGap: number;
  localeCount: number;
  targetLocaleCount: number;
  missingLocales: string[];
  objectiveCoverage: number;
  overloadedDays: string[];
  missingObjectives: string[];
  recommendations: CalendarReviewRecommendation[];
}

function normalizeCalendarText(value?: string | null): string {
  return (value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function itemMatchesObjective(item: AICalendarItem, objective: StrategicObjective): boolean {
  const haystack = normalizeCalendarText([
    item.keyword,
    item.topic_cluster,
    item.article_format,
    item.content_angle,
    item.suggested_title,
    item.rationale,
  ].filter(Boolean).join(' '));
  if (!haystack) return false;
  const targets = [...(objective.target_topics ?? []), ...(objective.target_keywords ?? [])]
    .map(normalizeCalendarText)
    .filter(Boolean);

  return targets.some(target => haystack.includes(target) || target.includes(haystack));
}

function weeklyTargetFromObjectives(objectives: StrategicObjective[]): number {
  const monthlyTarget = objectives.reduce((sum, objective) => {
    const target = objective.success_metrics?.articles_per_month_target;
    return sum + (typeof target === 'number' ? target : 0);
  }, 0);

  return Math.max(1, Math.min(100, Math.round(monthlyTarget / 4)));
}

function buildCalendarSyncReview(items: AICalendarItem[], objectives: StrategicObjective[], weekStart: Date): CalendarSyncReview {
  const activeObjectives = objectives.filter(o => o.is_active);
  const matchedObjectives = activeObjectives.filter(objective => items.some(item => itemMatchesObjective(item, objective)));
  const locales = new Set(items.map(item => item.locale).filter(Boolean));
  const expectedLocales = new Set(activeObjectives.flatMap(objective => objective.target_locales ?? []));
  const missingLocales = [...expectedLocales].filter(locale => !locales.has(locale)).sort();
  const targetItems = weeklyTargetFromObjectives(activeObjectives);
  const volumeGap = Math.max(0, targetItems - items.length);
  const days = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.scheduled_for] = (acc[item.scheduled_for] ?? 0) + 1;
    return acc;
  }, {});
  const dailyCapacity = Math.max(8, Math.ceil(targetItems / 5) + 1);
  const overloadedDays = Object.entries(days).filter(([, count]) => count > dailyCapacity).map(([day]) => day);

  const objectiveCoverage = activeObjectives.length ? matchedObjectives.length / activeObjectives.length : 0;
  const localeCoverage = expectedLocales.size ? locales.size / expectedLocales.size : 1;
  const volumeScore = Math.min(items.length / targetItems, 1);
  const balanceScore = overloadedDays.length === 0 ? 1 : 0.65;
  const score = Math.round((objectiveCoverage * 0.45 + localeCoverage * 0.25 + volumeScore * 0.2 + balanceScore * 0.1) * 100);

  const missingObjectives = activeObjectives
    .filter(objective => !matchedObjectives.includes(objective))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map(objective => objective.title);

  const recommendations: CalendarReviewRecommendation[] = [
    {
      id: 'increase-volume',
      title: volumeGap > 0 ? `Ajouter ${volumeGap} publications à la semaine` : 'Volume hebdomadaire aligné',
      detail: volumeGap > 0
        ? `Objectif stratégique actuel : ${targetItems} articles/semaine. Agenda actuel : ${items.length}.`
        : `Agenda actuel : ${items.length}/${targetItems} articles.` ,
      status: volumeGap > 0 ? 'ready' : 'ok',
      canApply: volumeGap > 0,
    },
    {
      id: 'rebalance-locales',
      title: missingLocales.length > 0 ? `Rééquilibrer les locales manquantes (${missingLocales.map(l => l.toUpperCase()).join(', ')})` : 'Locales couvertes',
      detail: missingLocales.length > 0
        ? 'La régénération répartira les opportunités sur les langues ciblées par les objectifs.'
        : 'La couverture linguistique est cohérente avec la stratégie Europe.',
      status: missingLocales.length > 0 ? 'ready' : 'ok',
      canApply: missingLocales.length > 0,
    },
    {
      id: 'cover-objectives',
      title: missingObjectives.length > 0 ? 'Renforcer les objectifs prioritaires absents' : 'Objectifs prioritaires couverts',
      detail: missingObjectives.length > 0
        ? `${missingObjectives.length} objectifs prioritaires ne sont pas représentés dans cette semaine.`
        : 'Les objectifs prioritaires sont correctement représentés.',
      status: missingObjectives.length > 0 ? 'ready' : 'ok',
      canApply: missingObjectives.length > 0,
    },
    {
      id: 'spread-week',
      title: overloadedDays.length > 0 ? 'Lisser les journées trop chargées' : 'Répartition hebdomadaire lisible',
      detail: overloadedDays.length > 0
        ? `Jours à alléger : ${overloadedDays.map(day => fmtDate(day, 'fr')).join(', ')}.`
        : 'La répartition hebdomadaire reste lisible.',
      status: overloadedDays.length > 0 ? 'review' : 'ok',
      canApply: overloadedDays.length > 0,
    },
  ];

  return {
    score,
    summary: score >= 80 ? 'Agenda bien aligné' : score >= 60 ? 'Agenda partiellement aligné' : 'Agenda à rééquilibrer',
    weekStart: toISODate(weekStart),
    totalItems: items.length,
    targetItems,
    volumeGap,
    localeCount: locales.size,
    targetLocaleCount: expectedLocales.size,
    missingLocales,
    objectiveCoverage: Math.round(objectiveCoverage * 100),
    overloadedDays,
    missingObjectives,
    recommendations,
  };
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

function parseISODateLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  const [selectedAIItem, setSelectedAIItem] = useState<AICalendarItem | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generatedArticle, setGeneratedArticle] = useState<Article | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncReview, setSyncReview] = useState<CalendarSyncReview | null>(null);
  const [syncObjectives, setSyncObjectives] = useState<StrategicObjective[]>([]);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision>>({});
  const [applyingReview, setApplyingReview] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const openAIItem = (item: AICalendarItem) => {
    setSelectedAIItem(item);
    setGenerationState(item.status === 'published' || item.status === 'pushed' ? 'published' : item.status === 'generated' ? 'generated' : 'idle');
    setGeneratedArticle(null);
    setGenerationError(null);
  };

  const updateAIItemStatus = (itemId: number, status: string) => {
    setAiItems(items => items.map(item => item.id === itemId ? { ...item, status } : item));
    setSelectedAIItem(item => item && item.id === itemId ? { ...item, status } : item);
  };

  const generateSelectedArticle = async () => {
    if (!selectedAIItem || generationState === 'generating') return;
    setGenerationState('generating');
    setGenerationError(null);
    try {
      const response = await apiService.adminNewsAIGenerateArticle(selectedAIItem);
      const eventStatus = response.event_status === 'published' ? 'published' : 'generated';
      setGeneratedArticle(response.article ?? null);
      updateAIItemStatus(selectedAIItem.id, eventStatus);
      setGenerationState(eventStatus);
      toast.success(eventStatus === 'published' ? 'Article publié.' : 'Article généré.');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Génération impossible.';
      setGenerationError(message);
      setGenerationState('error');
      toast.error(message);
    }
  };

  const runSyncReview = async () => {
    setSyncOpen(true);
    setSyncing(true);
    setSyncReview(null);
    setReviewDecisions({});
    setApplyingReview(null);
    setSyncError(null);
    try {
      const minimumAnimation = new Promise(resolve => window.setTimeout(resolve, 900));
      const reviewWeekStart = viewMode === 'daily'
        ? getMonday(selectedDay)
        : viewMode === 'monthly'
          ? getMonday(new Date(year, month, 1))
          : weekStart;
      const reviewWeekStartISO = toISODate(reviewWeekStart);
      const calendarRequest = apiService.adminNewsAICalendar({ view: 'weekly', week_start: reviewWeekStartISO });
      const [calendar, objectives] = await Promise.all([
        calendarRequest,
        apiService.adminNewsAIStrategicObjectives(),
        minimumAnimation,
      ]).then(([calendarData, objectiveData]) => [calendarData, objectiveData]);

      const objectiveList = objectives.objectives ?? [];
      const currentItems = calendar.items ?? [];
      if (viewMode === 'weekly' && reviewWeekStartISO === toISODate(weekStart)) {
        setAiItems(currentItems);
      }
      setSyncObjectives(objectiveList);
      setSyncReview(buildCalendarSyncReview(currentItems, objectiveList, reviewWeekStart));
    } catch (error: any) {
      setSyncError(error?.response?.data?.error || error?.message || 'Review impossible.');
    } finally {
      setSyncing(false);
    }
  };

  const ignoreReviewRecommendation = (id: string) => {
    setReviewDecisions(decisions => ({ ...decisions, [id]: 'ignored' }));
  };

  const applyReviewRecommendation = async (recommendation: CalendarReviewRecommendation) => {
    if (!syncReview || applyingReview || !recommendation.canApply) return;
    setApplyingReview(recommendation.id);
    setSyncError(null);
    try {
      const response = await apiService.adminNewsAIApplyCalendarReview({
        week_start: syncReview.weekStart,
        max_items_per_client: syncReview.targetItems,
      });
      const refreshedItems = response.items ?? [];
      if (viewMode === 'weekly' && syncReview.weekStart === toISODate(weekStart)) {
        setAiItems(refreshedItems);
      }
      setSyncReview(buildCalendarSyncReview(refreshedItems, syncObjectives, parseISODateLocal(syncReview.weekStart)));
      setReviewDecisions(decisions => ({ ...decisions, [recommendation.id]: 'applied' }));
      toast.success('Review appliquée à l’agenda.');
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Application impossible.';
      setSyncError(message);
      toast.error(message);
    } finally {
      setApplyingReview(null);
    }
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
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-news-calendar__ai-item admin-news-calendar__ai-item--${aiStatusVariant(item.status)}`}
                    onClick={() => openAIItem(item)}
                  >
                    <span className="admin-news-calendar__ai-item-topline">
                      <span className="admin-news-calendar__ai-item-keyword">{item.keyword}</span>
                      <span className="admin-news-calendar__locale-badge">{item.locale?.toUpperCase() || 'FR'}</span>
                    </span>
                    {item.topic_cluster && <span className="admin-news-calendar__ai-item-cluster">{item.topic_cluster}</span>}
                    <span className={`admin-news-calendar__status admin-news-calendar__status--${aiStatusVariant(item.status)}`}>{item.status}</span>
                  </button>
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

    const MAX_VISIBLE = 5;

    return (
      <div className="admin-news-calendar__grid">
        {DAYS.map(d => <div key={d} className="admin-news-calendar__day-header">{d}</div>)}
        {cells.map((day, idx) => {
          const isToday = day !== null && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const dayEntries = day ? entriesForDay(day) : [];
          const dayAI = day ? aiForDay(day) : [];
          const allItems = [...dayEntries.map(e => ({ type: 'entry' as const, data: e })), ...dayAI.map(it => ({ type: 'ai' as const, data: it }))];
          const visible = allItems.slice(0, MAX_VISIBLE);
          const hiddenCount = allItems.length - visible.length;
          return (
            <div key={idx} className={['admin-news-calendar__cell', !day ? 'admin-news-calendar__cell--empty' : '', isToday ? 'admin-news-calendar__cell--today' : ''].filter(Boolean).join(' ')}>
              {day && <span className="admin-news-calendar__cell-day">{day}</span>}
              {visible.map((item) =>
                item.type === 'entry' ? (
                  <span key={item.data.id} className={`admin-news-calendar__event admin-news-calendar__event--${item.data.status}`} title={item.data.title}>{item.data.title}</span>
                ) : (
                  <button
                    key={`ai-${item.data.id}`}
                    type="button"
                    className={`admin-news-calendar__ai-chip admin-news-calendar__ai-chip--${aiStatusVariant(item.data.status)}`}
                    title={item.data.keyword}
                    onClick={() => openAIItem(item.data)}
                  >
                    <span className="admin-news-calendar__locale-badge">{item.data.locale?.toUpperCase() || 'FR'}</span>
                    <span>{item.data.keyword}</span>
                  </button>
                )
              )}
              {hiddenCount > 0 && (
                <span className="admin-news-calendar__cell-more">+{hiddenCount}</span>
              )}
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
        <div
          key={item.id}
          className={`admin-news-calendar__daily-item admin-news-calendar__daily-item--${aiStatusVariant(item.status)}`}
          role="button"
          tabIndex={0}
          onClick={() => openAIItem(item)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openAIItem(item);
            }
          }}
        >
          <div className="admin-news-calendar__daily-item-header">
            <span className="admin-news-calendar__daily-item-keyword">
              <span className="admin-news-calendar__locale-badge">{item.locale?.toUpperCase() || 'FR'}</span>
              {item.keyword}
            </span>
            <span className={`admin-news-calendar__status admin-news-calendar__status--${aiStatusVariant(item.status)}`}>{item.status}</span>
          </div>
          {item.topic_cluster && <span className="admin-news-calendar__ai-item-cluster">{item.topic_cluster}</span>}
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
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={runSyncReview}>
            <RefreshCwIcon size={14} /> Review
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

      <Modal
        open={!!selectedAIItem}
        onClose={() => { if (generationState !== 'generating') setSelectedAIItem(null); }}
        title={selectedAIItem?.suggested_title || selectedAIItem?.keyword || 'Détail calendrier'}
        size="lg"
        footer={selectedAIItem && (
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setSelectedAIItem(null)} disabled={generationState === 'generating'}>
              Fermer
            </button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={generateSelectedArticle} disabled={generationState === 'generating'}>
              {generationState === 'generating' && <RefreshCwIcon size={14} className="adm-spin" />}
              {generationState === 'published' ? 'Article publié' : generationState === 'generated' ? 'Regénérer l’article' : 'Générer l’article'}
            </button>
          </>
        )}
      >
        {selectedAIItem && (
          <div className="admin-news-calendar-modal">
            <div className="admin-news-calendar-modal__summary">
              <div>
                <span>Mot-clé</span>
                <strong>{selectedAIItem.keyword}</strong>
              </div>
              <div>
                <span>Locale</span>
                <strong><span className="admin-news-calendar__locale-badge">{selectedAIItem.locale?.toUpperCase() || 'FR'}</span></strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{fmtDate(selectedAIItem.scheduled_for, isFr ? 'fr' : 'en')}</strong>
              </div>
              <div>
                <span>Statut</span>
                <strong className={`admin-news-calendar__status admin-news-calendar__status--${aiStatusVariant(selectedAIItem.status)}`}>{selectedAIItem.status}</strong>
              </div>
            </div>

            <div className="admin-news-calendar-modal__details">
              {selectedAIItem.topic_cluster && <p><span>Marché / cluster</span>{selectedAIItem.topic_cluster}</p>}
              {selectedAIItem.article_format && <p><span>Format</span>{selectedAIItem.article_format}</p>}
              {selectedAIItem.content_angle && <p><span>Angle éditorial</span>{selectedAIItem.content_angle}</p>}
              {selectedAIItem.rationale && <p><span>Raison stratégique</span>{selectedAIItem.rationale}</p>}
            </div>

            {generationState === 'generating' && (
              <div className="admin-news-calendar-generation" role="status" aria-live="polite">
                <div className="admin-news-calendar-generation__pulse">
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <strong>Génération de l’article en cours</strong>
                  <p>Brief éditorial, rédaction, optimisation SEO et push vers le blog.</p>
                </div>
              </div>
            )}

            {generationState === 'generated' && (
              <div className="admin-news-calendar-generation admin-news-calendar-generation--generated">
                <CheckIcon size={18} />
                <div>
                  <strong>Article généré</strong>
                  <p>{generatedArticle?.title || 'Le brouillon est disponible dans les articles.'}</p>
                </div>
              </div>
            )}

            {generationState === 'published' && (
              <div className="admin-news-calendar-generation admin-news-calendar-generation--published">
                <CheckIcon size={18} />
                <div>
                  <strong>Article publié</strong>
                  <p>{generatedArticle?.title || 'Le contenu est publié et prêt à être suivi.'}</p>
                </div>
              </div>
            )}

            {generationState === 'error' && generationError && (
              <div className="admin-news-calendar-generation admin-news-calendar-generation--error">
                <strong>Génération interrompue</strong>
                <p>{generationError}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {syncOpen && (
        <div className="admin-news-calendar-sync" role="dialog" aria-modal="true">
          <div className="admin-news-calendar-sync__panel">
            <div className="admin-news-calendar-sync__header">
              <span>Review d’agenda</span>
              {!syncing && <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setSyncOpen(false)}>Fermer</button>}
            </div>

            {syncing && (
              <div className="admin-news-calendar-sync__loading" role="status" aria-live="polite">
                <RefreshCwIcon size={24} className="adm-spin" />
                <strong>Review en cours</strong>
                <p>Analyse de l’alignement hebdomadaire avec les objectifs stratégiques.</p>
              </div>
            )}

            {!syncing && syncReview && (
              <div className="admin-news-calendar-sync__result">
                <div className="admin-news-calendar-sync__score">
                  <strong>{syncReview.score}%</strong>
                  <span>{syncReview.summary}</span>
                </div>
                <div className="admin-news-calendar-sync__metrics">
                  <span>{syncReview.totalItems}/{syncReview.targetItems} articles prévus</span>
                  <span>{syncReview.localeCount}/{syncReview.targetLocaleCount} locales couvertes</span>
                  <span>{syncReview.objectiveCoverage}% objectifs couverts</span>
                </div>
                {syncReview.volumeGap > 0 && (
                  <div className="admin-news-calendar-sync__notice">
                    L’agenda n’a pas encore appliqué la nouvelle cadence : il manque {syncReview.volumeGap} publications cette semaine.
                  </div>
                )}
                {syncReview.missingObjectives.length > 0 && (
                  <div className="admin-news-calendar-sync__block">
                    <strong>Objectifs à renforcer</strong>
                    {syncReview.missingObjectives.map(objective => <span key={objective}>{objective}</span>)}
                  </div>
                )}
                <div className="admin-news-calendar-sync__recommendations">
                  <strong>Décisions de review</strong>
                  {syncReview.recommendations.map(recommendation => {
                    const decision = reviewDecisions[recommendation.id];
                    return (
                      <div key={recommendation.id} className={`admin-news-calendar-sync__recommendation admin-news-calendar-sync__recommendation--${recommendation.status}`}>
                        <div>
                          <span>{decision === 'applied' ? 'Appliquée' : decision === 'ignored' ? 'Ignorée' : recommendation.status === 'ok' ? 'OK' : 'À décider'}</span>
                          <strong>{recommendation.title}</strong>
                          <p>{recommendation.detail}</p>
                        </div>
                        {recommendation.canApply && decision !== 'applied' && decision !== 'ignored' && (
                          <div className="admin-news-calendar-sync__recommendation-actions">
                            <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => applyReviewRecommendation(recommendation)} disabled={!!applyingReview}>
                              {applyingReview === recommendation.id && <RefreshCwIcon size={13} className="adm-spin" />}
                              Appliquer
                            </button>
                            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => ignoreReviewRecommendation(recommendation.id)} disabled={!!applyingReview}>
                              Ignorer
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!syncing && syncError && (
              <div className="admin-news-calendar-generation admin-news-calendar-generation--error">
                <strong>Review impossible</strong>
                <p>{syncError}</p>
              </div>
            )}
          </div>
        </div>
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


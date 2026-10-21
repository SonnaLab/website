import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon, PlusIcon, RefreshCwIcon, SearchIcon, TargetIcon, Trash2Icon } from '@icons';
import { PageHeader } from '@/components/private/common/PageHeader';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirm } from '@/components/common/ConfirmDialog';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SeoPage {
  id: string; path: string; locale: string; title?: string;
  meta_description?: string; canonical_url?: string; indexable: boolean;
  priority: number; last_audit_score?: number;
}
interface Keyword { id: string; keyword: string; locale: string; intent?: string; rank?: number; search_volume?: number; seo_page_id?: string }

export default function AdminSeo() {
  const { t } = useTranslation('admin');
  return (
    <div className="dash-page">
      <PageHeader
        badge={{ icon: SearchIcon, label: t('nav.seo') }}
        title={t('seo.heading')}
        description={t('seo.subtitle')}
      />

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">{t('seo.tabs.pages')}</TabsTrigger>
          <TabsTrigger value="keywords">{t('seo.tabs.keywords')}</TabsTrigger>
        </TabsList>
        <TabsContent value="pages"    className="mt-4"><PagesTab    /></TabsContent>
        <TabsContent value="keywords" className="mt-4"><KeywordsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PagesTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const confirm = useConfirm();
  const [pages, setPages]     = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');

  const reload = () => apiService.adminSeoPages().then((d) => setPages(d.pages || [])).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => filterRows(pages, q, (p) => [p.path, p.locale, p.title, p.meta_description]), [pages, q]);
  const selection = useRowSelection(visible, (p) => p.id);

  const audit = async (id: string) => {
    try { await apiService.adminSeoAuditPage(id); toast.success(t('seo.audit')); reload(); }
    catch { toast.error(t('common.error')); }
  };
  const remove = async (p: SeoPage) => {
    if (!(await confirm({ title: t('travaux.common.confirmDelete'), message: p.path }))) return;
    try { await apiService.adminSeoDeletePage(p.id); reload(); } catch { toast.error(t('common.error')); }
  };

  // Bulk: one request per page, then a single reload.
  async function bulk(action: (p: SeoPage) => Promise<unknown>) {
    const results = await Promise.allSettled(selection.selectedRows.map(action));
    if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: results.length }));
    selection.clear(); reload();
  }
  async function bulkDelete() {
    if (!(await confirm({ title: tc('table.bulkDeleteTitle', { count: selection.count }), message: tc('table.bulkDeleteMessage') }))) return;
    await bulk((p) => apiService.adminSeoDeletePage(p.id));
  }
  function exportSelection() {
    exportRowsCsv('seo-pages', [
      [t('seo.path'), (p) => p.path],
      [t('seo.locale'), (p) => p.locale],
      [t('seo.metaTitle'), (p) => p.title ?? ''],
      [t('seo.metaDescription'), (p) => p.meta_description ?? ''],
      [t('seo.indexable'), (p) => (p.indexable ? 'oui' : 'non')],
      [t('seo.priority'), (p) => p.priority],
      [t('seo.score'), (p) => p.last_audit_score ?? ''],
    ], selection.selectedRows);
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar right={<CreatePageDialog onCreated={reload} />}>
        <DataTableSearch value={q} onChange={setQ} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => bulk((p) => apiService.adminSeoAuditPage(p.id))}>
          <RefreshCwIcon size={13} /> {t('seo.audit')}
        </button>
        <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={bulkDelete}>
          <Trash2Icon size={13} /> {tc('table.delete')}
        </button>
      </DataTableSelectionBar>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('seo.path')}</DataTableTh>
              <DataTableTh>{t('seo.locale')}</DataTableTh>
              <DataTableTh>{t('seo.metaTitle')}</DataTableTh>
              <DataTableTh>{t('seo.indexable')}</DataTableTh>
              <DataTableTh>{t('seo.priority')}</DataTableTh>
              <DataTableTh>{t('seo.score')}</DataTableTh>
              <DataTableTh>{tc('table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && <DataTableEmpty label={t('common.loading')} />}
            {!loading && visible.length === 0 && (
              <DataTableEmpty icon={<GlobeIcon size={28} />} label={q ? tc('table.noResults', { query: q }) : '—'} />
            )}
            {visible.map((p) => (
              <DataTableRow key={p.id}>
                <DataTableSelectTd checked={selection.isSelected(p.id)} onChange={(checked) => selection.toggle(p.id, checked)} ariaLabel={tc('table.selectRow')} />
                <DataTableTd className="font-mono text-xs">{p.path}</DataTableTd>
                <DataTableTd>{p.locale}</DataTableTd>
                <DataTableTd className="max-w-xs truncate">{p.title || '—'}</DataTableTd>
                <DataTableTd>{p.indexable ? '✓' : '—'}</DataTableTd>
                <DataTableTd>{p.priority}</DataTableTd>
                <DataTableTd>
                  {p.last_audit_score != null
                    ? <Badge variant={p.last_audit_score >= 80 ? 'default' : 'secondary'}>{p.last_audit_score}</Badge>
                    : '—'}
                </DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={RefreshCwIcon} label={t('seo.audit')} onClick={() => audit(p.id)} />
                    <DataTableAction icon={Trash2Icon} label={t('common.delete')} variant="danger" onClick={() => remove(p)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </div>
  );
}

function CreatePageDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation('admin');
  const [open, setOpen]                 = useState(false);
  const [path, setPath]                 = useState('');
  const [locale, setLocale]             = useState('fr');
  const [title, setTitle]               = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiService.adminSeoCreatePage({ path, locale, title, meta_description: metaDescription, indexable: true, priority: 50 });
      onCreated();
      setOpen(false); setPath(''); setTitle(''); setMetaDescription('');
    } catch { toast.error(t('common.error')); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><PlusIcon className="size-4 mr-2" />{t('seo.newPage')}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('seo.newPage')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{t('seo.path')}</Label><Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/about" /></div>
          <div className="space-y-2"><Label>{t('seo.locale')}</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="fr">fr</option><option value="en">en</option>
            </select>
          </div>
          <div className="space-y-2"><Label>{t('seo.metaTitle')}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t('seo.metaDescription')}</Label><Textarea rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={submitting || !path}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KeywordsTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [items, setItems]   = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');

  const reload = () => apiService.adminSeoKeywords().then((d) => setItems(d.keywords || [])).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => filterRows(items, q, (k) => [k.keyword, k.locale, k.intent]), [items, q]);
  // No bulk endpoint for keywords: selection is for the CSV export.
  const selection = useRowSelection(visible, (k) => k.id);

  function exportSelection() {
    exportRowsCsv('seo-mots-cles', [
      [t('seo.keyword'), (k) => k.keyword],
      [t('seo.locale'), (k) => k.locale],
      [t('seo.intent'), (k) => k.intent ?? ''],
      [t('seo.rank'), (k) => k.rank ?? ''],
      [t('seo.volume'), (k) => k.search_volume ?? ''],
    ], selection.selectedRows);
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar right={<CreateKeywordDialog onCreated={reload} />}>
        <DataTableSearch value={q} onChange={setQ} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection} />

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('seo.keyword')}</DataTableTh>
              <DataTableTh>{t('seo.locale')}</DataTableTh>
              <DataTableTh>{t('seo.intent')}</DataTableTh>
              <DataTableTh>{t('seo.rank')}</DataTableTh>
              <DataTableTh>{t('seo.volume')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && <DataTableEmpty label={t('common.loading')} />}
            {!loading && visible.length === 0 && (
              <DataTableEmpty icon={<TargetIcon size={28} />} label={q ? tc('table.noResults', { query: q }) : '—'} />
            )}
            {visible.map((k) => (
              <DataTableRow key={k.id}>
                <DataTableSelectTd checked={selection.isSelected(k.id)} onChange={(checked) => selection.toggle(k.id, checked)} ariaLabel={tc('table.selectRow')} />
                <DataTableTd>{k.keyword}</DataTableTd>
                <DataTableTd>{k.locale}</DataTableTd>
                <DataTableTd>{k.intent || '—'}</DataTableTd>
                <DataTableTd>{k.rank ?? '—'}</DataTableTd>
                <DataTableTd>{k.search_volume ?? '—'}</DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </div>
  );
}

function CreateKeywordDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation('admin');
  const [open, setOpen]       = useState(false);
  const [keyword, setKeyword] = useState('');
  const [locale, setLocale]   = useState('fr');
  const [intent, setIntent]   = useState('informational');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiService.adminSeoCreateKeyword({ keyword, locale, intent });
      onCreated(); setOpen(false); setKeyword('');
    } catch { toast.error(t('common.error')); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><PlusIcon className="size-4 mr-2" />{t('seo.newKeyword')}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('seo.newKeyword')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{t('seo.keyword')}</Label><Input value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t('seo.locale')}</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="fr">fr</option><option value="en">en</option>
            </select>
          </div>
          <div className="space-y-2"><Label>{t('seo.intent')}</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={intent} onChange={(e) => setIntent(e.target.value)}>
              {['informational','navigational','transactional','commercial'].map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={submitting || !keyword}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

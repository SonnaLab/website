import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiService } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';

interface SeoPage {
  id: string; path: string; locale: string; title?: string;
  meta_description?: string; canonical_url?: string; indexable: boolean;
  priority: number; last_audit_score?: number;
}
interface Keyword { id: string; keyword: string; locale: string; intent?: string; rank?: number; search_volume?: number; seo_page_id?: string }

export default function AdminSeo() {
  const { t } = useTranslation('admin');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('seo.title')}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('seo.subtitle')}</p>
      </header>

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
  const [pages, setPages]     = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => apiService.adminSeoPages().then((d) => setPages(d.pages || [])).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  const audit = async (id: string) => {
    try { await apiService.adminSeoAuditPage(id); toast.success(t('seo.audit')); reload(); }
    catch { toast.error(t('common.error')); }
  };
  const remove = async (id: string) => {
    if (!confirm('?')) return;
    try { await apiService.adminSeoDeletePage(id); reload(); } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreatePageDialog onCreated={reload} />
      </div>

      <Card className="overflow-hidden">
        {loading ? <p className="p-6 text-sm text-muted-foreground">…</p>
          : pages.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('common.loading')}</p>
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('seo.path')}</TableHead>
                  <TableHead>{t('seo.locale')}</TableHead>
                  <TableHead>{t('seo.metaTitle')}</TableHead>
                  <TableHead>{t('seo.indexable')}</TableHead>
                  <TableHead>{t('seo.priority')}</TableHead>
                  <TableHead>{t('seo.score')}</TableHead>
                  <TableHead className="text-right">{t('appointments.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.path}</TableCell>
                    <TableCell>{p.locale}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.title || '—'}</TableCell>
                    <TableCell>{p.indexable ? '✓' : '—'}</TableCell>
                    <TableCell>{p.priority}</TableCell>
                    <TableCell>
                      {p.last_audit_score != null
                        ? <Badge variant={p.last_audit_score >= 80 ? 'default' : 'secondary'}>{p.last_audit_score}</Badge>
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => audit(p.id)}>
                        <RefreshCw className="size-3.5 mr-1" />{t('seo.audit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
      <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />{t('seo.newPage')}</Button></DialogTrigger>
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
  const [items, setItems]   = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => apiService.adminSeoKeywords().then((d) => setItems(d.keywords || [])).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateKeywordDialog onCreated={reload} />
      </div>
      <Card className="overflow-hidden">
        {loading ? <p className="p-6 text-sm text-muted-foreground">…</p>
          : items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">—</p>
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('seo.keyword')}</TableHead>
                  <TableHead>{t('seo.locale')}</TableHead>
                  <TableHead>{t('seo.intent')}</TableHead>
                  <TableHead>{t('seo.rank')}</TableHead>
                  <TableHead>{t('seo.volume')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.keyword}</TableCell>
                    <TableCell>{k.locale}</TableCell>
                    <TableCell>{k.intent || '—'}</TableCell>
                    <TableCell>{k.rank ?? '—'}</TableCell>
                    <TableCell>{k.search_volume ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
      <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />{t('seo.newKeyword')}</Button></DialogTrigger>
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

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SendIcon, PlusIcon, ArchiveIcon } from '@icons';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Conversation {
  id: string; title?: string; provider: string; model: string; status: string;
  message_count: number; total_tokens: number; created_at: string;
  messages?: Message[];
}
interface Message { id: string; role: string; content: string; total_tokens?: number; created_at: string }
interface Quota   { max_tokens: number; tokens_used: number; max_messages: number; messages_used: number; exhausted: boolean }

export default function AdminOuou() {
  const { t } = useTranslation('admin');
  const [convos, setConvos]     = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive]     = useState<Conversation | null>(null);
  const [quota, setQuota]       = useState<Quota | null>(null);
  const [models, setModels]     = useState<any[]>([]);
  const [prompt, setPrompt]     = useState('');
  const [sending, setSending]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const reloadConvos = () =>
    apiService.adminOuouConversations().then((d) => {
      setConvos(d.conversations || []);
      if (!activeId && d.conversations?.[0]) setActiveId(d.conversations[0].id);
    });
  const reloadQuota = () => apiService.adminOuouQuota().then((d) => setQuota(d.quota));

  useEffect(() => {
    reloadConvos();
    reloadQuota();
    apiService.adminOuouModels().then((d) => setModels(d.models || []));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    apiService.adminOuouConversation(activeId).then((d) => setActive(d.conversation));
  }, [activeId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages?.length]);

  const send = async () => {
    if (!activeId || !prompt.trim()) return;
    setSending(true);
    try {
      await apiService.adminOuouSendMessage(activeId, prompt.trim());
      setPrompt('');
      const [convo] = await Promise.all([
        apiService.adminOuouConversation(activeId),
        reloadQuota(),
      ]);
      setActive(convo.conversation);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSending(false);
    }
  };

  const archive = async (id: string) => {
    await apiService.adminOuouArchive(id);
    reloadConvos();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('ouou.title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t('ouou.subtitle')}</p>
        </div>
        <CreateConversationDialog
          open={createOpen} setOpen={setCreateOpen} models={models}
          onCreated={(c) => { reloadConvos(); setActiveId(c.id); }}
        />
      </header>

      {quota && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t('ouou.quotaTitle')}</span>
            {quota.exhausted && <Badge variant="destructive">{t('ouou.quotaExhausted')}</Badge>}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t('ouou.tokens')}</span>
                <span>{t('ouou.quotaUsed', { used: quota.tokens_used, max: quota.max_tokens })}</span>
              </div>
              <Progress value={(quota.tokens_used / quota.max_tokens) * 100} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t('ouou.messages')}</span>
                <span>{t('ouou.quotaUsed', { used: quota.messages_used, max: quota.max_messages })}</span>
              </div>
              <Progress value={(quota.messages_used / quota.max_messages) * 100} />
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {convos.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">{t('ouou.conversations')} —</p>
          )}
          <ul className="space-y-1">
            {convos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    c.id === activeId ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <div className="truncate font-medium">{c.title || c.model}</div>
                  <div className="text-xs opacity-70 truncate">
                    {c.message_count} msg · {c.total_tokens} tok
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col h-[70vh]">
          {active ? (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{active.title || active.model}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.provider} · {active.model}
                  </p>
                </div>
                {active.status === 'active' && (
                  <Button size="sm" variant="ghost" onClick={() => archive(active.id)}>
                    <ArchiveIcon className="size-4 mr-1" /> {t('ouou.archive')}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(active.messages || []).filter((m) => m.role !== 'system').map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              <div className="border-t border-border p-3 flex gap-2">
                <Textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('ouou.promptPlaceholder')}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <Button onClick={send} disabled={sending || !prompt.trim() || quota?.exhausted}>
                  <SendIcon className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              {t('common.loading')}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface CreateProps {
  open: boolean;
  setOpen: (b: boolean) => void;
  models: any[];
  onCreated: (c: Conversation) => void;
}
function CreateConversationDialog({ open, setOpen, models, onCreated }: CreateProps) {
  const { t } = useTranslation('admin');
  const [title, setTitle]   = useState('');
  const [model, setModel]   = useState(models[0]?.id || '');
  const [system, setSystem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { conversation } = await apiService.adminOuouCreateConversation({
        title: title || undefined,
        provider: models.find((m) => m.id === model)?.provider || 'local',
        model:    model || undefined,
        system_prompt: system || undefined,
      });
      onCreated(conversation);
      setOpen(false); setTitle(''); setSystem('');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusIcon className="size-4 mr-2" />{t('ouou.newConversation')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('ouou.newConversation')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('ouou.conversations')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          </div>
          <div className="space-y-2">
            <Label>{t('ouou.model')}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={model} onChange={(e) => setModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id} {m.provider ? `(${m.provider})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea rows={3} value={system} onChange={(e) => setSystem(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={submitting}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

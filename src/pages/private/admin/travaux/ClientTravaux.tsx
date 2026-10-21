import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import {
  CheckCircleIcon,
  FileSignatureIcon,
  FileTextIcon,
  FolderKanbanIcon,
  KanbanIcon,
  PlusIcon,
  ReceiptIcon,
  TargetIcon,
  WalletIcon,
} from '@icons';
import type { TravauxInvoice } from '@/types/travaux';
import { Breadcrumbs } from '@/components/private/common/Breadcrumbs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { formatCents } from './format';
import { ContractsTab } from './ContractsTab';
import { InvoicesTab } from './InvoicesTab';
import { ObjectivesTab } from './ObjectivesTab';
import { PaymentsTab } from './PaymentsTab';
import { TasksTab } from './TasksTab';
import type { TravauxTabHandle } from './tabHandle';
import { useTravauxData } from './useTravauxData';

type TabKey = 'objectives' | 'tracking' | 'quotes' | 'invoices' | 'contracts' | 'payments';
const TAB_KEYS: TabKey[] = ['objectives', 'tracking', 'quotes', 'invoices', 'payments', 'contracts'];

/**
 * Travaux d'un client (action « plot » du tableau des clients) : livrables
 * par projet, kanban des tâches, devis, factures, contrats et paiements.
 * L'onglet actif est dans l'URL (?tab=) pour pouvoir y revenir directement.
 */
export default function AdminClientTravaux() {
  const { t } = useTranslation('admin');
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = urlTab && TAB_KEYS.includes(urlTab) ? urlTab : 'objectives';
  const setTab = (next: string) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev);
    params.set('tab', next);
    return params;
  });
  const [autoPreviewId, setAutoPreviewId] = useState<string | null>(null);
  const consumeAutoPreview = useCallback(() => setAutoPreviewId(null), []);

  const data = useTravauxData(clientId);
  // On a phone the tabs scroll sideways: keep the open one in view (e.g. ?tab=quotes).
  const tabsBar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = tabsBar.current?.querySelector<HTMLElement>('.adm-tabs__list');
    const active = list?.querySelector<HTMLElement>('.adm-tabs__trigger--active');
    if (list && active) list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [tab, data.loading]);
  const refs: Record<TabKey, React.RefObject<TravauxTabHandle>> = {
    objectives: useRef<TravauxTabHandle>(null),
    tracking:   useRef<TravauxTabHandle>(null),
    quotes:     useRef<TravauxTabHandle>(null),
    invoices:   useRef<TravauxTabHandle>(null),
    contracts:  useRef<TravauxTabHandle>(null),
    payments:   useRef<TravauxTabHandle>(null),
  };

  // Invoices have no « Nouveau » button: they are generated from a quote.
  const NEW_LABEL: Record<TabKey, string | null> = {
    objectives: t('travaux.objectives.new'),
    tracking:   t('travaux.tracking.new'),
    quotes:     t('travaux.invoices.new'),
    invoices:   null,
    contracts:  t('travaux.contracts.new'),
    payments:   t('travaux.payments.new'),
  };

  if (!clientId) return null;
  const { client } = data;
  const invoiced = data.invoices
    .filter((i) => i.kind === 'invoice' && !['draft', 'cancelled'].includes(i.status))
    .reduce((sum, i) => sum + i.amount_cents, 0);
  const paid = data.payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount_cents, 0);

  const quotes = data.invoices.filter((i) => i.kind === 'quote');
  const invoices = data.invoices.filter((i) => i.kind === 'invoice');
  const documentsTab = (kind: 'quote' | 'invoice') => (
    <InvoicesTab
      ref={refs[kind === 'quote' ? 'quotes' : 'invoices']}
      kind={kind}
      clientId={clientId}
      client={client}
      issuer={data.issuer}
      invoices={data.invoices}
      objectives={data.objectives}
      tasks={data.tasks}
      payments={data.payments}
      reload={data.reload}
      autoPreviewId={autoPreviewId}
      onAutoPreviewConsumed={consumeAutoPreview}
    />
  );
  const newLabel = NEW_LABEL[tab];

  return (
    <div className="dash-page">
      {/* The Travaux header, unchanged from the clients list: only the CTA
          follows the open tab; the trail below names the client. */}
      <PageHeader
        title={t('travaux.clients.heading')}
        description={t('travaux.subtitle')}
        actions={
          <>
            {tab === 'objectives' && !data.loading && (
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => refs.objectives.current?.openNewProject?.()}>
                <PlusIcon size={14} /> {t('travaux.projects.new')}
              </button>
            )}
            {/* The open tab's « Nouveau … » (invoices come from a quote). */}
            {newLabel && !data.loading && (
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => refs[tab].current?.openNew()}>
                <PlusIcon size={14} /> {newLabel}
              </button>
            )}
          </>
        }
      />

      {/* Same figures as the clients table (API stats_for), plus the open tasks. */}
      <StatRow>
        <StatCard loading={data.loading} icon={<FolderKanbanIcon size={18} />} label={t('travaux.clients.table.projects')} value={data.projects.length} />
        <StatCard loading={data.loading} icon={<TargetIcon size={18} />} label={t('travaux.clients.table.inProgress')} value={data.objectives.filter((o) => o.status !== 'done').length} />
        <StatCard loading={data.loading} icon={<CheckCircleIcon size={18} />} label={t('travaux.stats.openTasks')} value={data.tasks.filter((task) => task.column !== 'done').length} />
        <StatCard loading={data.loading} icon={<ReceiptIcon size={18} />} label={t('travaux.clients.table.invoiced')} value={formatCents(invoiced)} />
        <StatCard loading={data.loading} icon={<WalletIcon size={18} />} label={t('travaux.clients.table.paid')} value={formatCents(paid)} tone={paid ? 'success' : undefined} />
      </StatRow>

      <Breadcrumbs items={[{ label: t('nav.travaux'), to: '/admin/travaux' }, { label: client?.name ?? '…' }]} />

      {data.error && <p className="trv-error">{t('common.error')}</p>}
      {data.loading ? (
        <p className="trk-loading">{t('common.loading')}</p>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="trv-tabs-bar" ref={tabsBar}>
            <TabsList>
              <TabsTrigger value="objectives" icon={<TargetIcon size={14} />} count={data.objectives.length}>{t('travaux.tabs.objectives')}</TabsTrigger>
              <TabsTrigger value="tracking" icon={<KanbanIcon size={14} />} count={data.tasks.length}>{t('travaux.tabs.tracking')}</TabsTrigger>
              <TabsTrigger value="quotes" icon={<FileTextIcon size={14} />} count={quotes.length}>{t('travaux.tabs.quotes')}</TabsTrigger>
              <TabsTrigger value="invoices" icon={<ReceiptIcon size={14} />} count={invoices.length}>{t('travaux.tabs.invoices')}</TabsTrigger>
              <TabsTrigger value="payments" icon={<WalletIcon size={14} />} count={data.payments.length}>{t('travaux.tabs.payments')}</TabsTrigger>
              <TabsTrigger value="contracts" icon={<FileSignatureIcon size={14} />} count={data.contracts.length}>{t('travaux.tabs.contracts')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="objectives">
            <ObjectivesTab
              ref={refs.objectives}
              clientId={clientId}
              client={client}
              issuer={data.issuer}
              projects={data.projects}
              objectives={data.objectives}
              tasks={data.tasks}
              invoices={data.invoices}
              reload={data.reload}
              onDevisCreated={(invoice: TravauxInvoice) => {
                setAutoPreviewId(invoice.id);
                setTab('quotes');
              }}
            />
          </TabsContent>
          <TabsContent value="tracking">
            <TasksTab ref={refs.tracking} clientId={clientId} tasks={data.tasks} objectives={data.objectives} reload={data.reload} />
          </TabsContent>
          <TabsContent value="quotes">{documentsTab('quote')}</TabsContent>
          <TabsContent value="invoices">{documentsTab('invoice')}</TabsContent>
          <TabsContent value="contracts">
            <ContractsTab ref={refs.contracts} clientId={clientId} contracts={data.contracts} reload={data.reload} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab ref={refs.payments} clientId={clientId} payments={data.payments} invoices={data.invoices} reload={data.reload} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

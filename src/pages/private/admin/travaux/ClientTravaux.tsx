import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import {
  FileSignatureIcon,
  FileTextIcon,
  KanbanIcon,
  PlusIcon,
  ReceiptIcon,
  TargetIcon,
  WalletIcon,
} from '@icons';
import type { TravauxInvoice } from '@/types/travaux';
import { Breadcrumbs } from '@/components/private/common/Breadcrumbs';
import { formatCents } from './format';
import { ContractsTab } from './ContractsTab';
import { InvoicesTab } from './InvoicesTab';
import { ObjectivesTab } from './ObjectivesTab';
import { PaymentsTab } from './PaymentsTab';
import { TasksTab } from './TasksTab';
import type { TravauxTabHandle } from './tabHandle';
import { useTravauxData } from './useTravauxData';

type TabKey = 'objectives' | 'tracking' | 'quotes' | 'invoices' | 'contracts' | 'payments';
const TAB_KEYS: TabKey[] = ['objectives', 'tracking', 'quotes', 'invoices', 'contracts', 'payments'];

/**
 * Travaux d'un client (action « plot » du tableau des clients) : livrables
 * par projet, kanban des tâches, devis, factures, contrats et paiements.
 * L'onglet actif est dans l'URL (?tab=) pour pouvoir y revenir directement.
 */
export default function AdminClientTravaux() {
  const { t } = useTranslation('admin');
  const { clientId } = useParams<{ clientId: string }>();
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
  // Same figures as the clients table (API stats_for), plus the open tasks.
  const invoiced = data.invoices
    .filter((i) => i.kind === 'invoice' && !['draft', 'cancelled'].includes(i.status))
    .reduce((sum, i) => sum + i.amount_cents, 0);
  const paid = data.payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount_cents, 0);
  const stats: { label: string; value: string | number; danger?: boolean }[] = [
    { label: t('travaux.clients.table.projects'), value: data.projects.length },
    { label: t('travaux.clients.table.inProgress'), value: data.objectives.filter((o) => o.status !== 'done').length },
    { label: t('travaux.stats.openTasks'), value: data.tasks.filter((task) => task.column !== 'done').length },
    { label: t('travaux.clients.table.invoiced'), value: formatCents(invoiced) },
    { label: t('travaux.clients.table.paid'), value: formatCents(paid) },
  ];

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
      reload={data.reload}
      autoPreviewId={autoPreviewId}
      onAutoPreviewConsumed={consumeAutoPreview}
      onInvoiceGenerated={(invoice) => {
        setAutoPreviewId(invoice.id);
        setTab('invoices');
      }}
    />
  );
  const newLabel = NEW_LABEL[tab];

  return (
    <div className="trv-page">
      <Breadcrumbs items={[{ label: t('nav.travaux'), to: '/admin/travaux' }, { label: client?.name ?? '…' }]} />

      {/* The client's figures, as on the News page (its name is in the trail). */}
      <div className="admin-news-overview__stats trv-stats">
        {stats.map(({ label, value, danger }) => (
          <div key={label} className={`admin-news-overview__stat-card${danger ? ' admin-news-overview__stat-card--danger' : ''}`}>
            <span className="admin-news-overview__stat-value">{data.loading ? '—' : value}</span>
            <span className="admin-news-overview__stat-label">{label}</span>
          </div>
        ))}
      </div>

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
              <TabsTrigger value="contracts" icon={<FileSignatureIcon size={14} />} count={data.contracts.length}>{t('travaux.tabs.contracts')}</TabsTrigger>
              <TabsTrigger value="payments" icon={<WalletIcon size={14} />} count={data.payments.length}>{t('travaux.tabs.payments')}</TabsTrigger>
            </TabsList>
            {newLabel && (
              <button type="button" className="adm-btn adm-btn--primary trv-tabs-bar__new" title={newLabel} onClick={() => refs[tab].current?.openNew()}>
                <PlusIcon size={14} /> <span className="trv-tabs-bar__new-label">{newLabel}</span>
              </button>
            )}
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

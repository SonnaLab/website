import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { apiService, type MailingOverview } from '@/services/api';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { CheckCircleIcon, ClockIcon, FileTextIcon, MegaphoneIcon, PlusIcon, SendIcon, UsersIcon, XCircleIcon } from '@icons';
import { TemplatesTab } from './TemplatesTab';
import { CampaignsTab } from './CampaignsTab';
import { NewsletterTab } from './NewsletterTab';

const TABS = ['templates', 'campaigns', 'newsletter'] as const;
type TabKey = typeof TABS[number];

/**
 * « Gestion du mailing »: the e-mail templates (rendered, test sends), the
 * campaigns, and the newsletter's subscribers with their preferences.
 */
export default function AdminMailing() {
  const { t } = useTranslation('admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = urlTab && TABS.includes(urlTab) ? urlTab : 'templates';
  const setTab = (next: string) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev);
    params.set('tab', next);
    return params;
  }, { replace: true });

  const [overview, setOverview] = useState<MailingOverview | null>(null);
  const loadOverview = useCallback(() => { apiService.adminMailingOverview().then(setOverview).catch(() => {}); }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  // The header's CTA opens the current tab's form.
  const [creating, setCreating] = useState<TabKey | null>(null);

  return (
    <div className="dash-page">
      <PageHeader
        title={t('mailing.heading')}
        description={t('mailing.subtitle')}
        actions={
          tab === 'campaigns' ? (
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setCreating('campaigns')}>
              <PlusIcon size={14} /> {t('mailing.campaigns.new')}
            </button>
          ) : tab === 'newsletter' ? (
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setCreating('newsletter')}>
              <PlusIcon size={14} /> {t('mailing.subscribers.new')}
            </button>
          ) : undefined
        }
      />

      <StatRow>
        <StatCard icon={<UsersIcon size={18} />} label={t('mailing.stats.confirmed')} value={overview?.subscribers.confirmed ?? '—'} />
        <StatCard icon={<ClockIcon size={18} />} label={t('mailing.stats.pending')} value={overview?.subscribers.pending ?? '—'} />
        <StatCard icon={<XCircleIcon size={18} />} label={t('mailing.stats.unsubscribed')} value={overview?.subscribers.unsubscribed ?? '—'} />
        <StatCard icon={<MegaphoneIcon size={18} />} label={t('mailing.stats.campaigns')} value={overview ? `${overview.campaigns.sent} / ${overview.campaigns.total}` : '—'} />
        <StatCard icon={<CheckCircleIcon size={18} />} label={t('mailing.stats.delivered')} value={overview?.delivered_30d ?? '—'} />
      </StatRow>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="templates" icon={<FileTextIcon size={14} />}>{t('mailing.tabs.templates')}</TabsTrigger>
          <TabsTrigger value="campaigns" icon={<SendIcon size={14} />} count={overview?.campaigns.total}>{t('mailing.tabs.campaigns')}</TabsTrigger>
          <TabsTrigger value="newsletter" icon={<UsersIcon size={14} />} count={overview ? overview.subscribers.confirmed + overview.subscribers.pending : undefined}>{t('mailing.tabs.newsletter')}</TabsTrigger>
        </TabsList>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab creating={creating === 'campaigns'} onCreated={() => setCreating(null)} onChange={loadOverview} />
        </TabsContent>
        <TabsContent value="newsletter">
          <NewsletterTab creating={creating === 'newsletter'} onCreated={() => setCreating(null)} onChange={loadOverview} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

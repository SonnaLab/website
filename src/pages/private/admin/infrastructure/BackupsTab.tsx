import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, saveBlob, type InfraBackup } from '@/services/api';
import { Card } from '@/components/ui/card';
import { DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { DownloadIcon, LayersIcon, PlusIcon } from '@icons';
import { cronLabel, formatBytes, formatDateTime } from './format';

/** Database backups: the automatic ones, « Sauvegarder maintenant », downloads. */
export function BackupsTab() {
  const { t, i18n } = useTranslation('admin');
  const [data, setData] = useState<{ backups: InfraBackup[]; keep: number; cron: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const locale = i18n.language;

  const load = () => apiService.adminInfraBackups().then(setData).catch(() => setData({ backups: [], keep: 0, cron: null }));
  useEffect(() => { load(); }, []);

  async function backupNow() {
    setBusy('new');
    try {
      await apiService.adminInfraCreateBackup();
      toast.success(t('infrastructure.backups.queued'));
      window.setTimeout(load, 6000);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  async function download(backup: InfraBackup) {
    setBusy(backup.name);
    try {
      const { blob, filename } = await apiService.adminInfraDownloadBackup(backup.name);
      saveBlob(blob, filename);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="infra-stack">
      <div className="infra-toolbar">
        <p className="trv-info">
          {t('infrastructure.backups.policy', { when: cronLabel(data?.cron ?? null, t), keep: data?.keep ?? 14 })}
          <br />
          <span className="trv-muted">{t('infrastructure.backups.restore')} <code className="infra-mono">pg_restore --clean --no-owner -d sonnalab &lt;fichier&gt;</code></span>
        </p>
        <button type="button" className="adm-btn adm-btn--primary" disabled={busy === 'new'} onClick={backupNow}>
          <PlusIcon size={14} /> {t('infrastructure.backups.now')}
        </button>
      </div>
      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('infrastructure.backups.file')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('infrastructure.db.size')}</DataTableTh>
              <DataTableTh>{t('infrastructure.backups.date')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {data === null && <DataTableEmpty label={t('common.loading')} />}
            {data?.backups.length === 0 && <DataTableEmpty icon={<LayersIcon size={28} />} label={t('infrastructure.backups.empty')} />}
            {data?.backups.map((backup) => (
              <DataTableRow key={backup.name}>
                <DataTableTd><span className="infra-mono">{backup.name}</span></DataTableTd>
                <DataTableTd className="trv-col-num trv-num">{formatBytes(backup.size_bytes, locale)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDateTime(backup.created_at, locale)}</DataTableTd>
                <DataTableTd>
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" disabled={busy === backup.name} onClick={() => download(backup)}>
                    <DownloadIcon size={13} /> {t('infrastructure.backups.download')}
                  </button>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </div>
  );
}

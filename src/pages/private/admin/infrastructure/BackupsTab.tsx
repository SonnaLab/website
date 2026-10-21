import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, saveBlob, type BackupTier, type InfraBackup, type InfraBackupTier } from '@/services/api';
import { Card } from '@/components/ui/card';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { CheckCircleIcon, DownloadIcon, LayersIcon, AlertTriangleIcon } from '@icons';
import { cronLabel, formatBytes, formatDateTime } from './format';

const idOf = (backup: InfraBackup) => backup.name;

/**
 * Database backups by tier (daily → annual, and manual): what each keeps,
 * the latest one, every file with its verification, downloads. « Sauvegarder
 * maintenant » lives in the page header; `reloadKey` changes when it ran.
 */
export function BackupsTab({ reloadKey = 0 }: { reloadKey?: number }) {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<{ backups: InfraBackup[]; tiers: InfraBackupTier[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<BackupTier | 'all'>('all');
  const locale = i18n.language;

  const load = () => apiService.adminInfraBackups().then(setData).catch(() => setData({ backups: [], tiers: [] }));
  useEffect(() => { load(); }, [reloadKey]);

  const tierLabel = (key: BackupTier) => t(`infrastructure.backups.tiers.${key}`);
  const rows = useMemo(() => filterRows(
    (data?.backups ?? []).filter((b) => tier === 'all' || b.tier === tier),
    query,
    (b) => [b.name, tierLabel(b.tier), formatDateTime(b.created_at, locale)],
  ), [data, query, tier, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const selection = useRowSelection(rows, idOf);

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

  // Bulk: one download after the other (large files, one save each).
  async function bulkDownload() {
    setBusy('bulk');
    let failed = 0;
    const selected = selection.selectedRows;
    for (const backup of selected) {
      try {
        const { blob, filename } = await apiService.adminInfraDownloadBackup(backup.name);
        saveBlob(blob, filename);
      } catch {
        failed += 1;
      }
    }
    setBusy(null);
    if (failed) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: selected.length }));
    selection.clear();
  }

  function exportSelection() {
    exportRowsCsv('sauvegardes', [
      [t('infrastructure.backups.file'), (b) => b.name],
      [t('infrastructure.backups.tier'), (b) => tierLabel(b.tier)],
      [t('infrastructure.db.size'), (b) => formatBytes(b.size_bytes, locale)],
      [t('infrastructure.backups.date'), (b) => formatDateTime(b.created_at, locale)],
      ['SHA-256', (b) => b.sha256 ?? ''],
    ], selection.selectedRows);
  }

  return (
    <div className="infra-stack">
      <p className="trv-info">
        {t('infrastructure.backups.policy')}
        <br />
        <span className="trv-muted">{t('infrastructure.backups.restore')} <code className="infra-mono">pg_restore --clean --if-exists --no-owner -d sonnalab &lt;fichier&gt;</code></span>
      </p>

      {/* One card per tier: schedule, how many kept, the latest. */}
      <div className="bk-tiers">
        {(data?.tiers ?? []).map((item) => (
          <button
            key={item.tier}
            type="button"
            className={`bk-tier${tier === item.tier ? ' is-active' : ''}`}
            onClick={() => setTier(tier === item.tier ? 'all' : item.tier)}
          >
            <span className="bk-tier__name">{tierLabel(item.tier)}</span>
            <span className="bk-tier__when">{item.tier === 'manual' ? t('infrastructure.backups.onDemand') : cronLabel(item.cron, t)}</span>
            <span className="bk-tier__count">{t('infrastructure.backups.kept', { count: item.count, keep: item.keep })}</span>
            <span className="bk-tier__last">
              {item.last_at ? t('infrastructure.backups.last', { date: formatDateTime(item.last_at, locale) }) : t('infrastructure.backups.none')}
            </span>
          </button>
        ))}
      </div>

      <DataTableToolbar right={
        <div className="infra-chips" role="group">
          {(['all', 'daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'manual'] as const).map((key) => (
            <button key={key} type="button" className={tier === key ? 'is-active' : ''} onClick={() => setTier(key)}>
              {key === 'all' ? t('infrastructure.backups.all') : tierLabel(key)}
            </button>
          ))}
        </div>
      }>
        <DataTableSearch value={query} onChange={setQuery} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy === 'bulk'} onClick={bulkDownload}>
          <DownloadIcon size={13} /> {t('infrastructure.backups.download')}
        </button>
      </DataTableSelectionBar>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('infrastructure.backups.file')}</DataTableTh>
              <DataTableTh>{t('infrastructure.backups.tier')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('infrastructure.db.size')}</DataTableTh>
              <DataTableTh>{t('infrastructure.backups.date')}</DataTableTh>
              <DataTableTh>{tc('table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {data === null && <DataTableEmpty label={t('common.loading')} />}
            {data !== null && rows.length === 0 && (
              <DataTableEmpty icon={<LayersIcon size={28} />} label={query ? tc('table.noResults', { query }) : t('infrastructure.backups.empty')} />
            )}
            {rows.map((backup) => (
              <DataTableRow key={backup.name}>
                <DataTableSelectTd checked={selection.isSelected(backup.name)} onChange={(checked) => selection.toggle(backup.name, checked)} ariaLabel={tc('table.selectRow')} />
                <DataTableTd>
                  <span className="bk-file">
                    {backup.verified
                      ? <span title={t('infrastructure.backups.verified')} className="bk-file__ok"><CheckCircleIcon size={14} /></span>
                      : <span title={t('infrastructure.backups.unverified')} className="bk-file__warn"><AlertTriangleIcon size={14} /></span>}
                    <span className="infra-mono">{backup.name}</span>
                  </span>
                </DataTableTd>
                <DataTableTd><span className={`bk-pill bk-pill--${backup.tier}`}>{tierLabel(backup.tier)}</span></DataTableTd>
                <DataTableTd className="trv-col-num trv-num">{formatBytes(backup.size_bytes, locale)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDateTime(backup.created_at, locale)}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={DownloadIcon} label={t('infrastructure.backups.download')} disabled={busy === backup.name} onClick={() => download(backup)} />
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

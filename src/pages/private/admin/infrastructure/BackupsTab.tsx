import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, saveBlob, type InfraBackup } from '@/services/api';
import { Card } from '@/components/ui/card';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { DownloadIcon, LayersIcon, PlusIcon } from '@icons';
import { cronLabel, formatBytes, formatDateTime } from './format';

const idOf = (backup: InfraBackup) => backup.name;

/** Database backups: the automatic ones, « Sauvegarder maintenant », downloads. */
export function BackupsTab() {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<{ backups: InfraBackup[]; keep: number; cron: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const locale = i18n.language;

  const load = () => apiService.adminInfraBackups().then(setData).catch(() => setData({ backups: [], keep: 0, cron: null }));
  useEffect(() => { load(); }, []);

  const rows = useMemo(
    () => filterRows(data?.backups ?? [], query, (b) => [b.name, formatDateTime(b.created_at, locale)]),
    [data, query, locale],
  );
  const selection = useRowSelection(rows, idOf);

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
    load();
  }

  function exportSelection() {
    exportRowsCsv('sauvegardes', [
      [t('infrastructure.backups.file'), (b) => b.name],
      [t('infrastructure.db.size'), (b) => formatBytes(b.size_bytes, locale)],
      [t('infrastructure.backups.date'), (b) => formatDateTime(b.created_at, locale)],
    ], selection.selectedRows);
  }

  return (
    <div className="infra-stack">
      <p className="trv-info">
        {t('infrastructure.backups.policy', { when: cronLabel(data?.cron ?? null, t), keep: data?.keep ?? 14 })}
        <br />
        <span className="trv-muted">{t('infrastructure.backups.restore')} <code className="infra-mono">pg_restore --clean --no-owner -d sonnalab &lt;fichier&gt;</code></span>
      </p>

      <DataTableToolbar right={
        <button type="button" className="adm-btn adm-btn--primary" disabled={busy === 'new'} onClick={backupNow}>
          <PlusIcon size={14} /> {t('infrastructure.backups.now')}
        </button>
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
              <DataTableTh className="trv-col-num">{t('infrastructure.db.size')}</DataTableTh>
              <DataTableTh>{t('infrastructure.backups.date')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
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
                <DataTableTd><span className="infra-mono">{backup.name}</span></DataTableTd>
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

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService, type InfraDatabase } from '@/services/api';
import { Card } from '@/components/ui/card';
import {
  DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { LayersIcon } from '@icons';
import { Row } from './OverviewTab';
import { formatBytes, formatDateTime, formatNumber } from './format';

type DbTable = InfraDatabase['tables'][number];
const idOf = (table: DbTable) => table.name;

/** The PostgreSQL server, then every table by size. */
export function DatabaseTab() {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [db, setDb] = useState<InfraDatabase | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const locale = i18n.language;

  useEffect(() => { apiService.adminInfraDatabase().then(setDb).catch(() => setError(true)); }, []);

  const rows = useMemo(() => filterRows(db?.tables ?? [], query, (table) => [table.name]), [db, query]);
  const selection = useRowSelection(rows, idOf);

  // Read-only: the CSV export is the bulk action.
  function exportSelection() {
    exportRowsCsv('tables-postgresql', [
      [t('infrastructure.db.table'), (r) => r.name],
      [t('infrastructure.db.rows'), (r) => r.rows],
      [t('infrastructure.db.size'), (r) => formatBytes(r.bytes, locale)],
      [t('infrastructure.db.seqScans'), (r) => r.seq_scan],
      [t('infrastructure.db.idxScans'), (r) => r.idx_scan ?? ''],
      [t('infrastructure.db.vacuum'), (r) => formatDateTime(r.last_vacuum_at, locale)],
    ], selection.selectedRows);
  }

  if (error) return <p className="trv-error">{t('common.error')}</p>;
  if (!db) return <p className="trk-loading">{t('common.loading')}</p>;

  return (
    <div className="infra-stack">
      <section className="infra-panel">
        <header className="infra-panel__head"><h3>PostgreSQL {db.version}</h3></header>
        <dl className="infra-panel__rows infra-panel__rows--cols">
          <Row label={t('infrastructure.db.size')} value={formatBytes(db.size_bytes, locale)} />
          <Row label={t('infrastructure.db.tables')} value={db.tables.length} />
          <Row label={t('infrastructure.db.connections')} value={`${db.connections} / ${db.max_connections}`} />
          <Row label={t('infrastructure.db.cacheHit')} value={db.cache_hit_ratio != null ? `${(db.cache_hit_ratio * 100).toFixed(1)} %` : '—'} />
          <Row label={t('infrastructure.db.startedAt')} value={formatDateTime(db.started_at, locale)} />
          <Row label={t('infrastructure.db.migration')} value={db.latest_migration} />
        </dl>
      </section>

      <div>
        <DataTableToolbar>
          <DataTableSearch value={query} onChange={setQuery} />
        </DataTableToolbar>

        <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection} />

        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
                <DataTableTh>{t('infrastructure.db.table')}</DataTableTh>
                <DataTableTh className="trv-col-num">{t('infrastructure.db.rows')}</DataTableTh>
                <DataTableTh className="trv-col-num">{t('infrastructure.db.size')}</DataTableTh>
                <DataTableTh className="trv-col-num">{t('infrastructure.db.seqScans')}</DataTableTh>
                <DataTableTh className="trv-col-num">{t('infrastructure.db.idxScans')}</DataTableTh>
                <DataTableTh>{t('infrastructure.db.vacuum')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {rows.length === 0 && <DataTableEmpty icon={<LayersIcon size={28} />} label={tc('table.noResults', { query })} />}
              {rows.map((table) => (
                <DataTableRow key={table.name}>
                  <DataTableSelectTd checked={selection.isSelected(table.name)} onChange={(checked) => selection.toggle(table.name, checked)} ariaLabel={tc('table.selectRow')} />
                  <DataTableTd><span className="infra-mono">{table.name}</span></DataTableTd>
                  <DataTableTd className="trv-col-num trv-num">{formatNumber(table.rows, locale)}</DataTableTd>
                  <DataTableTd className="trv-col-num trv-num">{formatBytes(table.bytes, locale)}</DataTableTd>
                  <DataTableTd className="trv-col-num trv-num">{formatNumber(table.seq_scan, locale)}</DataTableTd>
                  <DataTableTd className="trv-col-num trv-num">{formatNumber(table.idx_scan, locale)}</DataTableTd>
                  <DataTableTd className="trv-muted">{formatDateTime(table.last_vacuum_at, locale)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  );
}

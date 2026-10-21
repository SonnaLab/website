import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService, type InfraDatabase } from '@/services/api';
import { Card } from '@/components/ui/card';
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { Row } from './OverviewTab';
import { formatBytes, formatDateTime, formatNumber } from './format';

/** The PostgreSQL server, then every table by size. */
export function DatabaseTab() {
  const { t, i18n } = useTranslation('admin');
  const [db, setDb] = useState<InfraDatabase | null>(null);
  const [error, setError] = useState(false);
  const locale = i18n.language;

  useEffect(() => { apiService.adminInfraDatabase().then(setDb).catch(() => setError(true)); }, []);

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

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('infrastructure.db.table')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('infrastructure.db.rows')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('infrastructure.db.size')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('infrastructure.db.seqScans')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('infrastructure.db.idxScans')}</DataTableTh>
              <DataTableTh>{t('infrastructure.db.vacuum')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {db.tables.map((table) => (
              <DataTableRow key={table.name}>
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
  );
}

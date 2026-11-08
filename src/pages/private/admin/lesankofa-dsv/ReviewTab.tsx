import { useCallback, useEffect, useMemo, useState } from 'react';

import { BaseTab } from '@/components/common/BaseTab';
import {
  DataTablePagination, usePagination,
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableTd,
  DataTableTh, DataTableToolbar, filterRows,
} from '@/components/common/DataTable';
import { dsv, dsvErrorMessage, type DraftStatus, type DraftSummary } from '@/services/dsv';
import { ClipboardListIcon, EyeIcon, RefreshCwIcon } from '@icons';

import { DraftModal } from './DraftModal';
import { DRAFT_STATUS, StatusTag, fmtDate, langLabel } from './shared';

const FILTERS: Array<{ value: string; label: string; statuses: DraftStatus[] }> = [
  { value: 'todo',      label: 'À traiter (à valider, en échec, à publier)', statuses: ['in_review', 'quality_failed', 'approved'] },
  { value: 'in_review', label: 'À valider',            statuses: ['in_review'] },
  { value: 'failed',    label: 'Qualité en échec',     statuses: ['quality_failed'] },
  { value: 'approved',  label: 'Validés, à publier',   statuses: ['approved'] },
  { value: 'published', label: 'Publiés',              statuses: ['published'] },
  { value: 'rejected',  label: 'Refusés',              statuses: ['rejected'] },
  { value: 'all',       label: 'Tous',                 statuses: ['generated', 'in_review', 'quality_failed', 'approved', 'published', 'rejected'] },
];

// L'ordre de traitement : ce qui attend le proprietaire d'abord.
const STATUS_ORDER: Record<string, number> = { in_review: 0, approved: 1, quality_failed: 2, generated: 3, published: 4, rejected: 5 };

export function ReviewTab({ clientId, clientName, onChanged }: {
  clientId: string;
  clientName?: string;
  /** Un brouillon a change de statut (validation, refus, publication...). */
  onChanged?: () => void;
}) {
  const [filter, setFilter] = useState('todo');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const statuses = (FILTERS.find((f) => f.value === filter) ?? FILTERS[0]).statuses;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.reviewQueue(clientId, statuses)
      .then(setRows)
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, statuses]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => filterRows(rows, q, (d) => [d.title, d.slug, d.id, d.language])
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.id - b.id),
    [rows, q],
  );
  const pager = usePagination(visible, q);

  return (
    <div className="space-y-4">
      <DataTableToolbar
        right={(
          <>
            <select className="adm-select adm-select--sm" aria-label="Statut" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load}>
              <RefreshCwIcon size={13} /> Rafraîchir
            </button>
          </>
        )}
      >
        <DataTableSearch value={q} onChange={setQ} placeholder="Titre, slug ou n°" />
      </DataTableToolbar>

      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>N°</DataTableTh>
              <DataTableTh>Titre</DataTableTh>
              <DataTableTh>Langue</DataTableTh>
              <DataTableTh>Tentative</DataTableTh>
              <DataTableTh>Statut</DataTableTh>
              <DataTableTh>Rédigé le</DataTableTh>
              <DataTableTh>Action</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {visible.length === 0 && (
              <DataTableEmpty
                icon={<ClipboardListIcon size={28} />}
                label={q ? `Aucun brouillon pour « ${q} ».` : 'Aucun brouillon dans cette file.'}
                hint="Le moteur ne rédige que pour les clients dont la rédaction DSV est activée, dans la limite de la capacité de validation."
              />
            )}
            {pager.pageRows.map((d) => (
              <DataTableRow key={d.id} onClick={() => setOpenId(d.id)}>
                <DataTableTd><span className="adm-table__id-cell">#{d.id}</span></DataTableTd>
                <DataTableTd>
                  <div className="font-medium text-foreground">{d.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{d.slug}</div>
                </DataTableTd>
                <DataTableTd>{langLabel(d.language)}</DataTableTd>
                <DataTableTd>{d.attempt}</DataTableTd>
                <DataTableTd><StatusTag map={DRAFT_STATUS} value={d.status} /></DataTableTd>
                <DataTableTd>{fmtDate(d.created_at)}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={EyeIcon} label="Ouvrir" onClick={() => setOpenId(d.id)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <DataTablePagination {...pager} />
      </BaseTab>

      {openId !== null && (
        <DraftModal draftId={openId} clientName={clientName} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged?.(); }} />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  DataTablePagination, usePagination,
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch,
  DataTableTd, DataTableTh, DataTableToolbar, filterRows,
} from '@/components/common/DataTable';
import { EyeIcon, ServerIcon } from '@icons';

/** A Docker container of the VPS, read through the host socket by ai.sonnalab.com. */
interface ContainerRow {
  id: string;
  name: string;
  image: string;
  status: string; // « Up 3 days (healthy) »
  state: string;  // running | exited | restarting | paused…
  created: number | null;
}

/** « lesankofa-v1-worker » → « lesankofa ». */
const projectOf = (name: string) => name.split(/[-_]/)[0] || name;

const stateVariant = (state: string) => (state === 'running' ? 'success' : state === 'restarting' || state === 'paused' ? 'warning' : 'danger');

/** Every container running on the server (all projects), with its logs. */
export function ContainersTab({ reloadKey = 0 }: { reloadKey?: number }) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [containers, setContainers] = useState<ContainerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [logTarget, setLogTarget] = useState<ContainerRow | null>(null);

  useEffect(() => {
    apiService.adminLesankofaContainers()
      .then((d: { containers?: ContainerRow[]; error?: string }) => {
        setContainers(d.containers ?? []);
        setError(d.error ?? null);
      })
      .catch((e: Error) => { setContainers([]); setError(e.message); });
  }, [reloadKey]);

  const rows = filterRows(containers ?? [], query, (c) => [c.name, projectOf(c.name), c.image, c.state, c.status]);
  const pager = usePagination(rows, query);

  return (
    <div className="infra-stack">
      <DataTableToolbar>
        <DataTableSearch value={query} onChange={setQuery} />
      </DataTableToolbar>
      {error && <p className="infra-sub infra-sub--warn">{error}</p>}

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('infrastructure.containers.name')}</DataTableTh>
              <DataTableTh>{t('infrastructure.containers.project')}</DataTableTh>
              <DataTableTh>{t('infrastructure.containers.state')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {containers === null && <DataTableEmpty label={t('common.loading')} />}
            {containers !== null && rows.length === 0 && (
              <DataTableEmpty icon={<ServerIcon size={28} />} label={query ? tc('table.noResults', { query }) : t('infrastructure.containers.empty')} />
            )}
            {pager.pageRows.map((c) => (
              <DataTableRow key={c.id}>
                <DataTableTd>
                  <span className="trv-client-cell__name">{c.name}</span>
                  <span className="infra-sub infra-mono">{c.image}</span>
                </DataTableTd>
                <DataTableTd>{projectOf(c.name)}</DataTableTd>
                <DataTableTd>
                  <StatusBadge label={c.state} variant={stateVariant(c.state)} />
                  <span className="infra-sub">{c.status}</span>
                </DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={EyeIcon} label={t('infrastructure.containers.logs')} onClick={() => setLogTarget(c)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
      <DataTablePagination {...pager} />

      {logTarget && <ContainerLogs container={logTarget} onClose={() => setLogTarget(null)} />}
    </div>
  );
}

function ContainerLogs({ container, onClose }: { container: ContainerRow; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaContainerLogs(container.name, 150)
      .then((d: { lines?: string[]; error?: string }) => {
        setLines(d.lines ?? []);
        if (d.error) setError(d.error);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [container.name]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  return (
    <Modal open onClose={onClose} title={container.name} subtitle={`${container.image} · ${container.status}`} size="lg">
      <div className="rounded-lg bg-zinc-950 text-zinc-200 font-mono text-xs p-4 h-72 overflow-y-auto overflow-x-hidden">
        {loading && <p className="text-zinc-400 animate-pulse">{t('common.loading')}</p>}
        {error && <p className="text-red-400">[ERROR] {error}</p>}
        {!loading && lines.length === 0 && !error && <p className="text-zinc-500">{t('infrastructure.containers.noLogs')}</p>}
        <div className="space-y-0.5">
          {lines.map((l, i) => <div key={i} className="break-all whitespace-pre-wrap">{l}</div>)}
          <div ref={endRef} />
        </div>
      </div>
    </Modal>
  );
}

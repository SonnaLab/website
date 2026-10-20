import { useEffect, useState } from 'react';

import { apiService } from '@/services/api';
import type { TravauxClientStats } from '@/types/travaux';

export interface TravauxTotals {
  clients: number;
  projects: number;
  inProgress: number;
  invoicedCents: number;
  paidCents: number;
}

/** Totals over every client (the API's per-client stats, summed). `key` refetches. */
export function useTravauxTotals(key?: unknown): TravauxTotals | null {
  const [totals, setTotals] = useState<TravauxTotals | null>(null);
  useEffect(() => {
    let alive = true;
    apiService.adminTravauxClients({ page: 1, per_page: 100 })
      .then(({ clients, meta }) => {
        if (!alive) return;
        const sum = (pick: (s: TravauxClientStats) => number) =>
          clients.reduce((total, c) => total + (c.stats ? pick(c.stats) : 0), 0);
        setTotals({
          clients: meta.total,
          projects: sum((s) => s.projects_count),
          inProgress: sum((s) => s.objectives_in_progress),
          invoicedCents: sum((s) => s.invoiced_cents),
          paidCents: sum((s) => s.paid_cents),
        });
      })
      .catch(() => { if (alive) setTotals(null); });
    return () => { alive = false; };
  }, [key]);
  return totals;
}

import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type {
  TravauxClient,
  TravauxContract,
  TravauxInvoice,
  TravauxObjective,
  TravauxPayment,
  TravauxTask,
} from '@/types/travaux';

export interface TravauxProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  description?: string | null;
}

export type TravauxResource = 'client' | 'issuer' | 'projects' | 'objectives' | 'tasks' | 'invoices' | 'contracts' | 'payments';

export interface TravauxData {
  client: TravauxClient | null;
  issuer: TravauxClient | null;
  projects: TravauxProject[];
  objectives: TravauxObjective[];
  tasks: TravauxTask[];
  invoices: TravauxInvoice[];
  contracts: TravauxContract[];
  payments: TravauxPayment[];
}

const EMPTY: TravauxData = {
  client: null, issuer: null, projects: [], objectives: [], tasks: [], invoices: [], contracts: [], payments: [],
};

const ALL: TravauxResource[] = ['client', 'issuer', 'projects', 'objectives', 'tasks', 'invoices', 'contracts', 'payments'];

/**
 * Toutes les données Travaux d'un client, chargées une fois et rechargées
 * par ressource après chaque écriture (équivalent du cache react-query
 * d'elancevae, que SonnaLab n'utilise pas). Les listes d'un client sont
 * petites : l'API les renvoie entières, sans pagination.
 */
export function useTravauxData(clientId: string | undefined) {
  const [data, setData] = useState<TravauxData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async (resources: TravauxResource[] = ALL) => {
    if (!clientId) return;
    const fetchers: Record<TravauxResource, () => Promise<Partial<TravauxData>>> = {
      client:     async () => ({ client: (await apiService.adminTravauxClient(clientId)).client }),
      issuer:     async () => ({ issuer: (await apiService.adminTravauxIssuer()).issuer }),
      projects:   async () => ({ projects: (await apiService.adminTravauxProjects(clientId)).projects }),
      objectives: async () => ({ objectives: (await apiService.adminTravauxObjectives(clientId)).objectives }),
      tasks:      async () => ({ tasks: (await apiService.adminTravauxTasks(clientId)).tasks }),
      invoices:   async () => ({ invoices: (await apiService.adminTravauxInvoices(clientId)).invoices }),
      contracts:  async () => ({ contracts: (await apiService.adminTravauxContracts(clientId)).contracts }),
      payments:   async () => ({ payments: (await apiService.adminTravauxPayments(clientId)).payments }),
    };
    const parts = await Promise.all(resources.map((r) => fetchers[r]()));
    setData((prev) => Object.assign({}, prev, ...parts));
  }, [clientId]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    reload()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [reload]);

  return { ...data, loading, error, reload };
}

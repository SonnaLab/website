import type { TravauxTask } from '@/types/travaux';

/*
 * Copie d'elancevae (frontend/src/lib/devisCalc.ts). Doit rester numériquement
 * identique à app/services/travaux/pricing.rb côté API : l'aperçu React et le
 * PDF serveur affichent le même découpage jours/prix.
 */

export interface TaskAllocation {
  task: TravauxTask;
  days: number;
  price: number;
  /** Score 0 : phase offerte, au devis sans jours ni prix. */
  offered: boolean;
}

export interface DevisCalculation {
  allocations: TaskAllocation[];
  remainingDays: number;
  totalPrice: number;
}

/** Jours calendaires de demain jusqu'à l'échéance incluse. */
export function remainingDaysUntil(dueDate: string, from: Date = new Date()): number {
  const tomorrow = new Date(from);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffMs = due.getTime() - tomorrow.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 0);
}

/**
 * Répartit le temps restant jusqu'à l'échéance entre les tâches d'un livrable,
 * au prorata de leur score d'effort (0-5), puis valorise chaque part au TJM.
 * Un score de 0 = phase offerte : listée, sans jours ni prix.
 * `issuedOn` (aaaa-mm-jj) : un document déjà émis se calcule depuis sa date
 * d'émission, pas depuis aujourd'hui — sinon ses phases changeraient, puis
 * disparaîtraient une fois l'échéance passée. Sans date : aujourd'hui.
 */
export function calculateDevis(
  tasks: TravauxTask[],
  dueDate: string | null,
  dailyRate: number | null,
  issuedOn?: string | null,
): DevisCalculation {
  const scoredTasks = tasks.filter((t) => t.score != null && !Number.isNaN(Number(t.score)));
  const totalScore = scoredTasks.reduce((sum, t) => sum + Number(t.score), 0);
  const from = issuedOn ? new Date(`${issuedOn}T00:00:00`) : new Date();
  const remainingDays = dueDate ? remainingDaysUntil(dueDate, from) : 0;
  const rate = Number(dailyRate ?? 0);

  if (!scoredTasks.length || !remainingDays) {
    return { allocations: [], remainingDays, totalPrice: 0 };
  }

  const allocations = scoredTasks.map((task) => {
    if (Number(task.score) === 0) return { task, days: 0, price: 0, offered: true };
    const days = Math.round((remainingDays * Number(task.score) / totalScore) * 10) / 10;
    return { task, days, price: Math.round(days * rate), offered: false };
  });

  return { allocations, remainingDays, totalPrice: allocations.reduce((sum, a) => sum + a.price, 0) };
}

/** Compte à rebours « J-17 », ou « J+3 » une fois l'échéance dépassée. */
export function dueDateCountdown(dueDate: string, from: Date = new Date()): string {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return days >= 0 ? `J-${days}` : `J+${Math.abs(days)}`;
}

/** « 2,6 » : virgule décimale, comme sur le PDF. */
export function formatDays(days: number): string {
  return days.toFixed(1).replace('.', ',');
}

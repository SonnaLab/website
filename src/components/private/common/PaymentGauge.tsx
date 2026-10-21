import { useTranslation } from 'react-i18next';

import type { InvoiceStatus } from '@/types/travaux';

const formatEuros = (cents: number) =>
  `${Math.round(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;

/**
 * An invoice's payment status: « Payée » (solid green) once fully paid,
 * « Impayée » (red) while nothing is, and a gauge filled to the share paid
 * after a deposit. Drafts and cancelled invoices keep their plain status.
 * Back office (Factures tab) and the member's billing page.
 */
export function PaymentGauge({ status, amountCents, paidCents }: { status: InvoiceStatus; amountCents: number; paidCents: number }) {
  const { t } = useTranslation('admin');
  if (status === 'draft' || status === 'cancelled') {
    return <span className="trv-pay trv-pay--muted">{t(`travaux.invoices.statuses.${status}`)}</span>;
  }
  const ratio = amountCents > 0 ? Math.min(paidCents / amountCents, 1) : 1;
  const detail = t('travaux.invoices.payment.detail', { paid: formatEuros(paidCents), total: formatEuros(amountCents) });
  if (ratio >= 1) return <span className="trv-pay trv-pay--paid" title={detail}>{t('travaux.invoices.payment.paid')}</span>;
  if (ratio <= 0) return <span className="trv-pay trv-pay--unpaid" title={detail}>{t('travaux.invoices.payment.unpaid')}</span>;
  const percent = Math.round(ratio * 100);
  return (
    <span className="trv-pay trv-pay--partial" title={detail} role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span className="trv-pay__fill" style={{ width: `${percent}%` }} />
      <span className="trv-pay__label">{t('travaux.invoices.payment.deposit')} · {percent} %</span>
    </span>
  );
}

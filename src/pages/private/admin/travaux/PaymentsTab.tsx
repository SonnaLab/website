import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  DataTable,
  DataTableBody,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/common/DataTable';
import { apiService } from '@/services/api';
import { Trash2Icon, WalletIcon } from '@icons';
import type { PaymentMethod, PaymentStatus, TravauxInvoice, TravauxPayment } from '@/types/travaux';
import type { TravauxResource } from './useTravauxData';
import type { TravauxTabHandle } from './tabHandle';
import { apiErrorMessage, formatCents, formatDate } from './format';
import { useConfirmDelete } from './useConfirmDelete';

const METHODS: PaymentMethod[] = ['transfer', 'card', 'check', 'other'];
const STATUSES: PaymentStatus[] = ['pending', 'completed', 'failed'];
const STATUS_VARIANT: Record<PaymentStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning', completed: 'success', failed: 'danger',
};

interface PaymentsTabProps {
  clientId: string;
  payments: TravauxPayment[];
  invoices: TravauxInvoice[];
  reload: (resources?: TravauxResource[]) => Promise<void>;
}

export const PaymentsTab = forwardRef<TravauxTabHandle, PaymentsTabProps>(function PaymentsTab(
  { clientId, payments, invoices, reload },
  ref,
) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const [newOpen, setNewOpen] = useState(false);
  useImperativeHandle(ref, () => ({ openNew: () => setNewOpen(true) }));

  async function remove(p: TravauxPayment) {
    if (!(await confirmDelete())) return;
    try {
      await apiService.adminTravauxDeletePayment(p.id);
      await reload(['payments', 'client']);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  return (
    <div className="adm-form">
      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('travaux.payments.amount')}</DataTableTh>
              <DataTableTh>{t('travaux.payments.invoice')}</DataTableTh>
              <DataTableTh>{t('travaux.payments.method')}</DataTableTh>
              <DataTableTh>{t('travaux.payments.paidAt')}</DataTableTh>
              <DataTableTh>{t('travaux.common.status')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {payments.length === 0 && <DataTableEmpty icon={<WalletIcon size={28} />} label={t('travaux.payments.empty')} />}
            {payments.map((p) => (
              <DataTableRow key={p.id}>
                <DataTableTd className="trv-num"><span className="trv-client-cell__name">{formatCents(p.amount_cents)}</span></DataTableTd>
                <DataTableTd>
                  {p.invoice_number ? <><span className="trv-num">{p.invoice_number}</span> <span className="trv-muted">{p.invoice_title}</span></> : '—'}
                </DataTableTd>
                <DataTableTd>{t(`travaux.payments.methods.${p.payment_method}`)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDate(p.paid_on)}</DataTableTd>
                <DataTableTd><StatusBadge label={t(`travaux.payments.statuses.${p.status}`)} variant={STATUS_VARIANT[p.status]} /></DataTableTd>
                <DataTableTd>
                  <button type="button" className="adm-btn adm-btn--danger adm-btn--xs" title={t('common.delete')} onClick={() => remove(p)}>
                    <Trash2Icon size={13} />
                  </button>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>

      <NewPaymentModal
        open={newOpen}
        clientId={clientId}
        invoices={invoices}
        payments={payments}
        onClose={() => setNewOpen(false)}
        onCreated={async () => { await reload(['payments', 'client']); setNewOpen(false); }}
      />
    </div>
  );
});

function NewPaymentModal({
  open, clientId, invoices, payments, onClose, onCreated,
}: {
  open: boolean;
  clientId: string;
  invoices: TravauxInvoice[];
  payments: TravauxPayment[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [paidOn, setPaidOn] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  // A payment settles an invoice (itself generated from a quote).
  const payable = invoices.filter((i) => i.kind === 'invoice' && i.status !== 'cancelled');
  const remainingCents = (invoice: TravauxInvoice) => invoice.amount_cents - payments
    .filter((p) => p.invoice_id === invoice.id && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount_cents, 0);

  useEffect(() => {
    if (!open) return;
    setAmount(''); setMethod('transfer'); setStatus('pending'); setPaidOn(''); setInvoiceId(''); setNotes('');
  }, [open]);

  function pickInvoice(id: string) {
    setInvoiceId(id);
    // Pre-fill what's left to pay on it.
    const invoice = payable.find((i) => i.id === id);
    if (invoice && !amount) setAmount(String(Math.max(remainingCents(invoice), 0) / 100));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.adminTravauxCreatePayment({
        client_id: clientId,
        amount_cents: Math.round(Number(amount) * 100),
        payment_method: method,
        status,
        paid_on: paidOn || null,
        invoice_id: invoiceId,
        notes,
      });
      await onCreated();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('travaux.payments.new')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-new-payment" className="adm-btn adm-btn--primary" disabled={saving || payable.length === 0}>{t('common.create')}</button>
        </>
      }
    >
      <form id="trv-new-payment" className="adm-form" onSubmit={submit}>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-pay-amount">{t('travaux.payments.amount')} *</label>
            <div className="trv-input-suffix">
              <input id="trv-pay-amount" type="number" step="0.01" min="0.01" required className="adm-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>€</span>
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-pay-method">{t('travaux.payments.method')}</label>
            <select id="trv-pay-method" className="adm-select" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => <option key={m} value={m}>{t(`travaux.payments.methods.${m}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-pay-invoice">{t('travaux.payments.invoice')} *</label>
          <select id="trv-pay-invoice" className="adm-select" required value={invoiceId} onChange={(e) => pickInvoice(e.target.value)}>
            <option value="">{t('travaux.payments.chooseInvoice')}</option>
            {payable.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.number} — {inv.title} ({formatCents(remainingCents(inv))})
              </option>
            ))}
          </select>
          {payable.length === 0 && <p className="trv-info">{t('travaux.payments.noInvoice')}</p>}
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-pay-status">{t('travaux.common.status')}</label>
            <select id="trv-pay-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`travaux.payments.statuses.${s}`)}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-pay-date">{t('travaux.payments.paidAt')}</label>
            <input id="trv-pay-date" type="date" className="adm-input" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-pay-notes">{t('travaux.payments.notes')}</label>
          <textarea id="trv-pay-notes" className="adm-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

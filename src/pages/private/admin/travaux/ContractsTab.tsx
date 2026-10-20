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
import { apiAssetUrl, apiService } from '@/services/api';
import { EyeIcon, FileSignatureIcon, PaperclipIcon, Trash2Icon } from '@icons';
import type { ContractStatus, TravauxContract } from '@/types/travaux';
import type { TravauxResource } from './useTravauxData';
import type { TravauxTabHandle } from './tabHandle';
import { FileDropzone } from './FileDropzone';
import { apiErrorMessage, formatCents, formatDate } from './format';
import { useConfirmDelete } from './useConfirmDelete';

const STATUSES: ContractStatus[] = ['draft', 'active', 'expired', 'terminated'];
const STATUS_VARIANT: Record<ContractStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'default', active: 'success', expired: 'warning', terminated: 'danger',
};

interface ContractsTabProps {
  clientId: string;
  contracts: TravauxContract[];
  reload: (resources?: TravauxResource[]) => Promise<void>;
}

export const ContractsTab = forwardRef<TravauxTabHandle, ContractsTabProps>(function ContractsTab(
  { clientId, contracts, reload },
  ref,
) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const [newOpen, setNewOpen] = useState(false);
  const [preview, setPreview] = useState<TravauxContract | null>(null);
  useImperativeHandle(ref, () => ({ openNew: () => setNewOpen(true) }));

  async function remove(c: TravauxContract) {
    if (!(await confirmDelete())) return;
    try {
      await apiService.adminTravauxDeleteContract(c.id);
      await reload(['contracts']);
      setPreview(null);
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
              <DataTableTh>{t('travaux.common.title')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.amount')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.startDate')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.endDate')}</DataTableTh>
              <DataTableTh>{t('travaux.common.status')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.file')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {contracts.length === 0 && <DataTableEmpty icon={<FileSignatureIcon size={28} />} label={t('travaux.contracts.empty')} />}
            {contracts.map((c) => (
              <DataTableRow key={c.id} onClick={() => setPreview(c)}>
                <DataTableTd><span className="trv-client-cell__name">{c.title}</span></DataTableTd>
                <DataTableTd className="trv-num">{formatCents(c.amount_cents)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDate(c.starts_on)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDate(c.ends_on)}</DataTableTd>
                <DataTableTd><StatusBadge label={t(`travaux.contracts.statuses.${c.status}`)} variant={STATUS_VARIANT[c.status]} /></DataTableTd>
                <DataTableTd>
                  {c.file_path ? (
                    <a className="trv-link" href={apiAssetUrl(c.file_path) ?? undefined} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={c.file_name ?? ''}>
                      <PaperclipIcon size={13} />
                    </a>
                  ) : '—'}
                </DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.common.view')} onClick={() => setPreview(c)}>
                      <EyeIcon size={13} />
                    </button>
                    <button type="button" className="adm-btn adm-btn--danger adm-btn--xs" title={t('common.delete')} onClick={() => remove(c)}>
                      <Trash2Icon size={13} />
                    </button>
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>

      <NewContractModal
        open={newOpen}
        clientId={clientId}
        onClose={() => setNewOpen(false)}
        onCreated={async () => { await reload(['contracts']); setNewOpen(false); }}
      />

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        subtitle={preview && <StatusBadge label={t(`travaux.contracts.statuses.${preview.status}`)} variant={STATUS_VARIANT[preview.status]} />}
        size="md"
        footer={preview && (
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => remove(preview)}>{t('common.delete')}</button>
        )}
      >
        {preview && (
          <dl className="trk-modal-dl">
            <dt>{t('travaux.contracts.amount')}</dt><dd className="trv-num">{formatCents(preview.amount_cents)}</dd>
            <dt>{t('travaux.contracts.startDate')}</dt><dd>{formatDate(preview.starts_on)}</dd>
            <dt>{t('travaux.contracts.endDate')}</dt><dd>{formatDate(preview.ends_on)}</dd>
            <dt>{t('travaux.contracts.notes')}</dt><dd>{preview.notes || '—'}</dd>
            <dt>{t('travaux.contracts.file')}</dt>
            <dd>
              {preview.file_path ? (
                <a className="trv-link" href={apiAssetUrl(preview.file_path) ?? undefined} target="_blank" rel="noreferrer">
                  <PaperclipIcon size={13} /> {preview.file_name}
                </a>
              ) : '—'}
            </dd>
          </dl>
        )}
      </Modal>
    </div>
  );
});

function NewContractModal({
  open, clientId, onClose, onCreated,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [status, setStatus] = useState<ContractStatus>('draft');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(''); setAmount(''); setStartsOn(''); setEndsOn(''); setStatus('draft'); setNotes(''); setFile(null);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.adminTravauxCreateContract({
        client_id: clientId,
        title,
        amount_cents: amount ? Math.round(Number(amount) * 100) : null,
        starts_on: startsOn || null,
        ends_on: endsOn || null,
        status,
        notes,
        file: file ?? undefined,
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
      title={t('travaux.contracts.new')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-new-contract" className="adm-btn adm-btn--primary" disabled={saving}>{t('common.create')}</button>
        </>
      }
    >
      <form id="trv-new-contract" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-contract-title">{t('travaux.common.title')} *</label>
          <input id="trv-contract-title" className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-contract-amount">{t('travaux.contracts.amount')}</label>
            <div className="trv-input-suffix">
              <input id="trv-contract-amount" type="number" step="0.01" className="adm-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>€</span>
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-contract-status">{t('travaux.common.status')}</label>
            <select id="trv-contract-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`travaux.contracts.statuses.${s}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-contract-start">{t('travaux.contracts.startDate')}</label>
            <input id="trv-contract-start" type="date" className="adm-input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-contract-end">{t('travaux.contracts.endDate')}</label>
            <input id="trv-contract-end" type="date" className="adm-input" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-contract-notes">{t('travaux.contracts.notes')}</label>
          <textarea id="trv-contract-notes" className="adm-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <span className="adm-form__label">{t('travaux.contracts.file')}</span>
          <FileDropzone file={file} onChange={setFile} />
        </div>
      </form>
    </Modal>
  );
}

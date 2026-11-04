import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { apiService, saveBlob } from '@/services/api';
import { DownloadIcon } from '@icons';
import type { ContractStatus, TravauxContract } from '@/types/travaux';
import { apiErrorMessage } from './format';

const STATUSES: ContractStatus[] = ['draft', 'active', 'expired', 'terminated'];
/** Comme Travaux::ContractBody::TO_COMPLETE côté API. */
const TO_COMPLETE = /\[À [^\]]+\]/g;

/** Un contrat généré : ses conditions et son texte, modifiables, puis son PDF. */
export function ContractEditorModal({ contract, onClose, onSaved }: { contract: TravauxContract | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { t } = useTranslation('admin');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [status, setStatus] = useState<ContractStatus>('draft');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contract) return;
    setTitle(contract.title);
    setAmount(contract.amount_cents != null ? String(contract.amount_cents / 100) : '');
    setStartsOn(contract.starts_on ?? '');
    setEndsOn(contract.ends_on ?? '');
    setStatus(contract.status);
    setBody(contract.body ?? '');
  }, [contract]);

  const left = body.match(TO_COMPLETE) ?? [];
  // Le texte est une copie figée à la génération : changer ces champs ne le met pas à jour.
  const termsChanged = !!contract?.body && (
    (amount ? Math.round(Number(amount) * 100) : null) !== contract.amount_cents
    || (startsOn || null) !== contract.starts_on
    || (endsOn || null) !== contract.ends_on
  );

  async function persist() {
    await apiService.adminTravauxUpdateContract(contract!.id, {
      title,
      amount_cents: amount ? Math.round(Number(amount) * 100) : null,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      status,
      body,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await persist();
      toast.success(t('travaux.contracts.saved'));
      await onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  // Le PDF reflète ce qui est à l'écran : enregistré d'abord.
  async function download() {
    setSaving(true);
    try {
      await persist();
      const { blob, filename } = await apiService.adminTravauxDownloadContractPdf(contract!.id);
      saveBlob(blob, filename);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!contract}
      onClose={onClose}
      title={title || t('travaux.contracts.new')}
      size="xl"
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={saving || !body.trim()} onClick={download}>
            <DownloadIcon size={13} /> {t('travaux.contracts.pdf')}
          </button>
          <button type="submit" form="trv-contract-editor" className="adm-btn adm-btn--primary" disabled={saving}>{t('common.save')}</button>
        </>
      }
    >
      <form id="trv-contract-editor" className="adm-form" onSubmit={save}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-editor-title">{t('travaux.common.title')} *</label>
          <input id="trv-editor-title" className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-editor-amount">{t('travaux.contracts.amount')}</label>
            <div className="trv-input-suffix">
              <input id="trv-editor-amount" type="number" step="0.01" className="adm-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>€</span>
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-editor-status">{t('travaux.common.status')}</label>
            <select id="trv-editor-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`travaux.contracts.statuses.${s}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-editor-start">{t('travaux.contracts.startDate')}</label>
            <input id="trv-editor-start" type="date" className="adm-input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-editor-end">{t('travaux.contracts.endDate')}</label>
            <input id="trv-editor-end" type="date" className="adm-input" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-editor-body">{t('travaux.contracts.text')}</label>
          {left.length > 0 && <p className="trv-info">{t('travaux.contracts.toComplete', { count: left.length })}</p>}
          {termsChanged && <p className="trv-info">{t('travaux.contracts.termsChanged')}</p>}
          <textarea id="trv-editor-body" className="adm-textarea trv-contract-text" value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="trv-hint">{t('travaux.contracts.textHint')}</p>
        </div>
      </form>
    </Modal>
  );
}

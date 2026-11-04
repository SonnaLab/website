import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { apiService } from '@/services/api';
import { CopyIcon, PenLineIcon, PlusIcon, Trash2Icon } from '@icons';
import type { TravauxContractTemplate } from '@/types/travaux';
import { apiErrorMessage } from './format';
import { useConfirmDelete } from './useConfirmDelete';

/** Les variables remplies à la génération (Travaux::ContractBody côté API). */
const VARIABLES = [
  'prestataire_identite', 'prestataire_nom', 'client_identite', 'client_nom', 'client_email', 'projets',
  'titre', 'montant', 'montant_trimestre', 'date_debut', 'date_fin', 'date_du_jour',
];

type Draft = { id: string | null; name: string; body: string };

/** Les modèles de contrat, communs à tous les clients : la liste, puis leur texte. */
export function ContractTemplatesModal({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const [templates, setTemplates] = useState<TravauxContractTemplate[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setTemplates((await apiService.adminTravauxContractTemplates()).templates);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  useEffect(() => {
    if (!open) return;
    setDraft(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const payload = { name: draft.name, body: draft.body };
      if (draft.id) await apiService.adminTravauxUpdateContractTemplate(draft.id, payload);
      else await apiService.adminTravauxCreateContractTemplate(payload);
      toast.success(t('travaux.contracts.templateSaved'));
      setDraft(null);
      await load();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function remove(template: TravauxContractTemplate) {
    if (!(await confirmDelete())) return;
    try {
      await apiService.adminTravauxDeleteContractTemplate(template.id);
      await load();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('travaux.contracts.templates')}
      size="xl"
      footer={draft ? (
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setDraft(null)}>{t('common.cancel')}</button>
          <button type="submit" form="trv-contract-template" className="adm-btn adm-btn--primary" disabled={saving}>{t('common.save')}</button>
        </>
      ) : (
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setDraft({ id: null, name: '', body: '' })}>
          <PlusIcon size={13} /> {t('travaux.contracts.newTemplate')}
        </button>
      )}
    >
      {draft ? (
        <form id="trv-contract-template" className="adm-form" onSubmit={save}>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-template-name">{t('travaux.contracts.templateName')} *</label>
            <input id="trv-template-name" className="adm-input" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-template-body">{t('travaux.contracts.text')} *</label>
            <textarea id="trv-template-body" className="adm-textarea trv-contract-text" required value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <p className="trv-hint">{t('travaux.contracts.textHint')}</p>
          </div>
          <div className="adm-form__field">
            <span className="adm-form__label">{t('travaux.contracts.variables')}</span>
            <p className="trv-contract-variables">
              {VARIABLES.map((name) => <code key={name}>{`{{${name}}}`}</code>)}
            </p>
          </div>
        </form>
      ) : templates.length === 0 ? (
        <p className="trv-info">{t('travaux.contracts.emptyTemplates')}</p>
      ) : (
        <ul className="trv-contract-templates">
          {templates.map((template) => (
            <li key={template.id}>
              <span className="trv-client-cell__name">{template.name}</span>
              <span className="adm-table__actions">
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setDraft({ id: template.id, name: template.name, body: template.body })}>
                  <PenLineIcon size={13} /> {t('common.edit')}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setDraft({ id: null, name: `${template.name} (2)`, body: template.body })}>
                  <CopyIcon size={13} /> {t('travaux.contracts.duplicate')}
                </button>
                <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" aria-label={t('common.delete')} onClick={() => remove(template)}>
                  <Trash2Icon size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

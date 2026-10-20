import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { apiService } from '@/services/api';
import type { TravauxClient } from '@/types/travaux';
import { apiErrorMessage } from './format';

/**
 * « Nouveau chantier » : a project for one of the clients (companies are
 * created in Gestion des utilisateurs › Clients). Its deliverables, tasks,
 * quotes and invoices then live under that client's Travaux.
 */
export function NewChantierModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}) {
  const { t } = useTranslation('admin');
  const [clients, setClients] = useState<TravauxClient[] | null>(null);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(''); setName(''); setDescription('');
    apiService.adminTravauxClients({ page: 1, per_page: 100 })
      .then((res) => setClients(res.clients))
      .catch(() => setClients([]));
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.adminTravauxCreateProject({ client_id: clientId, name, description });
      toast.success(t('travaux.chantier.created'));
      onCreated(clientId);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  const empty = clients !== null && clients.length === 0;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('travaux.chantier.title')}
      subtitle={t('travaux.chantier.hint')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-chantier-form" className="adm-btn adm-btn--primary" disabled={saving || empty}>
            {t('common.create')}
          </button>
        </>
      }
    >
      {empty ? (
        <div className="trv-chantier-empty">
          <p className="trv-info">{t('travaux.chantier.noClients')}</p>
          <Link className="adm-btn adm-btn--ghost" to="/admin/users?tab=clients" onClick={onClose}>
            {t('travaux.chantier.createClient')}
          </Link>
        </div>
      ) : (
        <form id="trv-chantier-form" className="adm-form" onSubmit={submit}>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-chantier-client">{t('travaux.chantier.client')} *</label>
            <select id="trv-chantier-client" className="adm-select" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">{clients === null ? t('common.loading') : t('travaux.chantier.choose')}</option>
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-chantier-name">{t('travaux.projects.name')} *</label>
            <input id="trv-chantier-name" className="adm-input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-chantier-desc">{t('travaux.common.description')}</label>
            <textarea id="trv-chantier-desc" className="adm-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </form>
      )}
    </Modal>
  );
}

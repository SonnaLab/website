import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import {
  DataTable,
  DataTableAction,
  DataTableBody,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableSearch,
  DataTableSelectionBar,
  DataTableSelectTh,
  DataTableTd,
  DataTableTh,
  DataTableToolbar,
  exportRowsCsv,
  filterRows,
  useRowSelection,
} from '@/components/common/DataTable';
import { apiAssetUrl, apiService, saveBlob } from '@/services/api';
import { DownloadIcon, EyeIcon, FileSignatureIcon, FileTextIcon, PaperclipIcon, PenLineIcon, Trash2Icon } from '@icons';
import type { ContractStatus, TravauxContract, TravauxContractTemplate } from '@/types/travaux';
import type { TravauxResource } from './useTravauxData';
import type { TravauxTabHandle } from './tabHandle';
import { ContractEditorModal } from './ContractEditorModal';
import { ContractTemplatesModal } from './ContractTemplatesModal';
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
  const { t: tc } = useTranslation('common');
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const [newOpen, setNewOpen] = useState(false);
  const [preview, setPreview] = useState<TravauxContract | null>(null);
  const [editing, setEditing] = useState<TravauxContract | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<TravauxContractTemplate[]>([]);
  const [q, setQ] = useState('');
  useImperativeHandle(ref, () => ({ openNew: () => setNewOpen(true) }));

  const rows = useMemo(() => filterRows(contracts, q, (c) => [
    c.title, c.notes, c.file_name, formatDate(c.starts_on), formatDate(c.ends_on), t(`travaux.contracts.statuses.${c.status}`),
  ]), [contracts, q, t]);
  const selection = useRowSelection(rows, (c) => c.id);

  const loadTemplates = () => apiService.adminTravauxContractTemplates()
    .then((res) => setTemplates(res.templates))
    .catch(() => setTemplates([]));

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function downloadPdf(c: TravauxContract) {
    try {
      const { blob, filename } = await apiService.adminTravauxDownloadContractPdf(c.id);
      saveBlob(blob, filename);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  // Bulk: one request per contract, then a single reload.
  async function bulk(action: (c: TravauxContract) => Promise<unknown>) {
    const results = await Promise.allSettled(selection.selectedRows.map(action));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: results.length }));
    selection.clear();
    await reload(['contracts']);
  }

  async function bulkDelete() {
    if (!(await confirm({ title: tc('table.bulkDeleteTitle', { count: selection.count }), message: tc('table.bulkDeleteMessage') }))) return;
    await bulk((c) => apiService.adminTravauxDeleteContract(c.id));
  }

  function exportSelection() {
    exportRowsCsv('contrats', [
      [t('travaux.common.title'), (c) => c.title],
      [t('travaux.contracts.amount'), (c) => formatCents(c.amount_cents)],
      [t('travaux.contracts.startDate'), (c) => formatDate(c.starts_on)],
      [t('travaux.contracts.endDate'), (c) => formatDate(c.ends_on)],
      [t('travaux.common.status'), (c) => t(`travaux.contracts.statuses.${c.status}`)],
      [t('travaux.contracts.notes'), (c) => c.notes ?? ''],
    ], selection.selectedRows);
  }

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
      <DataTableToolbar>
        <DataTableSearch value={q} onChange={setQ} />
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setTemplatesOpen(true)}>
          <FileTextIcon size={13} /> {t('travaux.contracts.templates')}
        </button>
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={bulkDelete}>
          <Trash2Icon size={13} /> {tc('table.delete')}
        </button>
      </DataTableSelectionBar>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('travaux.common.title')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.amount')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.startDate')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.endDate')}</DataTableTh>
              <DataTableTh>{t('travaux.common.status')}</DataTableTh>
              <DataTableTh>{t('travaux.contracts.document')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && (
              <DataTableEmpty icon={<FileSignatureIcon size={28} />} label={q ? tc('table.noResults', { query: q }) : t('travaux.contracts.empty')} />
            )}
            {rows.map((c) => (
              <DataTableRow key={c.id} onClick={() => setPreview(c)}>
                {/* Select cell: keep the click from opening the preview. */}
                <DataTableTd className="adm-table__td--select" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selection.isSelected(c.id)} aria-label={tc('table.selectRow')} onChange={(e) => selection.toggle(c.id, e.target.checked)} />
                </DataTableTd>
                <DataTableTd><span className="trv-client-cell__name">{c.title}</span></DataTableTd>
                <DataTableTd className="trv-num">{formatCents(c.amount_cents)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDate(c.starts_on)}</DataTableTd>
                <DataTableTd className="trv-num">{formatDate(c.ends_on)}</DataTableTd>
                <DataTableTd><StatusBadge label={t(`travaux.contracts.statuses.${c.status}`)} variant={STATUS_VARIANT[c.status]} /></DataTableTd>
                <DataTableTd onClick={(e) => e.stopPropagation()}>
                  {c.body ? (
                    <button type="button" className="trv-link-button" onClick={() => downloadPdf(c)}>
                      <DownloadIcon size={13} /> PDF
                    </button>
                  ) : c.file_path ? (
                    <a className="trv-link" href={apiAssetUrl(c.file_path) ?? undefined} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={c.file_name ?? ''}>
                      <PaperclipIcon size={13} />
                    </a>
                  ) : '—'}
                </DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions" onClick={(e) => e.stopPropagation()}>
                    <DataTableAction icon={EyeIcon} label={t('travaux.common.view')} onClick={() => setPreview(c)} />
                    <DataTableAction icon={PenLineIcon} label={t('common.edit')} onClick={() => setEditing(c)} />
                    <DataTableAction icon={Trash2Icon} label={t('common.delete')} variant="danger" onClick={() => remove(c)} />
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
        templates={templates}
        onClose={() => setNewOpen(false)}
        onCreated={async (created) => {
          await reload(['contracts']);
          setNewOpen(false);
          // Généré depuis un modèle : on arrive sur son texte, à relire.
          if (created.body) setEditing(created);
        }}
      />
      <ContractEditorModal
        contract={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => { await reload(['contracts']); setEditing(null); }}
      />
      <ContractTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onChanged={() => void loadTemplates()} />

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        subtitle={preview && <StatusBadge label={t(`travaux.contracts.statuses.${preview.status}`)} variant={STATUS_VARIANT[preview.status]} />}
        size="md"
        footer={preview && (
          <>
            <button type="button" className="adm-btn adm-btn--danger" onClick={() => remove(preview)}>{t('common.delete')}</button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setEditing(preview); setPreview(null); }}>
              <PenLineIcon size={13} /> {t('common.edit')}
            </button>
            {preview.body && (
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => downloadPdf(preview)}>
                <DownloadIcon size={13} /> {t('travaux.contracts.pdf')}
              </button>
            )}
          </>
        )}
      >
        {preview && (
          <dl className="trk-modal-dl">
            <dt>{t('travaux.contracts.amount')}</dt><dd className="trv-num">{formatCents(preview.amount_cents)}</dd>
            <dt>{t('travaux.contracts.startDate')}</dt><dd>{formatDate(preview.starts_on)}</dd>
            <dt>{t('travaux.contracts.endDate')}</dt><dd>{formatDate(preview.ends_on)}</dd>
            <dt>{t('travaux.contracts.notes')}</dt><dd>{preview.notes || '—'}</dd>
            {preview.to_complete.length > 0 && (
              <>
                <dt>{t('travaux.contracts.leftToComplete')}</dt>
                <dd>{t('travaux.contracts.toComplete', { count: preview.to_complete.length })}</dd>
              </>
            )}
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
  open, clientId, templates, onClose, onCreated,
}: {
  open: boolean;
  clientId: string;
  templates: TravauxContractTemplate[];
  onClose: () => void;
  onCreated: (contract: TravauxContract) => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [templateId, setTemplateId] = useState('');
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
    setTemplateId(''); setTitle(''); setAmount(''); setStartsOn(''); setEndsOn(''); setStatus('draft'); setNotes(''); setFile(null);
  }, [open]);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((candidate) => candidate.id === id);
    if (template && !title) setTitle(template.name);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { contract } = await apiService.adminTravauxCreateContract({
        client_id: clientId,
        template_id: templateId || undefined,
        title,
        amount_cents: amount ? Math.round(Number(amount) * 100) : null,
        starts_on: startsOn || null,
        ends_on: endsOn || null,
        status,
        notes,
        file: file ?? undefined,
      });
      await onCreated(contract);
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
          <button type="submit" form="trv-new-contract" className="adm-btn adm-btn--primary" disabled={saving}>{t(templateId ? 'travaux.contracts.generate' : 'common.create')}</button>
        </>
      }
    >
      <form id="trv-new-contract" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-contract-template">{t('travaux.contracts.fromTemplate')}</label>
          <select id="trv-contract-template" className="adm-select" value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
            <option value="">{t('travaux.contracts.noTemplate')}</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          {templateId && <p className="trv-hint">{t('travaux.contracts.fromTemplateHint')}</p>}
        </div>
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
        {!templateId && (
          <div className="adm-form__field">
            <span className="adm-form__label">{t('travaux.contracts.file')}</span>
            <FileDropzone file={file} onChange={setFile} />
          </div>
        )}
      </form>
    </Modal>
  );
}

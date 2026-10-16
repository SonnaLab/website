import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileTextIcon, UploadIcon } from '@icons';

/**
 * Dépôt de fichier (glisser-déposer ou clic). `existingUrl`/`existingName`
 * affichent le fichier déjà enregistré pour qu'un formulaire d'édition ne
 * paraisse pas vide ; `onRemoveExisting` permet de le retirer.
 */
export function FileDropzone({
  file,
  onChange,
  accept,
  label,
  hint,
  compact,
  existingUrl,
  existingName,
  existingIsImage,
  onRemoveExisting,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  label?: string;
  hint?: string;
  compact?: boolean;
  existingUrl?: string | null;
  existingName?: string | null;
  existingIsImage?: boolean;
  onRemoveExisting?: () => void;
}) {
  const { t } = useTranslation('admin');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const className = ['trv-dropzone', compact ? 'trv-dropzone--compact' : '', dragOver ? 'trv-dropzone--over' : '']
    .filter(Boolean).join(' ');

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        className={className}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onChange(dropped);
        }}
      >
        {file ? (
          <>
            <FileTextIcon size={compact ? 18 : 22} />
            <span className="trv-dropzone__name">{file.name}</span>
          </>
        ) : existingUrl ? (
          <>
            {existingIsImage ? <img src={existingUrl} alt={existingName ?? ''} /> : <FileTextIcon size={compact ? 18 : 22} />}
            <span className="trv-dropzone__name">{existingName}</span>
            <span className="trv-dropzone__hint">{t('travaux.invoices.replaceDocument')}</span>
          </>
        ) : (
          <>
            <UploadIcon size={compact ? 18 : 22} />
            <span className="trv-dropzone__name">{label ?? t('travaux.invoices.dropDocument')}</span>
            <span className="trv-dropzone__hint">{hint ?? t('travaux.invoices.dropDocumentHint')}</span>
          </>
        )}
      </div>
      {!file && existingUrl && onRemoveExisting && (
        <button type="button" className="trv-dropzone__remove" onClick={onRemoveExisting}>
          {t('travaux.common.removeFile')}
        </button>
      )}
    </div>
  );
}

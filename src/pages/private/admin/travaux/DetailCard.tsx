import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckIcon, ClipboardListIcon } from '@icons';

/** Building blocks of the back-office « fiche » modals (company, user):
 *  a profile header, titled sections, a grid of label/value tiles, compact lists.
 *  Styles: src/styles/detail-modals.css (`dm-` prefix). */

type Value = ReactNode | string | number | null | undefined;

const isEmpty = (v: Value) => v === null || v === undefined || v === '' || v === false;

/** « AB » from a name, falling back to the e-mail's local part. */
export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email || '?').slice(0, 2).toUpperCase();
}

/** Small icon button copying `value` to the clipboard, with a toast. */
export function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation('admin');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t('common.copied'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('common.copyFailed'));
    }
  }

  return (
    <button type="button" className="dm-copy" onClick={copy} aria-label={t('common.copy')} title={t('common.copy')}>
      {copied ? <CheckIcon size={13} /> : <ClipboardListIcon size={13} />}
    </button>
  );
}

/** Profile header: avatar, large name, subtitle line, status pills. */
export function DetailHead({ avatar, name, subtitle, pills }: { avatar: ReactNode; name: string; subtitle?: ReactNode; pills?: ReactNode }) {
  return (
    <div className="dm-head">
      <div className="dm-head__avatar">{avatar}</div>
      <div className="dm-head__main">
        <p className="dm-head__name">{name}</p>
        {subtitle && <p className="dm-head__sub">{subtitle}</p>}
        {pills && <div className="dm-head__pills">{pills}</div>}
      </div>
    </div>
  );
}

export interface TileSpec {
  label: string;
  value: Value;
  /** Text copied to the clipboard (a copy button is shown when set and non-empty). */
  copy?: string | null;
  /** Spans both columns (long values: address, legal line…). */
  wide?: boolean;
  /** Tabular figures (amounts, counts). */
  num?: boolean;
}

/** A label/value tile; an empty value renders as a grey « — ». */
export function DetailTile({ label, value, copy, wide, num }: TileSpec) {
  const empty = isEmpty(value);
  return (
    <div className={['dm-tile', wide && 'dm-tile--wide'].filter(Boolean).join(' ')}>
      <span className="dm-tile__label">{label}</span>
      <div className="dm-tile__row">
        <span className={['dm-tile__value', num && 'dm-tile__value--num', empty && 'dm-empty'].filter(Boolean).join(' ')}>
          {empty ? '—' : value}
        </span>
        {!empty && copy && <CopyButton value={copy} />}
      </div>
    </div>
  );
}

/** Titled section; with `tiles`, rendered as a 2-column grid and skipped
 *  entirely when every tile is empty. */
export function DetailSection({ title, tiles, aside, children }: { title: string; tiles?: TileSpec[]; aside?: ReactNode; children?: ReactNode }) {
  if (tiles && !children && tiles.every((tile) => isEmpty(tile.value))) return null;
  return (
    <section className="dm-section">
      <header className="dm-section__head">
        <h3 className="dm-section__title">{title}</h3>
        {aside && <span className="dm-section__aside">{aside}</span>}
      </header>
      {tiles && (
        <div className="dm-grid">
          {tiles.map((tile) => <DetailTile key={tile.label} {...tile} />)}
        </div>
      )}
      {children}
    </section>
  );
}

/** Compact list of rows (members, projects); `empty` is shown when there is none. */
export function DetailList({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (!children.length) return <p className="dm-list-empty">{empty}</p>;
  return <ul className="dm-list">{children}</ul>;
}

export function DetailListRow({ initials, title, meta, pill, copy }: { initials?: string; title: string; meta?: ReactNode; pill?: ReactNode; copy?: string | null }) {
  return (
    <li className="dm-list__row">
      {initials && <span className="dm-list__avatar" aria-hidden="true">{initials}</span>}
      <div className="dm-list__main">
        <span className="dm-list__title">{title}</span>
        {meta && <span className="dm-list__meta">{meta}</span>}
      </div>
      {pill && <span className="dm-list__pill">{pill}</span>}
      {copy && <CopyButton value={copy} />}
    </li>
  );
}

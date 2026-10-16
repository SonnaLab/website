import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';

const DEBOUNCE_MS = 300;

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onSelect'>;

/**
 * Champ texte avec suggestions d'un annuaire (entreprises, adresses) :
 * recherche après une courte pause de frappe, requête précédente annulée,
 * navigation clavier (↑ ↓ Entrée Échap). Choisir une suggestion appelle
 * `onPick` ; la saisie libre reste toujours possible.
 */
export function LookupInput<T>({
  value,
  onChange,
  search,
  onPick,
  itemKey,
  renderItem,
  source,
  labels,
  minChars = 3,
  ...inputProps
}: NativeInputProps & {
  value: string;
  onChange: (value: string) => void;
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  onPick: (item: T) => void;
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Mention de la source des données, sous la liste. */
  source?: ReactNode;
  labels: { loading: string; empty: string; error: string };
  minChars?: number;
}) {
  const listId = useId();
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  // Ne chercher qu'après une frappe : pas après un remplissage programmatique.
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return undefined;
    if (value.trim().length < minChars) {
      setItems([]);
      setOpen(false);
      setStatus('idle');
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus('loading');
      setOpen(true);
      search(value, controller.signal)
        .then((results) => { setItems(results); setActive(results.length ? 0 : -1); setStatus('idle'); })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'AbortError') return;
          setItems([]);
          setStatus('error');
        });
    }, DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, minChars, search]);

  function pick(item: T) {
    typed.current = false;
    setOpen(false);
    setItems([]);
    onPick(item);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0 && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      // Ferme la liste sans fermer le modal (qui écoute Échap sur document).
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  const showList = open && (status !== 'idle' || items.length > 0 || value.trim().length >= minChars);

  return (
    <div className="trv-lookup">
      <input
        {...inputProps}
        className={inputProps.className ?? 'adm-input'}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { typed.current = true; onChange(e.target.value); }}
        onKeyDown={onKeyDown}
        onFocus={() => { if (items.length) setOpen(true); }}
        onBlur={() => setOpen(false)}
      />
      {showList && (
        <div className="trv-lookup__panel">
          <ul id={listId} role="listbox" className="trv-lookup__list">
            {status === 'loading' && !items.length && <li className="trv-lookup__status">{labels.loading}</li>}
            {status === 'error' && <li className="trv-lookup__status">{labels.error}</li>}
            {status === 'idle' && !items.length && <li className="trv-lookup__status">{labels.empty}</li>}
            {items.map((item, i) => (
              <li
                key={itemKey(item)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`trv-lookup__item${i === active ? ' trv-lookup__item--active' : ''}`}
                // mousedown : choisir avant que le champ ne perde le focus.
                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                onMouseEnter={() => setActive(i)}
              >
                {renderItem(item)}
              </li>
            ))}
          </ul>
          {source && <p className="trv-lookup__source">{source}</p>}
        </div>
      )}
    </div>
  );
}

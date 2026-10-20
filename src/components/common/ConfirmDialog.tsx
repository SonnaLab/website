import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Modal } from './Modal';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Destructive action (red button). Default: true. */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * The back-office confirmation dialog, in place of the browser's
 * window.confirm: `if (!(await confirm({ title }))) return;`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('admin');
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(next);
  }), []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);
  const dismiss = useCallback(() => close(false), [close]);

  const danger = options?.danger ?? true;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!options}
        onClose={dismiss}
        size="sm"
        title={options?.title ?? ''}
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={dismiss}>{t('common.cancel')}</button>
            <button type="button" className={`adm-btn ${danger ? 'adm-btn--danger-solid' : 'adm-btn--primary'}`} onClick={() => close(true)} autoFocus>
              {options?.confirmLabel ?? (danger ? t('common.delete') : t('common.confirm'))}
            </button>
          </>
        }
      >
        {options?.message && <p className="adm-confirm__message">{options.message}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** Falls back to the browser dialog outside the provider. */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  return confirm ?? (async ({ title, message }) => window.confirm(message ? `${title}\n${message}` : title));
}

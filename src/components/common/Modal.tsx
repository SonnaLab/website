import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  badge?: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', badge }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="adm-modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`adm-modal adm-modal--${size}`} role="dialog" aria-modal="true">
        <div className="adm-modal__header">
          <div className="adm-modal__heading">
            {badge && <div className="adm-modal__badge">{badge}</div>}
            <h2 className="adm-modal__title">{title}</h2>
            {subtitle && <p className="adm-modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="adm-modal__close" onClick={onClose} aria-label="Fermer">
            <XIcon size={18} />
          </button>
        </div>

        <div className="adm-modal__body">{children}</div>

        {footer && <div className="adm-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

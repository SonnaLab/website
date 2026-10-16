import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MinusIcon, PlusIcon } from '@icons';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const FRAME_PADDING = 16;

/**
 * Page A4 (794×1123 px) sur fond gris, dans une fenêtre de hauteur fixe :
 * seul le zoom (boutons −/+) change, la page défile à l'intérieur. Le zoom
 * initial ajuste la page entière à la fenêtre (comme sur elancevae).
 */
export function DocumentPreviewFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation('admin');
  const [zoom, setZoom] = useState(0.7);
  const containerRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  useLayoutEffect(() => {
    if (didInit.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width > 0 && height > 0) {
      const fit = Math.min((width - FRAME_PADDING * 2) / A4_WIDTH, (height - FRAME_PADDING * 2) / A4_HEIGHT);
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit)));
      didInit.current = true;
    }
  }, []);

  return (
    <div ref={containerRef} className="trv-a4-viewport">
      <div style={{ width: A4_WIDTH * zoom, height: A4_HEIGHT * zoom, flexShrink: 0 }}>
        <div className="trv-a4-page" style={{ transform: `scale(${zoom})` }}>
          {children}
        </div>
      </div>
      <div className="trv-a4-zoom">
        <button type="button" aria-label={t('travaux.document.zoomOut')} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}>
          <MinusIcon size={14} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label={t('travaux.document.zoomIn')} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}>
          <PlusIcon size={14} />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useModal } from '@/components/providers/ModalProvider';

const SESSION_KEY = 'sl_auto_consult_shown';

interface AutoConsultationOptions {
  /** Only arm the trigger once the page is ready (e.g. article loaded). */
  enabled?: boolean;
  /** Minimum time on page before the engagement trigger can fire (ms). */
  minTimeMs?: number;
  /** Minimum scroll depth (0-1) before the engagement trigger can fire. */
  minScroll?: number;
}

/**
 * Strategically invites the visitor to get in touch once they have shown
 * genuine interest in the page. The consultation modal opens at most once per
 * browser session and only on engaged readers:
 *   - Desktop: exit-intent (cursor leaves the viewport towards the top), OR
 *   - Any device: scrolled past `minScroll` AND spent at least `minTimeMs`.
 * It never fires if the visitor already opened the modal manually this session.
 */
export function useAutoConsultationTrigger({
  enabled = true,
  minTimeMs = 45000,
  minScroll = 0.6,
}: AutoConsultationOptions = {}) {
  const { openConsultationModal, isConsultationModalOpen } = useModal();
  const firedRef = useRef(false);

  // If the visitor opens the modal by themselves, don't auto-invite afterwards.
  useEffect(() => {
    if (isConsultationModalOpen) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* sessionStorage may be unavailable (private mode) */
      }
    }
  }, [isConsultationModalOpen]);

  useEffect(() => {
    if (!enabled) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    const mountedAt = Date.now();
    let maxScroll = 0;

    const markShown = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
    };

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      markShown();
      cleanup();
      openConsultationModal();
    };

    const isEngaged = () =>
      Date.now() - mountedAt >= minTimeMs && maxScroll >= minScroll;

    const onScroll = () => {
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const depth = docHeight > 0 ? window.scrollY / docHeight : 0;
      if (depth > maxScroll) maxScroll = depth;
      if (isEngaged()) fire();
    };

    // Desktop exit-intent: cursor leaves towards the top of the viewport.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget && Date.now() - mountedAt > 8000) {
        fire();
      }
    };

    const supportsHover =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    window.addEventListener('scroll', onScroll, { passive: true });
    if (supportsHover) {
      document.addEventListener('mouseout', onMouseOut);
    }

    function cleanup() {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onMouseOut);
    }

    return cleanup;
  }, [enabled, minTimeMs, minScroll, openConsultationModal]);
}

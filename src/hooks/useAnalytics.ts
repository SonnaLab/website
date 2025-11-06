import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analytics/AnalyticsService';

/**
 * Hook pour tracker automatiquement les pages vues
 * À utiliser dans App.tsx ou dans chaque route
 */
export function usePageTracking() {
  const location = useLocation();
  const previousPath = useRef<string>('');

  useEffect(() => {
    // Attendre que la page soit complètement chargée
    const timeout = setTimeout(() => {
      if (location.pathname !== previousPath.current) {
        analytics.trackPageView({
          previousPath: previousPath.current || undefined,
          search: location.search,
          hash: location.hash
        });
        previousPath.current = location.pathname;
      }
    }, 100); // Petit délai pour éviter les double-tracking

    return () => clearTimeout(timeout);
  }, [location]);
}

/**
 * Hook pour tracker le temps passé sur une page
 */
export function usePageDuration(pageName?: string) {
  const startTime = useRef(Date.now());
  const location = useLocation();

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      const duration = Date.now() - startTime.current;      
      if (duration > 3000) {
        analytics.track('page_view', {
          page: pageName || location.pathname,
          duration: Math.round(duration / 1000),
          action: 'page_exit'
        });
      }
    };
  }, [location.pathname, pageName]);
}

/**
 * Hook pour tracker la lecture d'un article de blog
 */
export function useBlogTracking(slug: string, category?: string) {
  const startTime = useRef(Date.now());
  const maxScroll = useRef(0);
  const hasTrackedRead = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      maxScroll.current = Math.max(maxScroll.current, scrollPercentage);

      // Considérer comme "lu" si scroll > 75%
      if (scrollPercentage > 75 && !hasTrackedRead.current) {
        hasTrackedRead.current = true;
        const readTime = Math.round((Date.now() - startTime.current) / 1000);
        analytics.track('blog_read', {
          slug,
          category,
          readTime,
          scrollDepth: scrollPercentage,
          completed: true
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      
      const readTime = Math.round((Date.now() - startTime.current) / 1000);
      
      // Track final seulement si pas déjà tracké comme "lu"
      if (!hasTrackedRead.current && readTime > 5) {
        analytics.trackBlogRead(slug, readTime, maxScroll.current);
      }
    };
  }, [slug, category]);
}

/**
 * Hook pour tracker les interactions de formulaire
 */
export function useFormTracking(formName: string) {
  const hasStarted = useRef(false);
  const startTime = useRef<number | null>(null);

  const trackStart = () => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startTime.current = Date.now();
      analytics.trackFormStart(formName);
    }
  };

  const trackSubmit = (success: boolean, data?: Record<string, any>) => {
    const duration = startTime.current 
      ? Math.round((Date.now() - startTime.current) / 1000)
      : undefined;

    analytics.trackFormSubmit(formName, success, {
      ...data,
      duration
    });
  };

  const trackError = (errors: string[]) => {
    analytics.trackFormError(formName, errors);
  };

  const trackAbandon = () => {
    if (hasStarted.current && startTime.current) {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      analytics.track('form_abandon', {
        formName,
        duration
      });
    }
  };

  return { trackStart, trackSubmit, trackError, trackAbandon };
}

/**
 * Hook pour tracker les clics sur CTA
 */
export function useCTATracking() {
  const trackCTA = (ctaName: string, location: string, metadata?: Record<string, any>) => {
    analytics.trackCTAClick(ctaName, location);
    
    // Log en dev
    if (import.meta.env.DEV) {
      console.log('🎯 CTA Click:', { ctaName, location, ...metadata });
    }
  };

  return { trackCTA };
}

/**
 * Hook pour tracker les changements de langue
 */
export function useLanguageTracking() {
  const previousLanguage = useRef<string | null>(null);

  const trackLanguageChange = (newLanguage: string) => {
    if (previousLanguage.current && previousLanguage.current !== newLanguage) {
      analytics.trackLanguageChange(previousLanguage.current, newLanguage);
    }
    previousLanguage.current = newLanguage;
  };

  return { trackLanguageChange };
}
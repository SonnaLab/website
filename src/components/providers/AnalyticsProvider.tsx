import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../../services/analytics/AnalyticsService';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();

  useEffect(() => {
    analytics.trackPageView({
      title: document.title,
      path: location.pathname,
      search: location.search,
    });

    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📊 Flushing analytics...');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
}
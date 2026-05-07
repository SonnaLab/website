import { useState, useEffect } from 'react';
import { analytics } from '@/services/analytics/AnalyticsService';
import type { CookiePreferences } from '@/types/analytics';

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const prefs = analytics.getPreferences();
    setPreferences(prefs);
    setHasConsent(!!prefs);
  }, []);

  const updatePreferences = (newPrefs: CookiePreferences) => {
    analytics.setPreferences(newPrefs);
    setPreferences(newPrefs);
    setHasConsent(true);
  };

  const hasAnalyticsConsent = preferences?.analytics ?? false;
  const hasMarketingConsent = preferences?.marketing ?? false;

  return {
    preferences,
    hasConsent,
    hasAnalyticsConsent,
    hasMarketingConsent,
    updatePreferences
  };
}
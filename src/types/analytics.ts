declare global {
  interface Window {
    SonnaAnalytics?: {
      setConsent: (level: 'none' | 'anonymous' | 'full', prefs?: { analytics: boolean; marketing: boolean }) => void;
      track: (eventType: string, data?: Record<string, unknown>) => void;
      getVisitorId: () => string | null;
    };
  }
}

export type CookieCategory = 'essential' | 'analytics' | 'marketing';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'click'
  | 'scroll'
  | 'form_start'
  | 'form_submit'
  | 'form_error'
  | 'form_abandon'
  | 'blog_read'
  | 'cta_click'
  | 'newsletter_signup'
  | 'consultation_request'
  | 'project_inquiry'
  | 'language_change'
  | 'share_social';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
  page: string;
  metadata?: Record<string, any>;
  
  // User context
  language: string;
  referrer: string;
  userAgent: string;
  screenResolution: string;
  
  browserName?: string;
  browserVersion?: string;
  os?: string;
  timezone?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  
  // Location
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface AnalyticsSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageCount: number;
  events: AnalyticsEvent[];
  deviceType: 'mobile' | 'tablet' | 'desktop';
  consentedAnalytics: boolean;
  consentedMarketing: boolean;
}

export interface ConsentPayload {
  sessionId: string;
  userId: string | null;
  preferences: CookiePreferences;
  userAgent: string;
  language: string;
  screenResolution: string;
  timezone: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface AnalyticsMetrics {
  totalPageViews: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  topCTAs: Array<{ cta: string; clicks: number }>;
  conversionRate: number;
  
  // Blog specific
  blogMetrics: {
    totalReads: number;
    averageReadTime: number;
    topArticles: Array<{ slug: string; reads: number; avgTime: number }>;
  };
  
  // Demographics
  languages: Record<string, number>;
  devices: Record<string, number>;
  countries: Record<string, number>;
}
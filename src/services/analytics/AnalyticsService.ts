import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../api';
import type { 
  AnalyticsEvent, 
  AnalyticsEventType, 
  AnalyticsSession,
  CookiePreferences 
} from '../../types/analytics';

const COOKIE_VERSION = '1.0.0';
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds

class AnalyticsService {
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: number | null = null;
  private preferences: CookiePreferences | null = null;
  private sessionStartTime: number;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.sessionId = this.getOrCreateSession();
    this.userId = this.getUserId();
    this.sessionStartTime = Date.now();
    this.loadPreferences();
    this.initializeTracking();
    this.setupOnlineListener();
  }

  // ==================== Cookie Preferences ====================

  private loadPreferences(): void {
    const stored = localStorage.getItem('cookie_consent');
    if (stored) {
      this.preferences = JSON.parse(stored);
    }
  }

  public setPreferences(preferences: CookiePreferences): void {
    this.preferences = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: COOKIE_VERSION
    };
    localStorage.setItem('cookie_consent', JSON.stringify(this.preferences));
    
    if (preferences.analytics && !this.userId) {
      this.userId = this.createUserId();
    }
    
    this.sendConsentToBackend(preferences);    
    if (preferences.analytics) {
      this.initializeTracking();
    }
  }

  public getPreferences(): CookiePreferences | null {
    return this.preferences;
  }

  public hasConsent(category: 'analytics' | 'marketing'): boolean {
    return this.preferences?.[category] === true;
  }

  private async sendConsentToBackend(preferences: CookiePreferences): Promise<void> {
    try {
      await apiService.sendCookieConsent({
        sessionId: this.sessionId,
        userId: this.userId,
        preferences: preferences,
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceType: this.getDeviceType(),
      });
    } catch (error) {
      console.error('Failed to send consent to backend:', error);
    }
  }
  // ==================== Session Management ====================

  private getOrCreateSession(): string {
    const existing = sessionStorage.getItem('analytics_session');
    if (existing) return existing;
    
    const newSession = uuidv4();
    sessionStorage.setItem('analytics_session', newSession);
    return newSession;
  }

  private getUserId(): string | null {
    if (!this.hasConsent('analytics')) return null;
    
    const existing = localStorage.getItem('analytics_user_id');
    if (existing) return existing;
    
    return null; // Sera créé après consentement
  }

  private createUserId(): string {
    const newUserId = uuidv4();
    localStorage.setItem('analytics_user_id', newUserId);
    return newUserId;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

    private getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    let os = 'Unknown';

    // Détecter le navigateur
    if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('Safari') > -1) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('Edge') > -1) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edge\/(\d+\.\d+)/)?.[1] || '';
    }

    // Détecter l'OS
    if (ua.indexOf('Win') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iOS') > -1) os = 'iOS';

    return { browserName, browserVersion, os };
  }

  // ==================== Event Tracking ====================

  public track(
    type: AnalyticsEventType,
    metadata?: Record<string, any>
  ): void {
    // Vérifier le consentement
    if (type !== 'page_view' && !this.hasConsent('analytics')) {
      return;
    }

    const browserInfo = this.getBrowserInfo();

    const event: AnalyticsEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      page: window.location.pathname,
      metadata,
      
      language: navigator.language,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      
      browserName: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion,
      os: browserInfo.os,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceType: this.getDeviceType(),
      
      // Sera enrichi par le backend
      ip: undefined,
      country: undefined,
      countryCode: undefined,
      region: undefined,
      city: undefined,
      postalCode: undefined,
      latitude: undefined,
      longitude: undefined,
    };

    this.eventQueue.push(event);
    
    // Log en dev
    if (import.meta.env.DEV) {
      console.log('📊 Analytics Event:', event);
    }

    // Batch send
    this.scheduleBatchSend();
  }

  // ==================== Specific Tracking Methods ====================

  public trackPageView(metadata?: Record<string, any>): void {
    this.track('page_view', {
      title: document.title,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      ...metadata
    });
  }

  public trackClick(element: string, metadata?: Record<string, any>): void {
    this.track('click', { element, ...metadata });
  }

  public trackCTAClick(ctaName: string, location: string): void {
    this.track('cta_click', { ctaName, location });
  }

  public trackScroll(depth: number): void {
    this.track('scroll', { depth });
  }

  public trackFormStart(formName: string): void {
    this.track('form_start', { formName });
  }

  public trackFormSubmit(formName: string, success: boolean, data?: Record<string, any>): void {
    this.track('form_submit', { formName, success, ...data });
  }

  public trackFormError(formName: string, errors: string[]): void {
    this.track('form_error', { formName, errors });
  }

  public trackBlogRead(slug: string, readTime: number, scrollDepth: number): void {
    this.track('blog_read', { 
      slug, 
      readTime, 
      scrollDepth,
      category: this.getCurrentBlogCategory()
    });
  }

  public trackNewsletterSignup(email: string): void {
    // Hash l'email pour privacy
    const hashedEmail = this.hashEmail(email);
    this.track('newsletter_signup', { emailHash: hashedEmail });
  }

  public trackConsultationRequest(projectType: string): void {
    this.track('consultation_request', { projectType });
  }

  public trackLanguageChange(from: string, to: string): void {
    this.track('language_change', { from, to });
  }

  public trackSocialShare(platform: 'twitter' | 'linkedin' | 'facebook' | 'email', content: string): void {
    this.track('share_social', { platform, content });
  }

  // ==================== Batch Sending ====================

  private scheduleBatchSend(): void {
    if (this.batchTimer) return;
    
    this.batchTimer = window.setTimeout(() => {
      this.sendBatch();
      this.batchTimer = null;
    }, BATCH_INTERVAL);

    // Send immédiatement si queue pleine
    if (this.eventQueue.length >= BATCH_SIZE) {
      this.sendBatch();
    }
  }

  private async sendBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (this.isOnline) {
        await apiService.sendAnalyticsEvents(eventsToSend, {
          id: this.sessionId,
          userId: this.userId || undefined,
          startTime: this.sessionStartTime,
          deviceType: this.getDeviceType(),
          consentedAnalytics: this.hasConsent('analytics'),
          consentedMarketing: this.hasConsent('marketing'),
        });
      } else {
        this.saveToLocalStorage(eventsToSend);
      }
    } catch (error) {
      console.error('Analytics API error, using fallback:', error);
      this.saveToLocalStorage(eventsToSend);
    }
  }
  
  private saveToLocalStorage(events: AnalyticsEvent[]): void {
    try {
      const existing = localStorage.getItem('analytics_fallback');
      const fallbackEvents = existing ? JSON.parse(existing) : [];
      
      fallbackEvents.push(...events);
      
      // Limiter à 1000 events max
      if (fallbackEvents.length > 1000) {
        fallbackEvents.splice(0, fallbackEvents.length - 1000);
      }
      
      localStorage.setItem('analytics_fallback', JSON.stringify(fallbackEvents));
      
      console.log('📦 Analytics saved to localStorage (fallback)');
    } catch (error) {
      console.error('Failed to save analytics to localStorage:', error);
    }
  }

  // ==================== Auto-tracking ====================

  private initializeTracking(): void {
    if (!this.hasConsent('analytics')) return;

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendBatch(); // Flush avant de quitter
      }
    });

    // Track beforeunload
    window.addEventListener('beforeunload', () => {
      this.sendBatch();
    });

    // Auto-track scroll depth
    this.setupScrollTracking();

    // Auto-track clicks on data-analytics elements
    this.setupClickTracking();
  }

  private setupScrollTracking(): void {
    let maxScroll = 0;
    const depths = [25, 50, 75, 100];
    
    const handleScroll = () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      depths.forEach(depth => {
        if (scrollPercentage >= depth && depth > maxScroll) {
          maxScroll = depth;
          this.trackScroll(depth);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  private setupClickTracking(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Track elements with data-analytics-event
      const analyticsElement = target.closest('[data-analytics-event]') as HTMLElement;
      if (analyticsElement) {
        const eventName = analyticsElement.dataset.analyticsEvent;
        const eventData = analyticsElement.dataset.analyticsData 
          ? JSON.parse(analyticsElement.dataset.analyticsData) 
          : {};
        
        this.trackClick(eventName || 'unknown', eventData);
      }
    });
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncFallbackData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private async syncFallbackData(): Promise<void> {
    const fallbackData = localStorage.getItem('analytics_fallback');
    if (!fallbackData) return;

    try {
      const events = JSON.parse(fallbackData);
      await apiService.sendAnalyticsEvents(events, {
        id: this.sessionId,
        startTime: this.sessionStartTime,
        userId: this.userId || undefined,
        consentedAnalytics: this.hasConsent('analytics'),
        consentedMarketing: this.hasConsent('marketing'),
        deviceType: this.getDeviceType()
      });
      localStorage.removeItem('analytics_fallback');
      console.log('✅ Synced fallback analytics data');
    } catch (error) {
      console.error('Failed to sync fallback data:', error);
    }
  }

  // ==================== Utilities ====================

  private getCurrentBlogCategory(): string | undefined {
    // Extract from URL ou meta tag
    const meta = document.querySelector('meta[name="blog:category"]');
    return meta?.getAttribute('content') || undefined;
  }

  private hashEmail(email: string): string {
    // Simple hash pour privacy (en prod, utiliser crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ==================== Session Info ====================

  public getSessionInfo(): AnalyticsSession {
    return {
      id: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      duration: Date.now() - this.sessionStartTime,
      userId: this.userId || undefined,
      consentedAnalytics: this.hasConsent('analytics'),
      consentedMarketing: this.hasConsent('marketing'),
      pageCount: this.eventQueue.filter(e => e.type === 'page_view').length,
      events: this.eventQueue,
      deviceType: this.getDeviceType()
    };
  }
}

export const analytics = new AnalyticsService();
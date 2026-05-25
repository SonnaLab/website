import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Cookie, 
  Settings, 
  Shield, 
  BarChart3, 
  Target,
  X,
  Check
} from 'lucide-react';
import { analytics } from '@/services/analytics/AnalyticsService';
import type { CookiePreferences } from '@/types/analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

export function CookieConsent() {
  const { t } = useTranslation('cookies');
  const [cardOpen, setCardOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [hasConsent, setHasConsent] = useState(!!analytics.getPreferences());
  const [hoveredSecondaryAction, setHoveredSecondaryAction] = useState<'reject' | 'settings' | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const consent = analytics.getPreferences();
    if (!consent) {
      // First visit: auto-open the card
      setTimeout(() => setCardOpen(true), 800);
    } else {
      setPreferences(consent);
    }
  }, []);

  useEffect(() => {
    if (!cardOpen && !showSettings) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cardOpen, showSettings]);

  const savePreferences = (prefs: CookiePreferences) => {
    analytics.setPreferences(prefs);
    setHasConsent(true);
    setCardOpen(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
    window.SonnaAnalytics?.setConsent('full', { analytics: true, marketing: true });
  };

  const rejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
    window.SonnaAnalytics?.setConsent('anonymous', { analytics: false, marketing: false });
  };

  const togglePreference = (id: 'analytics' | 'marketing') => {
    setPreferences(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openSettings = () => {
    setCardOpen(false);
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    if (!hasConsent) {
      setCardOpen(true);
    }
  };

  const handleSettingsOpenChange = (open: boolean) => {
    if (open) {
      setShowSettings(true);
      return;
    }

    closeSettings();
  };

  const categories = [
    {
      id: 'essential' as const,
      icon: Shield,
      color: 'black' as const,
      locked: true
    },
    {
      id: 'analytics' as const,
      icon: BarChart3,
      color: 'blue' as const,
      locked: false
    },
    {
      id: 'marketing' as const,
      icon: Target,
      color: 'purple' as const,
      locked: false
    }
  ];

  const bannerTitle = t('banner.title').replace(/^[^\p{L}\p{N}]+/u, '').trim();

  const cardStyle: React.CSSProperties = isMobile
    ? {
        zIndex: 9999,
        bottom: '4.75rem',
        left: '0.75rem',
        right: '0.75rem',
        padding: '1rem',
        borderRadius: '1.25rem',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        maxHeight: 'calc(100vh - 6rem)',
        overflowY: 'auto',
      }
    : {
        zIndex: 9999,
        bottom: '6rem',
        right: '1.5rem',
        width: 'min(390px, calc(100vw - 2rem))',
        padding: '1.125rem',
        borderRadius: '1.25rem',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
      };

  const secondaryActionStyle = (action: 'reject' | 'settings'): React.CSSProperties => {
    const isHovered = hoveredSecondaryAction === action;

    return {
      minHeight: '2.4rem',
      borderRadius: '999px',
      border: `1px solid ${isHovered ? '#cbd5e1' : '#e2e8f0'}`,
      backgroundColor: isHovered ? '#f8fafc' : '#ffffff',
      color: isHovered ? '#111827' : '#374151',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0 0.85rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
    };
  };

  return (
    <>
      <style>
        {`
          .cookie-secondary-action:hover,
          .cookie-secondary-action:focus-visible {
            background-color: #f8fafc !important;
            border-color: #cbd5e1 !important;
            color: #111827 !important;
          }
        `}
      </style>

      {/* Blocking blur backdrop */}
      <AnimatePresence>
        {cardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed"
            style={{
              zIndex: 9998,
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(255, 255, 255, 0.34)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              pointerEvents: 'auto',
            }}
          />
        )}
      </AnimatePresence>

      {/* Consent card */}
      {cardOpen && !showSettings && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed border border-gray-100"
          style={cardStyle}
        >
            {/* Header */}
            <div
              className="flex items-start"
              style={{ gap: '0.75rem', marginBottom: '0.75rem' }}
            >
              <div
                className="bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0"
                style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.875rem' }}
              >
                <Cookie style={{ width: '1rem', height: '1rem' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  className="font-bold text-gray-900"
                  style={{ fontSize: '0.95rem', lineHeight: 1.25 }}
                >
                  {bannerTitle}
                </h3>
              </div>
              {hasConsent && (
                <button
                  onClick={() => setCardOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center"
                  style={{ width: '1.75rem', height: '1.75rem', borderRadius: '999px' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Description */}
            <p
              className="text-gray-600"
              style={{ fontSize: '0.82rem', lineHeight: 1.55, marginBottom: '1rem' }}
            >
              {t('banner.description')}
            </p>

            {/* Actions */}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <Button
                size="sm"
                onClick={acceptAll}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                style={{ minHeight: '2.65rem', borderRadius: '999px' }}
              >
                <Check className="w-3.5 h-3.5 mr-2" />
                {t('banner.acceptAll')}
              </Button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="cookie-secondary-action"
                  onClick={rejectNonEssential}
                  onPointerEnter={() => setHoveredSecondaryAction('reject')}
                  onPointerLeave={() => setHoveredSecondaryAction(null)}
                  onFocus={() => setHoveredSecondaryAction('reject')}
                  onBlur={() => setHoveredSecondaryAction(null)}
                  style={secondaryActionStyle('reject')}
                >
                  <X className="w-3.5 h-3.5 mr-2" />
                  {t('banner.reject')}
                </button>
                <button
                  type="button"
                  className="cookie-secondary-action"
                  onClick={openSettings}
                  onPointerEnter={() => setHoveredSecondaryAction('settings')}
                  onPointerLeave={() => setHoveredSecondaryAction(null)}
                  onFocus={() => setHoveredSecondaryAction('settings')}
                  onBlur={() => setHoveredSecondaryAction(null)}
                  style={secondaryActionStyle('settings')}
                >
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  {t('banner.customize')}
                </button>
              </div>
            </div>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          if (!hasConsent && cardOpen) return;
          setCardOpen(prev => !prev);
        }}
        className="fixed rounded-full bg-primary text-primary-foreground flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          zIndex: 9999,
          bottom: isMobile ? '1rem' : '1.5rem',
          right: isMobile ? '1rem' : '1.5rem',
          width: isMobile ? '3rem' : '3.5rem',
          height: isMobile ? '3rem' : '3.5rem',
        }}
        aria-label="Cookie preferences"
      >
        <Cookie style={{ width: isMobile ? '1.1rem' : '1.35rem', height: isMobile ? '1.1rem' : '1.35rem' }} />
        {!hasConsent && (
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '11px',
            height: '11px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid white'
          }} />
        )}
      </motion.button>

      {/* ── Settings Modal ── */}
      <Dialog open={showSettings} onOpenChange={handleSettingsOpenChange}>
        <DialogContent className="max-w-2xl w-full p-8 rounded-2xl max-h-[90vh] overflow-auto">
          <DialogHeader className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-xl">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                {t('settings.title')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-gray-600">
              {t('settings.description')}
            </DialogDescription>
          </DialogHeader>

          {/* Catégories */}
          <div className="space-y-6 mt-8 pb-4">
            {categories.map(({ id, icon: Icon, color, locked }) => {
              const isActive = preferences[id];

              return (
                <motion.div
                  key={id}
                  initial={false}
                  animate={{
                    scale: isActive && !locked ? 1.02 : 1,
                    transition: { type: 'spring', stiffness: 300, damping: 20 }
                  }}
                  onClick={() => {
                    if (!locked && (id === 'analytics' || id === 'marketing')) {
                      togglePreference(id);
                    }
                  }}
                  className={`relative border-2 rounded-2xl p-6 transition-all duration-300 ${
                    locked
                      ? 'bg-green-50 border-green-200 cursor-default'
                      : isActive
                      ? 'border-black bg-gradient-to-br from-black/10 to-black/5 shadow-lg cursor-pointer hover:shadow-xl'
                      : 'border-gray-200 bg-white cursor-pointer hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  {/* Indicateur visuel pour actif */}
                  <AnimatePresence>
                    {isActive && !locked && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-4 right-4 w-3 h-3 bg-black rounded-full"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-black rounded-full opacity-50"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icône animée */}
                      <motion.div
                        animate={{
                          backgroundColor: locked
                            ? 'rgb(0, 0, 0)'
                            : isActive
                            ? 'rgb(0, 0, 0)' // black
                            : 'rgb(229, 231, 235)', // gray-200
                          scale: isActive ? [1, 1.1, 1] : 1
                        }}
                        transition={{ duration: 0.3 }}
                        className="p-3 rounded-lg shadow-md"
                      >
                        <motion.div
                          animate={{
                            rotate: isActive && !locked ? [0, 10, -10, 0] : 0
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon
                            className={`w-5 h-5 transition-colors duration-300 ${
                              locked || isActive
                                ? 'text-white'
                                : 'text-gray-600'
                            }`}
                          />
                        </motion.div>
                      </motion.div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
                          {t(`settings.categories.${id}.title`)}
                          {locked && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-xs px-2 py-0.5 bg-black text-white rounded-full"
                            >
                              {t('settings.alwaysActive')}
                            </motion.span>
                          )}
                        </h3>
                        {!locked && (
                          <motion.p
                            animate={{
                              color: isActive ? 'rgb(0, 0, 0)' : 'rgb(107, 114, 128)',
                              fontWeight: isActive ? 600 : 400
                            }}
                            className="text-sm"
                          >
                            {isActive ? '✓ Activé' : 'Désactivé'}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </div>

                  <motion.p
                    animate={{
                      color: isActive && !locked ? 'rgb(17, 24, 39)' : 'rgb(107, 114, 128)'
                    }}
                    className="text-sm leading-relaxed mb-4"
                  >
                    {t(`settings.categories.${id}.description`)}
                  </motion.p>

                  {/* Tags animés */}
                  <div className="flex flex-wrap gap-2">
                    {(t(`settings.categories.${id}.examples`, {
                      returnObjects: true,
                    }) as string[]).map((example: string, index: number) => (
                      <motion.span
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        className={`text-xs px-3 py-1 rounded-full transition-all duration-300 ${
                          isActive && !locked
                            ? 'bg-black text-white shadow-md'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {example}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <DialogFooter className="mt-8 flex gap-4">
            <Button
              variant="outline"
              onClick={closeSettings}
              className="flex-1 py-3"
            >
              {t('settings.cancel')}
            </Button>
            <Button
              onClick={() => {
                savePreferences(preferences);
                const level = preferences.analytics ? 'full' : 'anonymous';
                window.SonnaAnalytics?.setConsent(level, {
                  analytics: preferences.analytics,
                  marketing: preferences.marketing,
                });
              }}
              className="flex-1 py-3 bg-black text-white hover:bg-gray-800"
            >
              <Check className="w-4 h-4 mr-2" />
              {t('settings.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
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
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });

  useEffect(() => {
    const consent = analytics.getPreferences();
    if (!consent) {
      // First visit: auto-open the card
      setTimeout(() => setCardOpen(true), 800);
    } else {
      setPreferences(consent);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    analytics.setPreferences(prefs);
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

  return (
    <>
      {/* ── Blur backdrop (visible when card is open) ── */}
      <AnimatePresence>
        {cardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-sm bg-black/10"
            style={{ zIndex: 9998 }}
            onClick={() => setCardOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Consent card — anchored above the FAB ── */}
      <AnimatePresence>
        {cardOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5"
            style={{ zIndex: 9999 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary rounded-xl flex-shrink-0">
                <Cookie className="w-4 h-4 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-sm flex-1 leading-tight">
                {t('banner.title')}
              </h3>
              <button
                onClick={() => setCardOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {t('banner.description')}
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={acceptAll}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="w-3.5 h-3.5 mr-2" />
                {t('banner.acceptAll')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={rejectNonEssential}
                className="w-full"
              >
                <X className="w-3.5 h-3.5 mr-2" />
                {t('banner.reject')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setCardOpen(false); setShowSettings(true); }}
                className="w-full text-gray-500 hover:text-gray-700"
              >
                <Settings className="w-3.5 h-3.5 mr-2" />
                {t('banner.customize')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB ── */}
      <button
        onClick={() => setCardOpen(prev => !prev)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ zIndex: 9999 }}
        aria-label="Cookie preferences"
      >
        <Cookie className="w-6 h-6" />
      </button>

      {/* ── Settings Modal ── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
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
              onClick={() => setShowSettings(false)}
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
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { 
  Cookie, 
  Settings, 
  Shield, 
  BarChart3, 
  Target,
  X,
  Check
} from 'lucide-react';
import { analytics } from '../services/analytics/AnalyticsService';
import type { CookiePreferences } from '../types/analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from './ui/dialog';

export function CookieConsent() {
  const { t } = useTranslation('cookies');
  const [showBanner, setShowBanner] = useState(false);
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
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      setPreferences(consent);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    analytics.setPreferences(prefs);
    setShowBanner(false);
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
  };

  const rejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
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
      {/* Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black shadow-2xl z-[200]"
          >
            <div className="container mx-auto px-4 py-6 max-w-7xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-black rounded-xl flex-shrink-0">
                    <Cookie className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      {t('banner.title')}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t('banner.description')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="flex-1 lg:flex-none min-w-[140px]"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t('banner.customize')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectNonEssential}
                    className="flex-1 lg:flex-none min-w-[140px]"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('banner.reject')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="flex-1 lg:flex-none min-w-[140px] bg-black text-white hover:bg-gray-800"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {t('banner.acceptAll')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
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
              onClick={() => savePreferences(preferences)}
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
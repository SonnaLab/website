import React, { useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Calendar, Zap, Users, Lightbulb, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';
import { useModal } from './providers/ModalProvider';
import { useServiceSearch } from '../hooks/useServiceSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectType } from '../types/consultation';

export function HeroSection() {
  const { t } = useTranslation('hero');
  const { openConsultationModal } = useModal();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const {
    searchQuery,
    showSuggestions,
    filteredSuggestions,
    handleQueryChange,
    clearSearch,
    closeSuggestions,
  } = useServiceSearch();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        closeSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const hasQuery = searchQuery.trim().length > 0;

    if (hasQuery && filteredSuggestions.length > 0) {
      openConsultationModal(filteredSuggestions[0].id as ProjectType);
    } else {
      openConsultationModal();
    }
    clearSearch();
  };

  const handleSuggestionClick = (serviceId: ProjectType) => {
    openConsultationModal(serviceId);
    clearSearch();
  };

  return (
    <section id="home" className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-black">
                {t('title')}
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                {t('description')}
              </p>
            </div>

            {/* Quick Project Search */}
            <div ref={searchRef} className="relative">
              <div className="bg-white p-6 rounded-2xl shadow-lg border">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
                    <Input
                      placeholder={t('search.placeholder')}
                      className="pl-10 pr-10 h-12 border-gray-200"
                      value={searchQuery}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      onFocus={() => searchQuery.length > 0 && handleQueryChange(searchQuery)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="h-12 px-8 bg-black hover:bg-gray-800"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    {t('cta.primary')}
                  </Button>
                </form>
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 z-50"
                  >
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
                      {filteredSuggestions.length > 0 ? (
                        <div className="py-2">
                          {filteredSuggestions.map((service, index) => {
                            const Icon = service.icon;
                            return (
                              <motion.button
                                key={service.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleSuggestionClick(service.id as ProjectType)}
                                className="w-full px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors text-left group"
                              >
                                <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-black">
                                    {service.name}
                                  </h4>
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {service.description}
                                  </p>
                                </div>
                                <Search className="w-4 h-4 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-6 py-8 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-900 font-medium mb-1">
                            {t('search.noResults')} "{searchQuery}"
                          </p>
                          <p className="text-sm text-gray-500">
                            {t('search.tryOther')}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gray-700" />
                <span>{t('stats.projects')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-700" />
                <span>{t('stats.clients')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-gray-700" />
                <span>{t('stats.expertise')}</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-tr from-gray-100 to-gray-50 p-8">
              <ImageWithFallback
                src="/images/fromIdeaToInovation.png"
                alt="De l'idée à l'innovation - Espace de travail digital moderne"
                className="w-full h-96 object-cover rounded-xl"
              />

              {/* Floating Stats Cards */}
              <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg border">
                <div className="text-2xl font-bold text-black">20+</div>
                <div className="text-sm text-gray-600">{t('stats.projects')}</div>
              </div>

              <div className="absolute -top-4 -right-4 bg-white p-4 rounded-xl shadow-lg border">
                <div className="text-2xl font-bold text-gray-700">
                  +{new Date().getFullYear() - 2022 < 10 ? '03' : '10'}
                </div>
                <div className="text-sm text-gray-600">{t('stats.expertise')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Smartphone, Bot, Lightbulb, Tally1Icon, Sparkles } from 'lucide-react';
import { ProjectType } from '@/types/consultation';

export interface ServiceSuggestion {
  id: ProjectType;
  name: string;
  description: string;
  keywords: string[];
  icon: typeof Globe;
}

export function useServiceSearch() {
  const { t } = useTranslation('hero');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const services: ServiceSuggestion[] = [
    {
      id: 'web',
      name: t('services.web.title'),
      description: t('services.web.description'),
      keywords: ['web', 'site', 'website', 'application', 'saas', 'pwa', 'ecommerce', 'boutique', 'vitrine'],
      icon: Globe,
    },
    {
      id: 'mobile',
      name: t('services.mobile.title'),
      description: t('services.mobile.description'),
      keywords: ['mobile', 'app', 'application', 'ios', 'android', 'react native', 'smartphone', 'tablette'],
      icon: Smartphone,
    },
    {
      id: 'ai',
      name: t('services.ai.title'),
      description: t('services.ai.description'),
      keywords: ['ai', 'ia', 'intelligence', 'artificielle', 'chatbot', 'bot', 'ml', 'machine learning', 'automatisation', 'automation'],
      icon: Bot,
    },
    {
      id: 'consulting',
      name: t('services.consulting.title'),
      description: t('services.consulting.description'),
      keywords: ['audit', 'conseil', 'consulting', 'expertise', 'stratégie', 'strategy', 'accompagnement'],
      icon: Lightbulb,
    },
    {
        id: 'other',
        name: t('services.other.title'),
        description: t('services.other.description'),
        keywords: ['autre', 'divers', 'varié'],
        icon: Sparkles,
    }
  ];


  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSuggestions = normalizedQuery.length === 0
    ? []
    : services.filter(service =>
        service.keywords.some(keyword =>
          keyword.toLowerCase().includes(normalizedQuery)
        ) ||
        service.name.toLowerCase().includes(normalizedQuery)
      );

  const handleQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSuggestions(false);
  }, []);

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  return {
    searchQuery,
    showSuggestions,
    filteredSuggestions,
    services,
    handleQueryChange,
    clearSearch,
    closeSuggestions,
  };
}
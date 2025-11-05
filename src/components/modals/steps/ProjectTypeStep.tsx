import React from 'react';
import { Globe, Smartphone, MessageCircle, Sparkles, MoreHorizontal } from 'lucide-react';
import { ProjectType } from '../../../types/consultation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface ProjectTypeStepProps {
  selectedType?: ProjectType;
  onSelect: (type: ProjectType) => void;
}


export function ProjectTypeStep({ selectedType, onSelect }: ProjectTypeStepProps) {
  const { t } = useTranslation('consultation');
  const projectTypes = [
    {
      type: 'web' as ProjectType,
      icon: Globe,
    },
    {
      type: 'mobile' as ProjectType,
      icon: Smartphone,
    },
    {
      type: 'consulting' as ProjectType,
      icon: MessageCircle,
    },
    {
      type: 'ai' as ProjectType,
      icon: Sparkles,
    },
    {
      type: 'other' as ProjectType,
      icon: MoreHorizontal,
    },
  ];

  return (
    <div className="space-y-8 p-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('projectType.title')}
        </h2>
        <p className="text-gray-600">
          {t('projectType.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectTypes.map((project) => {
          const Icon = project.icon;
          const isSelected = selectedType === project.type;

          return (
            <motion.button
              key={project.type}
              onClick={() => onSelect(project.type)}
              className={`relative p-6 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-black bg-black text-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    isSelected ? 'bg-white/20' : 'bg-gray-100'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-black'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {t(`projectType.${project.type}`)}
                  </h3>
                  <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
                    {t(`projectType.${project.type}Desc`)}
                  </p>
                </div>
              </div>

              {isSelected && (
                <motion.div
                  className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <div className="w-3 h-3 bg-black rounded-full" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

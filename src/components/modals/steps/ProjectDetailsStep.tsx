import React from 'react';
import { Textarea } from '../../ui/textarea';
import { ProjectDetails, Budget, Timeline } from '../../../types/consultation';
import { EuroIcon, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProjectDetailsStepProps {
  projectDetails: ProjectDetails;
  onChange: (details: Partial<ProjectDetails>) => void;
}

const budgets: { value: Budget }[] = [
  { value: 'small' },
  { value: 'medium' },
  { value: 'large' },
  { value: 'enterprise' },
];

const timelines: { value: Timeline }[] = [
  { value: 'urgent' },
  { value: '1-3months' },
  { value: '3-6months' },
  { value: '6months+' },
];

export function ProjectDetailsStep({ projectDetails, onChange }: ProjectDetailsStepProps) {
  const { t } = useTranslation('consultation');

  return (
    <div className="space-y-8 p-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('details.title')}
        </h2>
        <p className="text-gray-600">
          {t('details.subtitle')}
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">
          {t('details.descriptionLabel')} <span className="text-red-500">{t('details.descriptionRequired')}</span>
        </label>
        <Textarea
          value={projectDetails.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('details.descriptionPlaceholder')}
          className="min-h-[120px] resize-none"
          required
        />
        <p className="text-xs text-gray-500">
          {t('details.charactersCount', { count: projectDetails.description.length })}
        </p>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <EuroIcon className="w-4 h-4" />
          {t('details.budgetLabel')}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {budgets.map((budget) => (
            <button
              key={budget.value}
              onClick={() => onChange({ budget: budget.value })}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                projectDetails.budget === budget.value
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm mb-1">
                {t(`details.budget.${budget.value}`)}
              </div>
              <div className={`text-xs ${projectDetails.budget === budget.value ? 'text-white/80' : 'text-gray-500'}`}>
                {t(`details.budget.${budget.value}Desc`)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Clock className="w-4 h-4" />
          {t('details.timelineLabel')}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timelines.map((timeline) => (
            <button
              key={timeline.value}
              onClick={() => onChange({ timeline: timeline.value })}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                projectDetails.timeline === timeline.value
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm mb-1">
                {t(`details.timeline.${timeline.value}`)}
              </div>
              <div className={`text-xs ${projectDetails.timeline === timeline.value ? 'text-white/80' : 'text-gray-500'}`}>
                {t(`details.timeline.${timeline.value}Desc`)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
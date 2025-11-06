import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { LegalSection } from '../../components/legal/LegalSection';
import { LegalList } from '../../components/legal/LegalList';
import { Award } from 'lucide-react';

export default function QualityPolicy() {
  const { t } = useTranslation('legal');

  const quality = t('quality.sections', { returnObjects: true }) as any;

  return (
    <LegalPageLayout
      title={t('quality.title')}
      lastUpdate={t('quality.lastUpdate')}
    >
      {/* Commitment */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {quality.commitment.title}
            </h2>
            <p className="text-gray-700">{quality.commitment.content}</p>
          </div>
        </div>
      </div>

      {/* Standards */}
      <LegalSection title={quality.standards.title}>
        <LegalList items={quality.standards.items} variant="check" />
      </LegalSection>

      {/* Process */}
      <LegalSection title={quality.process.title}>
        <p className="mb-4">{quality.process.content}</p>
        <LegalList items={quality.process.items} variant="check" />
      </LegalSection>

      {/* Improvement */}
      <LegalSection title={quality.improvement.title}>
        <p>{quality.improvement.content}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
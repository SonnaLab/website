import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '@/components/public/legal/LegalPageLayout';
import { LegalSection } from '@/components/public/legal/LegalSection';
import { LegalList } from '@/components/public/legal/LegalList';
import { Cookie, ExternalLink, Settings } from 'lucide-react';

export default function CookiesPolicy() {
  const { t } = useTranslation('legal');

  const cookies = t('cookies.sections', { returnObjects: true }) as any;

  return (
    <LegalPageLayout
      title={t('cookies.title')}
      lastUpdate={t('cookies.lastUpdate')}
    >
      {/* Introduction */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-600 rounded-xl">
            <Cookie className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {cookies.intro.title}
            </h2>
            <p className="text-gray-700">{cookies.intro.content}</p>
          </div>
        </div>
      </div>

      {/* Types of Cookies */}
      <LegalSection title={cookies.types.title}>
        {/* Essential Cookies */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            {cookies.types.essential.title}
          </h3>
          <p className="text-gray-700 ml-4">{cookies.types.essential.content}</p>
        </div>

        {/* Analytics Cookies */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            {cookies.types.analytics.title}
          </h3>
          <p className="text-gray-700 ml-4">{cookies.types.analytics.content}</p>
        </div>

        {/* Marketing Cookies */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            {cookies.types.marketing.title}
          </h3>
          <p className="text-gray-700 ml-4">{cookies.types.marketing.content}</p>
        </div>
      </LegalSection>

      {/* Cookie Management */}
      <LegalSection title={cookies.management.title}>
        <p className="mb-4">{cookies.management.content}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <Settings className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <LegalList items={cookies.management.items} variant="check" />
            </div>
          </div>
        </div>
      </LegalSection>

      {/* Duration */}
      <LegalSection title={cookies.duration.title}>
        <LegalList items={cookies.duration.items} variant="bullet" />
      </LegalSection>

      {/* Opt-Out */}
      <LegalSection title={cookies.optOut.title}>
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="font-semibold text-gray-900 mb-2">Google Analytics</p>
            <a 
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              {cookies.optOut.google}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="font-semibold text-gray-900 mb-2">Facebook</p>
            <a 
              href="https://www.facebook.com/settings?tab=ads"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              {cookies.optOut.facebook}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
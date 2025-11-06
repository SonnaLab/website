import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { LegalSection } from '../../components/legal/LegalSection';
import { LegalList } from '../../components/legal/LegalList';
import { Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  const { t } = useTranslation('legal');

  const privacy = t('privacy.sections', { returnObjects: true }) as any;

  return (
    <LegalPageLayout
      title={t('privacy.title')}
      lastUpdate={t('privacy.lastUpdate')}
    >
      {/* Introduction */}
      <LegalSection title={privacy.intro.title}>
        <p>{privacy.intro.content}</p>
      </LegalSection>

      {/* Data Collection */}
      <LegalSection title={privacy.dataCollection.title}>
        <p>{privacy.dataCollection.content}</p>
        <LegalList items={privacy.dataCollection.items} variant="check" />
      </LegalSection>

      {/* Data Usage */}
      <LegalSection title={privacy.dataUsage.title}>
        <p>{privacy.dataUsage.content}</p>
        <LegalList items={privacy.dataUsage.items} variant="check" />
      </LegalSection>

      {/* Data Protection */}
      <LegalSection title={privacy.dataProtection.title}>
        <p>{privacy.dataProtection.content}</p>
      </LegalSection>

      {/* Rights */}
      <LegalSection title={privacy.rights.title}>
        <p>{privacy.rights.content}</p>
        <LegalList items={privacy.rights.items} variant="check" />
      </LegalSection>

      {/* Contact */}
      <LegalSection title={privacy.contact.title}>
        <p className="mb-4">{privacy.contact.content}</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <a 
              href={`mailto:${privacy.contact.email}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {privacy.contact.email}
            </a>
          </div>
          <p className="text-sm text-gray-600">
            {privacy.contact.dpo}
          </p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
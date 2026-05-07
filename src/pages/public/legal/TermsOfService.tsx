import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { LegalSection } from '../../components/legal/LegalSection';
import { ExternalLink } from 'lucide-react';

export default function TermsOfService() {
  const { t } = useTranslation('legal');

  const terms = t('terms.sections', { returnObjects: true }) as any;

  return (
    <LegalPageLayout
      title={t('terms.title')}
      lastUpdate={t('terms.lastUpdate')}
    >
      {/* Acceptance */}
      <LegalSection title={terms.acceptance.title}>
        <p>{terms.acceptance.content}</p>
      </LegalSection>

      {/* Services */}
      <LegalSection title={terms.services.title}>
        <p>{terms.services.content}</p>
      </LegalSection>

      {/* License */}
      <LegalSection title={terms.license.title}>
        <p>{terms.license.content}</p>
      </LegalSection>

      {/* Intellectual Property */}
      <LegalSection title={terms.intellectualProperty.title}>
        <p className="mb-3">{terms.intellectualProperty.content}</p>
        <Link 
          to="/legal/intellectual-property"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          {terms.intellectualProperty.link}
        </Link>
      </LegalSection>

      {/* Liability */}
      <LegalSection title={terms.liability.title}>
        <p>{terms.liability.content}</p>
      </LegalSection>

      {/* Termination */}
      <LegalSection title={terms.termination.title}>
        <p>{terms.termination.content}</p>
      </LegalSection>

      {/* Law */}
      <LegalSection title={terms.law.title}>
        <p>{terms.law.content}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
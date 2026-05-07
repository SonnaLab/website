import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '@/components/public/legal/LegalPageLayout';
import { LegalSection } from '@/components/public/legal/LegalSection';
import { Shield, Mail, FileText, Code, LucideCopyright, AlertTriangle } from 'lucide-react';

export default function IntellectualProperty() {
  const { t } = useTranslation('legal');

  const ip = t('intellectualProperty.sections', { returnObjects: true }) as any;

  return (
    <LegalPageLayout
      title={t('intellectualProperty.title')}
      lastUpdate={t('intellectualProperty.lastUpdate')}
    >
      {/* Ownership */}
      <LegalSection title={ip.ownership.title}>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-3">{ip.ownership.content}</p>
              <p className="text-gray-700">{ip.ownership.protection}</p>
            </div>
          </div>
        </div>
      </LegalSection>

      {/* License */}
      <LegalSection title={ip.license.title}>
        <div className="space-y-4">
          <div className="bg-white border-l-4 border-blue-600 p-6 rounded-r-xl">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-gray-700 mb-3">{ip.license.content}</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span>{ip.license.restrictions}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LegalSection>

      {/* User Data */}
      <LegalSection title={ip.userData.title}>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {ip.userData.ownership}
            </p>
          </div>
          <p className="text-gray-700">{ip.userData.grant}</p>
        </div>
      </LegalSection>

      {/* Open Source */}
      <LegalSection title={ip.openSource.title}>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-gray-600 mt-1" />
            <p className="text-gray-700">{ip.openSource.content}</p>
          </div>
        </div>
      </LegalSection>

      {/* Trademarks */}
      <LegalSection title={ip.trademarks.title}>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl">
              <LucideCopyright className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-400">{ip.trademarks.content}</p>
            </div>
          </div>
        </div>
      </LegalSection>

      {/* Infringement */}
      <LegalSection title={ip.infringement.title}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
            <p className="text-gray-700">{ip.infringement.content}</p>
          </div>
        </div>
      </LegalSection>

      {/* Contact */}
      <LegalSection title={ip.contact.title}>
        <p className="mb-4">{ip.contact.content}</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <a 
              href={`mailto:${ip.contact.email}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {ip.contact.email}
            </a>
          </div>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
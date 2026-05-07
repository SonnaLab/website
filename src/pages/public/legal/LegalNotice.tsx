import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '@/components/public/legal/LegalPageLayout';
import { LegalSection } from '@/components/public/legal/LegalSection';
import { Building2, User, Server, Palette, Mail, Phone, MapPin } from 'lucide-react';

export default function LegalNotice() {
  const { t } = useTranslation('legal');

  const notice = t('notice.sections', { returnObjects: true }) as any;

  return (
    <LegalPageLayout
      title={t('notice.title')}
      lastUpdate={t('notice.lastUpdate')}
    >
      {/* Editor */}
      <LegalSection title={notice.editor.title}>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-gray-600 mt-1" />
            <div>
              <p className="font-semibold text-gray-900">{notice.editor.company}</p>
              <p className="text-sm text-gray-600">{notice.editor.legalForm}</p>
              <p className="text-sm text-gray-600">{notice.editor.capital}</p>
              <p className="text-sm text-gray-600">{notice.editor.rcs}</p>
              <p className="text-sm text-gray-600">{notice.editor.siret}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-600 mt-1" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">{notice.editor.address}</p>
              <p className="text-sm text-gray-600">{notice.editor.addressLine1}</p>
              <p className="text-sm text-gray-600">{notice.editor.addressLine2}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-600">{notice.editor.phone}</p>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <a 
              href="mailto:contact@sonnalab.com"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {notice.editor.email}
            </a>
          </div>
        </div>
      </LegalSection>

      {/* Director */}
      <LegalSection title={notice.director.title}>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-600 mt-1" />
            <div>
              <p className="font-semibold text-gray-900">{notice.director.name}</p>
              <p className="text-sm text-gray-600">{notice.director.role}</p>
            </div>
          </div>
        </div>
      </LegalSection>

      {/* Hosting */}
      <LegalSection title={notice.hosting.title}>
        <p className="mb-3">{notice.hosting.provider}</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-gray-600 mt-1" />
            <div>
              <p className="font-semibold text-gray-900">{notice.hosting.name}</p>
              <p className="text-sm text-gray-600">{notice.hosting.address}</p>
            </div>
          </div>
        </div>
      </LegalSection>

      {/* Credits */}
      <LegalSection title={notice.credits.title}>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-600">{notice.credits.design}</p>
          </div>
          <p className="text-sm text-gray-600 ml-8">{notice.credits.icons}</p>
          <p className="text-sm text-gray-600 ml-8">{notice.credits.images}</p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
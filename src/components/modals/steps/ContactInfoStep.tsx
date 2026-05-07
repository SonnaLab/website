import { Input } from '@/components/ui/input';
import { ContactInfo } from '@/types/consultation';
import { User, Mail, Phone, Building, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContactInfoStepProps {
  contactInfo: ContactInfo;
  onChange: (info: Partial<ContactInfo>) => void;
}

export function ContactInfoStep({ contactInfo, onChange }: ContactInfoStepProps) {
  const { t } = useTranslation('consultation');

  return (
    <div className="space-y-8 p-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('contact.title')}
        </h2>
        <p className="text-gray-600">
          {t('contact.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prénom */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <User className="w-4 h-4" />
            {t('contact.firstName')} <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={contactInfo.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            placeholder={t('contact.firstNamePlaceholder')}
            required
          />
        </div>

        {/* Nom */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <User className="w-4 h-4" />
            {t('contact.lastName')} <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={contactInfo.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder={t('contact.lastNamePlaceholder')}
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Mail className="w-4 h-4" />
            {t('contact.email')} <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={contactInfo.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder={t('contact.emailPlaceholder')}
            required
          />
        </div>

        {/* Téléphone */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Phone className="w-4 h-4" />
            {t('contact.phone')} <span className="text-red-500">*</span>
          </label>
          <Input
            type="tel"
            value={contactInfo.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder={t('contact.phonePlaceholder')}
            required
          />
        </div>

        {/* Entreprise (optionnel) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Building className="w-4 h-4" />
            {t('contact.company')}
          </label>
          <Input
            type="text"
            value={contactInfo.company || ''}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder={t('contact.companyPlaceholder')}
          />
        </div>

        {/* Fonction (optionnel) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Briefcase className="w-4 h-4" />
            {t('contact.role')}
          </label>
          <Input
            type="text"
            value={contactInfo.role || ''}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder={t('contact.rolePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}
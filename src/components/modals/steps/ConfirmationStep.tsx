import { ConsultationFormData } from '@/types/consultation';
import { Check, Mail, Phone, User, Building, Briefcase, DollarSign, Clock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface ConfirmationStepProps {
  formData: Partial<ConsultationFormData>;
  isSubmitting?: boolean;
  isSuccess?: boolean;
}

export function ConfirmationStep({ formData, isSubmitting, isSuccess }: ConfirmationStepProps) {
  const { t } = useTranslation('consultation');

  if (isSuccess) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <Check className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {t('confirmation.successTitle')}
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          {t('confirmation.successDesc')}
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-blue-800">
            {t('confirmation.emailSent')} <strong>{formData.contactInfo?.email}</strong>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('confirmation.title')}
        </h2>
        <p className="text-gray-600">
          {t('confirmation.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Type de projet */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('confirmation.projectTypeLabel')}
          </h3>
          <p className="text-gray-700">
            {formData.projectDetails?.type && t(`projectType.${formData.projectDetails.type}`)}
          </p>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">{t('confirmation.descriptionLabel')}</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {formData.projectDetails?.description}
          </p>
        </div>

        {/* Budget & Timeline */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('confirmation.budgetLabel')}
            </h3>
            <p className="text-gray-700">
              {formData.projectDetails?.budget && t(`details.budget.${formData.projectDetails.budget}`)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('confirmation.timelineLabel')}
            </h3>
            <p className="text-gray-700">
              {formData.projectDetails?.timeline && t(`details.timeline.${formData.projectDetails.timeline}`)}
            </p>
          </div>
        </div>

        {/* Informations de contact */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('confirmation.contactLabel')}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              <span>{formData.contactInfo?.firstName} {formData.contactInfo?.lastName}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{formData.contactInfo?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{formData.contactInfo?.phone}</span>
            </div>
            {formData.contactInfo?.company && (
              <div className="flex items-center gap-2 text-gray-700">
                <Building className="w-4 h-4 text-gray-400" />
                <span>{formData.contactInfo.company}</span>
              </div>
            )}
            {formData.contactInfo?.role && (
              <div className="flex items-center gap-2 text-gray-700">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span>{formData.contactInfo.role}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-3 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            <span>{t('confirmation.sending')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { X, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useModal } from '../providers/ModalProvider';
import { useConsultationModal } from './hooks/useConsultationModal';
import { StepIndicator } from './steps/StepIndicator';
import { ProjectTypeStep } from './steps/ProjectTypeStep';
import { ProjectDetailsStep } from './steps/ProjectDetailsStep';
import { ContactInfoStep } from './steps/ContactInfoStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getApiUrl, API_CONFIG } from '../../config/api';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useTranslation } from 'react-i18next';

const TOTAL_STEPS = 4;

export function ConsultationModal() {
  const { t } = useTranslation('consultation');
  const { isConsultationModalOpen, closeConsultationModal } = useModal();
  const {
    currentStep,
    formData,
    updateProjectDetails,
    updateContactInfo,
    nextStep,
    prevStep,
    resetForm,
  } = useConsultationModal();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    closeConsultationModal();
    setTimeout(() => {
      resetForm();
      setIsSuccess(false);
      setError(null);
    }, 300);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return formData.projectDetails?.type !== undefined;
      case 2:
        return (
          formData.projectDetails?.description &&
          formData.projectDetails.description.length >= 20
        );
      case 3:
        return (
          formData.contactInfo?.firstName &&
          formData.contactInfo?.lastName &&
          formData.contactInfo?.email &&
          formData.contactInfo?.phone &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactInfo.email)
        );
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        projectType: formData.projectDetails?.type,
        description: formData.projectDetails?.description,
        budget: formData.projectDetails?.budget,
        timeline: formData.projectDetails?.timeline,
        firstName: formData.contactInfo?.firstName,
        lastName: formData.contactInfo?.lastName,
        email: formData.contactInfo?.email,
        phone: formData.contactInfo?.phone,
        company: formData.contactInfo?.company || null,
        role: formData.contactInfo?.role || null,
      };

      const response = await axios.post(
        getApiUrl(API_CONFIG.ENDPOINTS.NEW_PROJECT),
        payload,
        {
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setIsSuccess(true);
      } else {
        throw new Error(t('errors.genericError'));
      }
    } catch (err) {
      console.error('Error submitting consultation:', err);
      
      if (axios.isAxiosError(err)) {
        if (err.response) {
          setError(t('errors.serverError', { 
            status: err.response.status, 
            message: err.response.data?.message || t('errors.genericError')
          }));
        } else if (err.request) {
          setError(t('errors.networkError'));
        } else {
          setError(t('errors.genericError'));
        }
      } else {
        setError(t('errors.unexpectedError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const variants = {
      enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
      }),
      center: {
        x: 0,
        opacity: 1,
      },
      exit: (direction: number) => ({
        x: direction < 0 ? 300 : -300,
        opacity: 0,
      }),
    };

    const stepComponents = {
      1: (
        <ProjectTypeStep
          selectedType={formData.projectDetails?.type!}
          onSelect={(type) => updateProjectDetails({ type })}
        />
      ),
      2: (
        <ProjectDetailsStep
          projectDetails={formData.projectDetails!}
          onChange={updateProjectDetails}
        />
      ),
      3: (
        <ContactInfoStep
          contactInfo={formData.contactInfo!}
          onChange={updateContactInfo}
        />
      ),
      4: (
        <ConfirmationStep
          formData={formData}
          isSubmitting={isSubmitting}
          isSuccess={isSuccess}
        />
      ),
    };

    return (
        <div className="relative overflow-y-auto overflow-x-hidden max-h-[calc(90vh-200px)] px-6 py-8">
          <div className="relative overflow-hidden min-h-[460px]">
            <AnimatePresence mode="wait" custom={currentStep}>
              <motion.div
                key={currentStep}
                custom={currentStep}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="w-full"
              >
                {stepComponents[currentStep as keyof typeof stepComponents]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
    );
  };

  return (
    <Dialog open={isConsultationModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
        {/* Accessibility - Hidden Title & Description */}
        <VisuallyHidden>
          <DialogTitle>
            {isSuccess 
              ? t('accessibility.modalTitleSuccess')
              : t('accessibility.modalTitle', { step: currentStep, total: TOTAL_STEPS })
            }
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? t('accessibility.modalDescriptionSuccess')
              : t('accessibility.modalDescription')
            }
          </DialogDescription>
        </VisuallyHidden>

        {/* Step Indicator */}
        {!isSuccess && <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-6 py-8">
          {renderStep()}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!isSuccess && (
          <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  className="gap-2"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('cta.prev')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < TOTAL_STEPS && (
                <Button
                  onClick={nextStep}
                  disabled={!canGoNext() || isSubmitting}
                  className="gap-2 bg-black hover:bg-gray-800"
                >
                  {t('cta.next')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {currentStep === TOTAL_STEPS && (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2 bg-black hover:bg-gray-800"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('cta.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('cta.send')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Success Footer */}
        {isSuccess && (
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-center">
            <Button onClick={handleClose} className="bg-black hover:bg-gray-800">
              {t('cta.close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
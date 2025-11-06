import { useState, useCallback, useEffect } from 'react';
import { ConsultationFormData, ModalStep } from '../types/consultation';
import { useModal } from '../components/providers/ModalProvider';

const initialFormData: Partial<ConsultationFormData> = {
  projectDetails: {
    type: undefined,
    description: '',
    budget: undefined,
    timeline: undefined,
    features: [],
  },
  contactInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    role: '',
  },
};

export function useConsultationModal() {
  const { preselectedProjectType, shouldSkipStep1, isConsultationModalOpen } = useModal();
  const [currentStep, setCurrentStep] = useState<ModalStep>(1);
  const [formData, setFormData] = useState<Partial<ConsultationFormData>>(initialFormData);

  useEffect(() => {
    if (preselectedProjectType) {
      setFormData(prev => ({
        ...prev,
        projectDetails: {
          ...prev.projectDetails!,
          type: preselectedProjectType,
        },
      }));
    }
  }, [preselectedProjectType]);

  useEffect(() => {
    if (isConsultationModalOpen) {
      if (shouldSkipStep1 && preselectedProjectType) {
        setCurrentStep(2);
      } else {
        console.log('🏁 Démarrage normal au Step 1');
        setCurrentStep(1);
      }
    }
  }, [isConsultationModalOpen]);

  const updateProjectDetails = useCallback((details: Partial<ConsultationFormData['projectDetails']>) => {
    setFormData(prev => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails!,
        ...details,
      },
    }));
  }, []);

  const updateContactInfo = useCallback((info: Partial<ConsultationFormData['contactInfo']>) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo!,
        ...info,
      },
    }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4) as ModalStep);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1) as ModalStep);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
  }, []);

  return {
    currentStep,
    formData,
    updateProjectDetails,
    updateContactInfo,
    nextStep,
    prevStep,
    resetForm,
  };
}
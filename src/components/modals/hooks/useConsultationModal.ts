import { useState } from 'react';
import { ConsultationFormData, ModalStep, ProjectDetails, ContactInfo } from '../../../types/consultation';

export function useConsultationModal() {
  const [currentStep, setCurrentStep] = useState<ModalStep>(1);
  const [formData, setFormData] = useState<Partial<ConsultationFormData>>({
    projectDetails: {
      type: 'web',
      description: '',
      budget: 'medium',
      timeline: '1-3months',
      features: [],
    },
    contactInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  const updateProjectDetails = (details: Partial<ProjectDetails>) => {
    setFormData(prev => ({
      ...prev,
      projectDetails: { ...prev.projectDetails!, ...details },
    }));
  };

  const updateContactInfo = (info: Partial<ContactInfo>) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: { ...prev.contactInfo!, ...info },
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as ModalStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as ModalStep);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      projectDetails: {
        type: 'web',
        description: '',
        budget: 'medium',
        timeline: '1-3months',
        features: [],
      },
      contactInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      },
    });
  };

  return {
    currentStep,
    formData,
    updateProjectDetails,
    updateContactInfo,
    nextStep,
    prevStep,
    resetForm,
    setCurrentStep,
  };
}
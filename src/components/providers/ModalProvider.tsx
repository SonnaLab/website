import React, { createContext, useContext, useState, useCallback } from 'react';
import { ProjectType } from '../../types/consultation';

interface ModalContextType {
  isConsultationModalOpen: boolean;
  openConsultationModal: (preselectedType?: ProjectType) => void;
  closeConsultationModal: () => void;
  preselectedProjectType: ProjectType | null;
  shouldSkipStep1: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const isValidProjectType = (value: any): value is ProjectType => {
  return typeof value === 'string' && 
         ['web', 'mobile', 'consulting', 'ai', 'other'].includes(value);
};

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [preselectedProjectType, setPreselectedProjectType] = useState<ProjectType | null>(null);
  const [shouldSkipStep1, setShouldSkipStep1] = useState(false);

  const openConsultationModal = useCallback((preselectedType?: ProjectType) => {
    if (preselectedType && isValidProjectType(preselectedType)) {
      setPreselectedProjectType(preselectedType);
      setShouldSkipStep1(true);
    } else {
      setPreselectedProjectType(null);
      setShouldSkipStep1(false);
    }
    
    setIsConsultationModalOpen(true);
  }, []);

  const closeConsultationModal = useCallback(() => {
    setIsConsultationModalOpen(false);
    
    setTimeout(() => {
      setPreselectedProjectType(null);
      setShouldSkipStep1(false);
    }, 300);
  }, []);

  return (
    <ModalContext.Provider
      value={{
        isConsultationModalOpen,
        openConsultationModal,
        closeConsultationModal,
        preselectedProjectType,
        shouldSkipStep1,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

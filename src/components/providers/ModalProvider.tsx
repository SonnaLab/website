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

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [preselectedProjectType, setPreselectedProjectType] = useState<ProjectType | null>(null);
  const [shouldSkipStep1, setShouldSkipStep1] = useState(false);

  const openConsultationModal = useCallback((preselectedType?: ProjectType) => {
    if (preselectedType) {
      setPreselectedProjectType(preselectedType);
      setShouldSkipStep1(true);
    } else {
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
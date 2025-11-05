export type ProjectType = 'web' | 'mobile' | 'consulting' | 'ai' | 'other';

export type Budget = 'small' | 'medium' | 'large' | 'enterprise';

export type Timeline = 'urgent' | '1-3months' | '3-6months' | '6months+';

export interface ProjectDetails {
  type?: ProjectType;
  description: string;
  budget?: Budget;
  timeline?: Timeline;
  features?: string[];
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  role?: string;
}

export interface ConsultationFormData {
  projectDetails: ProjectDetails;
  contactInfo: ContactInfo;
  message?: string;
}

export type ModalStep = 1 | 2 | 3 | 4;
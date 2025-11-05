import { ConsultationFormData, ProjectType, Budget, Timeline } from '../types/consultation';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Accepte les formats: +33612345678, 0612345678, +33 6 12 34 56 78, etc.
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validateFormData(formData: Partial<ConsultationFormData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validation du type de projet
  if (!formData.projectDetails?.type) {
    errors.push('Veuillez sélectionner un type de projet');
  }

  // Validation de la description
  if (!formData.projectDetails?.description) {
    errors.push('Veuillez décrire votre projet');
  } else if (formData.projectDetails.description.length < 20) {
    errors.push('La description doit contenir au moins 20 caractères');
  } else if (formData.projectDetails.description.length > 500) {
    errors.push('La description ne peut pas dépasser 500 caractères');
  }

  // Validation des informations de contact
  if (!formData.contactInfo?.firstName) {
    errors.push('Le prénom est requis');
  }

  if (!formData.contactInfo?.lastName) {
    errors.push('Le nom est requis');
  }

  if (!formData.contactInfo?.email) {
    errors.push('L\'email est requis');
  } else if (!validateEmail(formData.contactInfo.email)) {
    errors.push('L\'email n\'est pas valide');
  }

  if (!formData.contactInfo?.phone) {
    errors.push('Le téléphone est requis');
  } else if (!validatePhone(formData.contactInfo.phone)) {
    errors.push('Le numéro de téléphone n\'est pas valide');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function formatPhoneNumber(phone: string): string {
  // Retire tous les espaces, points, tirets
  const cleaned = phone.replace(/[\s.-]/g, '');
  
  // Si commence par +33, remplace par 0
  if (cleaned.startsWith('+33')) {
    return '0' + cleaned.slice(3);
  }
  
  // Si commence par 0033, remplace par 0
  if (cleaned.startsWith('0033')) {
    return '0' + cleaned.slice(4);
  }
  
  return cleaned;
}

export function getProjectTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    web: 'Application Web',
    mobile: 'Application Mobile',
    consulting: 'Consulting',
    ai: 'Intelligence Artificielle',
    other: 'Autre projet',
  };
  return labels[type];
}

export function getBudgetLabel(budget: Budget): string {
  const labels: Record<Budget, string> = {
    small: '< 10K €',
    medium: '10K - 50K €',
    large: '50K - 150K €',
    enterprise: '> 150K €',
  };
  return labels[budget];
}

export function getTimelineLabel(timeline: Timeline): string {
  const labels: Record<Timeline, string> = {
    urgent: '< 1 mois',
    '1-3months': '1-3 mois',
    '3-6months': '3-6 mois',
    '6months+': '> 6 mois',
  };
  return labels[timeline];
}

export async function submitConsultation(formData: ConsultationFormData): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Validation avant envoi
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors.join(', '),
      };
    }

    // Format des données pour l'API
    const payload = {
      projectType: formData.projectDetails.type,
      description: formData.projectDetails.description,
      budget: formData.projectDetails.budget,
      timeline: formData.projectDetails.timeline,
      firstName: formData.contactInfo.firstName,
      lastName: formData.contactInfo.lastName,
      email: formData.contactInfo.email,
      phone: formatPhoneNumber(formData.contactInfo.phone),
      company: formData.contactInfo.company || null,
      role: formData.contactInfo.role || null,
      message: formData.message || null,
    };

    // Appel API (à adapter selon votre backend)
    const response = await fetch('/api/consultations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'envoi de la demande');
    }

    return {
      success: true,
      message: 'Votre demande a été envoyée avec succès',
    };
  } catch (error) {
    console.error('Error submitting consultation:', error);
    return {
      success: false,
      message: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}
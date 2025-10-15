import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne doit contenir que des lettres'),
  
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Adresse email invalide')
    .max(255, 'L\'email est trop long')
    .toLowerCase(),
  
  phone: z
    .string()
    .min(1, 'Le téléphone est requis')
    .regex(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
      'Numéro de téléphone invalide'
    )
    .min(10, 'Le numéro de téléphone est trop court')
    .max(20, 'Le numéro de téléphone est trop long'),
  
  company: z
    .string()
    .min(1, 'Le nom de l\'entreprise est requis')
    .min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
    .max(200, 'Le nom de l\'entreprise ne peut pas dépasser 200 caractères'),
  
  projectType: z
    .string()
    .min(1, 'Veuillez sélectionner un type de projet'),
  
  budget: z
    .string()
    .min(1, 'Veuillez sélectionner un budget'),
  
  message: z
    .string()
    .min(1, 'Le message est requis')
    .min(20, 'Le message doit contenir au moins 20 caractères')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères'),
});

export type ContactFormInputs = z.infer<typeof contactSchema>;
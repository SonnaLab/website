import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const createContactSchema = (t: (key: string, options?: any) => string) =>
  z.object({
    first_name: z
      .string()
      .min(1, t('contact:validation.name.required'))
      .min(2, t('contact:validation.name.min', { count: 2 }))
      .max(100, t('contact:validation.name.max', { count: 100 }))
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, t('contact:validation.name.regex')),

    last_name: z
      .string()
      .min(1, t('contact:validation.name.required'))
      .min(2, t('contact:validation.name.min', { count: 2 }))
      .max(100, t('contact:validation.name.max', { count: 100 }))
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, t('contact:validation.name.regex')),

    email: z
      .string()
      .min(1, t('contact:validation.email.required'))
      .email(t('contact:validation.email.invalid'))
      .max(255, t('contact:validation.email.max', { count: 255 })),

    phone: z
      .string()
      .min(1, t('contact:validation.phone.required'))
      .refine(
        (value) => isValidPhoneNumber(value),
        t('contact:validation.phone.invalid')
      ),

    company: z
      .string()
      .min(1, t('contact:validation.company.required'))
      .min(2, t('contact:validation.company.min', { count: 2 }))
      .max(200, t('contact:validation.company.max', { count: 200 })),

    role: z
      .string()
      .min(1, t('contact:validation.role.required')),

    project_type: z
      .string()
      .min(1, t('contact:validation.projectType.required')),

    budget: z
      .string()
      .min(1, t('contact:validation.budget.required')),

    message: z
      .string()
      .min(1, t('contact:validation.message.required'))
      .min(20, t('contact:validation.message.min', { count: 20 }))
      .max(2000, t('contact:validation.message.max', { count: 2000 })),
  });

export type ContactFormInputs = z.infer<ReturnType<typeof createContactSchema>>;
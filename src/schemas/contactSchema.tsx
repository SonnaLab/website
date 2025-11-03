import { z } from 'zod';

export const createContactSchema = (t: (key: string, options?: any) => string) =>
  z.object({
    name: z
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
      .regex(
        /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
        t('contact:validation.phone.invalid')
      )
      .min(10, t('contact:validation.phone.min', { count: 10 }))
      .max(20, t('contact:validation.phone.max', { count: 20 })),

    company: z
      .string()
      .min(1, t('contact:validation.company.required'))
      .min(2, t('contact:validation.company.min', { count: 2 }))
      .max(200, t('contact:validation.company.max', { count: 200 })),

    projectType: z
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
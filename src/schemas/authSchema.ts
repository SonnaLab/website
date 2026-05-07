import { z } from 'zod';
import type { TFunction } from 'i18next';

export const createSignInSchema = (t: TFunction) =>
  z.object({
    email:    z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });
export type SignInInputs = z.infer<ReturnType<typeof createSignInSchema>>;

export const createSignUpSchema = (t: TFunction) =>
  z.object({
    first_name: z.string().min(1, t('validation.firstNameRequired')),
    last_name:  z.string().min(1, t('validation.lastNameRequired')),
    email:      z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
    password:   z.string().min(8, t('validation.passwordTooShort')),
  });
export type SignUpInputs = z.infer<ReturnType<typeof createSignUpSchema>>;

export const createForgotPasswordSchema = (t: TFunction) =>
  z.object({
    email: z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
  });
export type ForgotPasswordInputs = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export const createResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password:        z.string().min(8, t('validation.passwordTooShort')),
      password_confirm: z.string().min(8, t('validation.passwordTooShort')),
    })
    .refine((d) => d.password === d.password_confirm, {
      path:    ['password_confirm'],
      message: t('resetPassword.errorMismatch'),
    });
export type ResetPasswordInputs = z.infer<ReturnType<typeof createResetPasswordSchema>>;

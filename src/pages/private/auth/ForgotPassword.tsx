import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { apiService } from '@/services/api';
import { createForgotPasswordSchema, ForgotPasswordInputs } from '@/schemas/authSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ForgotPasswordInputs>({ resolver: zodResolver(createForgotPasswordSchema(t)) });

  const onSubmit = async (data: ForgotPasswordInputs) => {
    try {
      await apiService.requestPasswordReset(data.email);
    } catch {
      // Always show neutral success to avoid leaking which emails exist.
    } finally {
      setSubmitted(true);
      toast.success(t('forgotPassword.successTitle'), { description: t('forgotPassword.successMessage') });
    }
  };

  return (
    <AuthLayout
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      footer={<Link to="/sign-in" className="text-foreground hover:underline">← {t('forgotPassword.back')}</Link>}
    >
      {submitted ? (
        <p className="text-sm text-muted-foreground">{t('forgotPassword.successMessage')}</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t('forgotPassword.email')}</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('forgotPassword.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

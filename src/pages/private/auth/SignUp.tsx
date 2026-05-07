import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { createSignUpSchema, SignUpInputs } from '@/schemas/authSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignUpPage() {
  const { t, i18n } = useTranslation('auth');
  const { signUp }  = useAuth();
  const navigate    = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<SignUpInputs>({ resolver: zodResolver(createSignUpSchema(t)) });

  const onSubmit = async (data: SignUpInputs) => {
    try {
      await signUp({ ...data, language: i18n.language });
      toast.success(t('signUp.successTitle'), { description: t('signUp.successMessage') });
      navigate('/member', { replace: true });
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      toast.error(status === 422 ? t('signUp.errorEmailTaken') : t('signUp.errorGeneric'));
    }
  };

  return (
    <AuthLayout
      title={t('signUp.title')}
      subtitle={t('signUp.subtitle')}
      footer={
        <p>
          {t('signUp.haveAccount')}{' '}
          <Link to="/sign-in" className="text-foreground font-medium underline-offset-4 hover:underline">
            {t('signUp.signIn')}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">{t('signUp.firstName')}</Label>
            <Input id="first_name" {...register('first_name')} />
            {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">{t('signUp.lastName')}</Label>
            <Input id="last_name" {...register('last_name')} />
            {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('signUp.email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('signUp.password')}</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          <p className="text-xs text-muted-foreground">{t('signUp.passwordHint')}</p>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {t('signUp.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}

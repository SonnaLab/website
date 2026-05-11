import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { createSignInSchema, SignInInputs } from '@/schemas/authSchema';
import { getDashboardPath } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignInPage() {
  const { t } = useTranslation('auth');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<SignInInputs>({ resolver: zodResolver(createSignInSchema(t)) });

  const onSubmit = async (data: SignInInputs) => {
    try {
      const user = await signIn(data.email, data.password);
      navigate(from || getDashboardPath(user.role), { replace: true });
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      toast.error(status === 401 ? t('signIn.errorInvalid') : t('signIn.errorGeneric'));
    }
  };

  return (
    <AuthLayout
      title={t('signIn.title')}
      subtitle={t('signIn.subtitle')}
      footer={
        <p>
          {t('signIn.noAccount')}{' '}
          <Link to="/sign-up" className="text-foreground font-medium underline-offset-4 hover:underline">
            {t('signIn.createAccount')}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t('signIn.email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('signIn.password')}</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              {t('signIn.forgot')}
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {t('signIn.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}

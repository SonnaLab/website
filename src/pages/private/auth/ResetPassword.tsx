import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { apiService } from '@/services/api';
import { createResetPasswordSchema, ResetPasswordInputs } from '@/schemas/authSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EyeIcon, EyeOffIcon } from '@icons';

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  useEffect(() => { if (!token) setTokenInvalid(true); }, [token]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ResetPasswordInputs>({ resolver: zodResolver(createResetPasswordSchema(t)) });

  const onSubmit = async (data: ResetPasswordInputs) => {
    try {
      await apiService.resetPassword(token, data.password);
      toast.success(t('resetPassword.successTitle'), { description: t('resetPassword.successMessage') });
      navigate('/sign-in', { replace: true });
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 422 || status === 404) setTokenInvalid(true);
      else toast.error(t('resetPassword.errorInvalidToken'));
    }
  };

  return (
    <AuthLayout
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
      footer={<Link to="/sign-in" className="text-foreground hover:underline">← {t('forgotPassword.back')}</Link>}
    >
      {tokenInvalid ? (
        <p className="text-sm text-destructive">{t('resetPassword.errorInvalidToken')}</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">{t('resetPassword.password')}</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pr-9" {...register('password')} />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirm">{t('resetPassword.passwordConfirm')}</Label>
            <div className="relative">
              <Input id="password_confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" className="pr-9" {...register('password_confirm')} />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label={showConfirm ? 'Masquer' : 'Afficher'}>
                {showConfirm ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
            {errors.password_confirm && <p className="text-xs text-destructive">{errors.password_confirm.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('resetPassword.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

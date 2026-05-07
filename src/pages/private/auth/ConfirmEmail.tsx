import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2Icon, XCircleIcon } from '@icons';

import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';

type Status = 'verifying' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<Status>('verifying');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    let cancelled = false;
    apiService.verifyEmailConfirmation(token)
      .then(() => { if (!cancelled) setStatus('success'); })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthLayout title={t('confirmEmail.title')}>
      {status === 'verifying' && (
        <p className="text-sm text-muted-foreground">{t('confirmEmail.verifying')}</p>
      )}
      {status === 'success' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2Icon className="size-5 text-medical-green" />
            <span className="font-medium">{t('confirmEmail.successTitle')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('confirmEmail.successMessage')}</p>
          <Button asChild className="w-full"><Link to="/sign-in">{t('signIn.submit')}</Link></Button>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <XCircleIcon className="size-5 text-destructive" />
            <span className="font-medium">{t('confirmEmail.errorTitle')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('confirmEmail.errorMessage')}</p>
          <Button asChild variant="outline" className="w-full"><Link to="/sign-in">← {t('forgotPassword.back')}</Link></Button>
        </div>
      )}
    </AuthLayout>
  );
}

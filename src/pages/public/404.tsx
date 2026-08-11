import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

const AUTO_REDIRECT_SECONDS = 8;

export default function NotFound(): React.ReactElement {
    const { t } = useTranslation('404');
    const navigate = useNavigate();
    const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

    useEffect(() => {
        if (secondsLeft <= 0) {
            navigate('/', { replace: true });
            return;
        }
        const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft, navigate]);

    return (
        <>
            <Helmet>
                <title>{t('title')}</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
        {/* 2026-08-11 : cette page utilisait des couleurs Tailwind arbitraires
            (bg-blue-600, bg-red-100, bg-gray-200...) absentes du CSS livre --
            aucun pipeline Tailwind n'est branche au build (pas de
            postcss.config.js, pas de plugin dans vite.config.ts) : src/index.css
            est un fichier deja compile, fige, jamais regenere depuis. Toute
            classe utilitaire ajoutee apres coup est donc invisible sans erreur
            de build (le bouton "Retour a l'accueil" avait un fond transparent
            au lieu de bleu). Remplace par les classes de token de design
            (bg-primary, text-muted-foreground...) deja utilisees ailleurs sur
            le site, donc garanties presentes dans le CSS livre. */}
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="text-center px-4">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-muted rounded-full mb-6">
                    <AlertTriangle size={48} className="text-destructive" />
                </div>

                <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                    {t('heading')}
                </h2>
                <p className="text-muted-foreground mb-4 max-w-md">
                    {t('description')}
                </p>
                <p className="text-sm text-muted-foreground opacity-70 mb-8">
                    {t('redirecting', { count: secondsLeft })}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-70 transition-colors font-medium"
                    >
                        <Home size={20} className="mr-2" />
                        {t('homeButton')}
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-70 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        {t('backButton')}
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}

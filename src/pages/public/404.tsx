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
            le site, donc garanties presentes dans le CSS livre.

            2026-08-12 : motif "papier peint" -- meme contrainte, donc en
            style inline plutot qu'une classe Tailwind qui pourrait ne pas
            exister dans le CSS fige. Le favicon (fond transparent, cercle
            noir + oiseau blanc -- verifie via PIL) est repete en filigrane
            sur deux calques decales d'un demi-carreau pour un effet
            "quinconce" plutot qu'une simple grille, tres faible opacite
            pour rester un motif de fond et jamais concurrencer le contenu. */}
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden">
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: '-20%',
                    backgroundImage: 'url(/favicon/android-chrome-192x192.png)',
                    backgroundSize: '220px 220px',
                    backgroundRepeat: 'repeat',
                    transform: 'rotate(-8deg)',
                    opacity: 0.035,
                    pointerEvents: 'none',
                }}
            />

            <div className="text-center px-4 relative z-10">
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

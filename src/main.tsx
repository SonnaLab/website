import { useEffect, useState, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ModalProvider } from './components/providers/ModalProvider';
import { ConsultationModal } from './components/modals/ConsultationModal';
import { CookieConsent } from '@/components/public/CookieConsent';
import { CookieWidget } from '@/components/public/CookieWidget';
import { Toaster } from './components/ui/sonner';

import { router } from "./router";
import "./index.css";
import i18n from "./i18n/config";

// 2026-08-11 : i18n.init() est asynchrone (meme avec des detecteurs
// synchrones localStorage/navigator, i18next resout via une microtask) --
// rendre immediatement apres l'import declenchait une course : selon la
// vitesse du device/reseau, le premier rendu pouvait arriver AVANT la
// resolution de l'init, et react-i18next affiche alors les cles brutes
// (heading, description...) au lieu du texte traduit tant qu'un re-render
// ne survient pas. Repere sur /services vs /services/web-development :
// meme composant NotFound, un chargement montrait la traduction, l'autre
// les cles brutes -- pas un bug de routing, un flash non-deterministe.
const rootEl = document.getElementById("root")!;

// Overlays absents du rendu serveur (entry-server.tsx ne rend que le
// routeur) : montes seulement apres l'hydratation. Rendus des le premier
// rendu client, le <style> de CookieConsent (tout nouveau visiteur, Googlebot
// compris) n'avait aucun equivalent dans le HTML prerendu -- React abandonnait
// l'hydratation et re-rendait toute la page (erreurs #418/#423 mesurees en
// prod sur la home et les articles, 2026-10-30).
function AfterHydration({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? <>{children}</> : null;
}

// Rend au visiteur sa langue habituelle une fois la page hydratee dans celle
// du HTML (voir hydrateInPrerenderedLanguage).
function RestoreLanguage({ lang }: { lang: string | null }) {
  useEffect(() => {
    if (lang) i18n.changeLanguage(lang);
  }, [lang]);
  return null;
}

function App({ restoreLanguage }: { restoreLanguage: string | null }) {
  return (
    <HelmetProvider>
      <ModalProvider>
        <RouterProvider router={router} />

        {/* Modals & Overlays globaux (hors Router) */}
        <AfterHydration>
          <ConsultationModal />
          <CookieConsent />
          <Toaster richColors closeButton position="bottom-right" />
          <RestoreLanguage lang={restoreLanguage} />
        </AfterHydration>
      </ModalProvider>
    </HelmetProvider>
  );
}

// Pages dont l'URL impose deja la langue apres montage : /en, /es... via
// ForceLocale, et les articles via BlogPost (langue de l'article).
const LOCALE_FORCED_PATH = /^\/(en|es|it|de)(\/|$)|^\/blog\/[^/]+/;

/**
 * Le HTML prerendu est dans la langue de la page (<html lang>, pose par
 * scripts/prerender-blog.mjs), le client demarrait dans celle du visiteur
 * (localStorage, 'fr' par defaut) : au moindre libelle different (menu
 * "Accueil" vs "Home"), React re-rendait toute la page -- cas de tout nouveau
 * visiteur sur un article non francais. On hydrate donc dans la langue du
 * HTML, sans toucher a la preference enregistree, et on retourne la langue a
 * restaurer apres hydratation (null si la page impose la sienne).
 */
async function hydrateInPrerenderedLanguage(): Promise<string | null> {
  const htmlLang = document.documentElement.lang.slice(0, 2);
  const visitorLang = i18n.language?.slice(0, 2);
  if (!htmlLang || visitorLang === htmlLang) return null;

  let stored: string | null = null;
  try { stored = localStorage.getItem('i18nextLng'); } catch { /* stockage indisponible */ }
  await i18n.changeLanguage(htmlLang);
  // changeLanguage persiste la langue (detection.caches) : ce changement
  // technique ne doit pas ecraser le choix du visiteur.
  try { if (stored) localStorage.setItem('i18nextLng', stored); } catch { /* idem */ }

  return LOCALE_FORCED_PATH.test(window.location.pathname) ? null : visitorLang;
}

// hydrateRoot (pas createRoot) : les pages prerendues (scripts/
// prerender-blog.mjs, via src/entry-server.tsx) contiennent deja le HTML
// reel de la page -- createRoot l'effacait et reconstruisait tout depuis
// zero a chaque refresh, un flash visible signale par l'utilisateur.
// hydrateRoot reutilise ce DOM existant tant que le premier rendu client
// correspond a ce que le serveur a produit (voir BlogPost.tsx : post/loading
// initialises depuis getSSRData(), jamais dans un useEffect, sinon le
// premier rendu client ne matche plus et React rejette le sous-arbre au
// lieu de l'hydrater).
//
// data-ssr="1" (pose par entry-server.tsx sur #root) marque une page
// effectivement pre-rendue via le nouveau pipeline SSR -- absent, on
// retombe sur createRoot (comportement client-only classique, sûr pour
// n'importe quelle page pas encore migree vers entry-server, ex. /contact,
// /projects ou /legal/* pour l'instant).
async function mount() {
  if (rootEl.dataset.ssr === '1') {
    const restoreLanguage = await hydrateInPrerenderedLanguage();
    hydrateRoot(rootEl, <App restoreLanguage={restoreLanguage} />);
  } else {
    createRoot(rootEl).render(<App restoreLanguage={null} />);
  }
}

if (i18n.isInitialized) {
  mount();
} else {
  i18n.on("initialized", mount);
}
import { createRoot } from "react-dom/client";
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
function mount() {
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <ModalProvider>
        <RouterProvider router={router} />

        {/* Modals & Overlays globaux (hors Router) */}
        <ConsultationModal />
        <CookieConsent />
        <Toaster richColors closeButton position="top-right" />
      </ModalProvider>
    </HelmetProvider>
  );
}

if (i18n.isInitialized) {
  mount();
} else {
  i18n.on("initialized", mount);
}
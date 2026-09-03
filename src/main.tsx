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

const tree = (
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
// n'importe quelle page pas encore migree vers entry-server, ex. /blog en
// liste pour l'instant).
function mount() {
  if (rootEl.dataset.ssr === '1') {
    hydrateRoot(rootEl, tree);
  } else {
    createRoot(rootEl).render(tree);
  }
}

if (i18n.isInitialized) {
  mount();
} else {
  i18n.on("initialized", mount);
}
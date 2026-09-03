// Point d'entree SSR -- execute uniquement au moment du build (voir
// scripts/prerender-blog.mjs), jamais en production : le site est servi en
// fichiers statiques purs par nginx, aucun serveur Node ne tourne en prod.
//
// Rend le MEME arbre de composants que le client (routeTree, partage avec
// src/router/index.tsx) via createMemoryRouter au lieu de createBrowserRouter
// -- objectif : que le HTML genere ici soit strictement identique a ce que
// hydrateRoot produirait au premier rendu client, pour que l'hydratation
// reutilise le DOM au lieu de le rejeter et le reconstruire (voir main.tsx).
//
// N'importe PAS "./index.css" (le CSS est deja gere separement par
// scripts/prerender-blog.mjs, qui l'inline dans le <style> du <head>) ni
// les modales sans valeur SEO (ConsultationModal/CookieConsent/Toaster) --
// seul le contenu a l'interieur du <RouterProvider> compte ici.

import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { ModalProvider } from './components/providers/ModalProvider';
import { routeTree } from './router';
import i18n from './i18n/config';
import { setSSRData, consumeServerSSRData } from './lib/ssrData';

export interface RenderResult {
  html: string;
  helmet: HelmetServerState;
  ssrDataScript: string;
}

/**
 * @param url      Chemin a rendre, ex. "/blog/mon-article".
 * @param locale   Langue a forcer pour ce rendu (voir i18n/config.ts --
 *                 LanguageDetector est desactive sous Node, la langue doit
 *                 etre fournie explicitement).
 * @param ssrData  Donnee optionnelle a exposer aux composants via
 *                 getSSRData(route) (ex. l'article deja recupere par
 *                 prerender-blog.mjs) -- evite un second fetch reseau
 *                 pendant renderToString ET donne au client la meme donnee
 *                 exacte a utiliser comme etat initial.
 */
export async function render(
  url: string,
  locale: string,
  ssrData?: { route: string; data: unknown },
): Promise<RenderResult> {
  await i18n.changeLanguage(locale);

  if (ssrData) setSSRData(ssrData.route, ssrData.data);

  const memoryRouter = createMemoryRouter(routeTree, { initialEntries: [url] });
  const helmetContext = {} as { helmet?: HelmetServerState };

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <ModalProvider>
        <RouterProvider router={memoryRouter} />
      </ModalProvider>
    </HelmetProvider>,
  );

  // Toujours consommer, meme si render() a ete appele sans ssrData -- une
  // valeur laissee par un appel precedent (process Node reutilise entre
  // plusieurs routes dans la boucle du script de prerender) ne doit jamais
  // fuiter vers CE rendu.
  consumeServerSSRData();

  const ssrDataScript = ssrData
    ? `<script id="__SSR_DATA__" type="application/json">${JSON.stringify(ssrData).replace(/</g, '\\u003c')}</script>`
    : '';

  return { html, helmet: helmetContext.helmet!, ssrDataScript };
}

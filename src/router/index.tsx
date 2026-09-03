import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate, useParams, type RouteObject } from 'react-router-dom';
import i18n from '@/i18n/config';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Layout } from '@/components/public/Layout';
import { ProtectedRoute } from '@/components/private/auth/ProtectedRoute';
import { MemberLayout } from '@/components/private/member/MemberLayout';

import NotFound from '@/pages/public/404';
import Home from '@/pages/public/Home';
import Contact from '@/pages/public/Contact';
import Projects from '@/pages/public/Projects';
import Blog from '@/pages/public/Blog';
import BlogPost from '@/pages/public/BlogPost';
import PrivacyPolicy from '@/pages/public/legal/PrivacyPolicy';
import TermsOfService from '@/pages/public/legal/TermsOfService';
import QualityPolicy from '@/pages/public/legal/QualityPolicy';
import LegalNotice from '@/pages/public/legal/LegalNotice';
import CookiesPolicy from '@/pages/public/legal/CookiesPolicy';
import IntellectualProperty from '@/pages/public/legal/IntellectualProperty';

// Auth
import SignInPage from '@/pages/private/auth/SignIn';
import SignUpPage from '@/pages/private/auth/SignUp';
import ForgotPasswordPage from '@/pages/private/auth/ForgotPassword';
import ResetPasswordPage from '@/pages/private/auth/ResetPassword';
import ConfirmEmailPage from '@/pages/private/auth/ConfirmEmail';

// Member
import MemberDashboard from '@/pages/private/member/Dashboard';
import MemberAppointments from '@/pages/private/member/Appointments';
import { ProjectsList as MemberProjectsList, ProjectDetail as MemberProjectDetail } from '@/pages/private/member/Projects';
import MemberBilling from '@/pages/private/member/Billing';

// Admin
import AdminDashboard from '@/pages/private/admin/Dashboard';
import AdminInfrastructure from '@/pages/private/admin/Infrastructure';
import AdminCookies from '@/pages/private/admin/Cookies';
import AdminOuou from '@/pages/private/admin/Ouou';
import AdminSeo from '@/pages/private/admin/Seo';
import AdminNews from '@/pages/private/admin/News';
import AdminUsers from '@/pages/private/admin/Users';
import AdminLesankofa from '@/pages/private/admin/Lesankofa';

// Staff
import StaffDashboard from '@/pages/private/staff/Dashboard';

function RootShell() {
  return (
    <AuthProvider>
      <AnalyticsProvider>
        <Outlet />
      </AnalyticsProvider>
    </AuthProvider>
  );
}

function PublicShell() {
  return <Layout><Outlet /></Layout>;
}

// Redirect /fr/* → /* : le français reste la langue par défaut non préfixée
// (comportement inchangé). /en, /es, /it, /de ont désormais de vraies routes
// ci-dessous (voir LOCALIZED_PREFIXES) au lieu d'être redirigées.
function EnLangRedirect() {
  const { '*': wildcard = '' } = useParams();
  return <Navigate to={`/${wildcard}`} replace />;
}

// Langues avec une URL préfixée réelle en plus du français non préfixé.
// Objectif : donner aux crawlers de vraies URLs distinctes par langue (voir
// SEO.tsx / scripts/prerender-blog.mjs) sans rien changer à la navigation
// normale des utilisateurs (sélecteur de langue client-side existant).
const LOCALIZED_PREFIXES = ['en', 'es', 'it', 'de'] as const;

// 2026-08-21 : les préfixes /en, /es, /it, /de n'existent QUE comme point
// d'entrée crawl/partage (URL prerendue correcte pour Googlebot ou pour
// quelqu'un qui arrive depuis un résultat de recherche/lien partagé) — un
// vrai navigateur ne doit jamais garder ce préfixe visible en naviguant.
// Même mécanisme que lebocheur.com et lecolt.com : on force la langue puis
// on retire immédiatement le préfixe de l'URL via un replace (pas d'entrée
// d'historique, pas de flash), et on persiste la langue dans le cache de
// i18next-browser-languagedetector pour que la préférence survive après le
// strip du préfixe -- remplace l'ancien comportement qui restaurait la
// valeur précédente du cache pour ne pas la polluer.
function ForceLocale({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    i18n.changeLanguage(lang).then(() => {
      localStorage.setItem('i18nextLng', lang);
      const bare = location.pathname.slice(lang.length + 1) || '/';
      navigate({ pathname: bare, search: location.search, hash: location.hash }, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return <Outlet />;
}

// Tableau exporte separement de createBrowserRouter(...) pour etre reutilise
// tel quel par entry-server.tsx (createMemoryRouter, meme arbre) -- le SSR
// doit rendre EXACTEMENT le meme arbre de composants que le client, sinon on
// retombe dans le probleme du squelette approximatif qu'on est en train
// d'eliminer.
export const routeTree: RouteObject[] = [
  {
    element: <RootShell />,
    children: [
      // ---- Public site ----
      {
        element: <PublicShell />,
        children: [
          { path: '/',                              element: <Home /> },
          { path: '/contact',                       element: <Contact /> },
          { path: '/projects',                      element: <Projects /> },
          { path: '/blog',                          element: <Blog /> },
          { path: '/blog/:slug',                    element: <BlogPost /> },
          { path: '/legal/privacy',                 element: <PrivacyPolicy /> },
          { path: '/legal/terms',                   element: <TermsOfService /> },
          { path: '/legal/quality',                 element: <QualityPolicy /> },
          { path: '/legal/notice',                  element: <LegalNotice /> },
          { path: '/legal/cookies',                 element: <CookiesPolicy /> },
          { path: '/legal/intellectual-property',   element: <IntellectualProperty /> },
        ],
      },

      // ---- Public site, URLs préfixées par langue (crawlables, contenu
      // réel identique aux routes ci-dessus) : home/blog/contact uniquement
      // -- les seules pages dont le contenu diffère vraiment par langue.
      // Le français n'a PAS de préfixe (déjà à la racine, voir plus bas).
      ...LOCALIZED_PREFIXES.map((lang) => ({
        path: `/${lang}`,
        element: <ForceLocale lang={lang} />,
        children: [
          {
            element: <PublicShell />,
            children: [
              { index: true,     element: <Home /> },
              { path: 'blog',    element: <Blog /> },
              { path: 'contact', element: <Contact /> },
            ],
          },
        ],
      })),

      // ---- Auth (no layout) ----
      { path: '/sign-in',         element: <SignInPage /> },
      { path: '/sign-up',         element: <SignUpPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password',  element: <ResetPasswordPage /> },
      { path: '/confirm-email',   element: <ConfirmEmailPage /> },

      // ---- Legacy /fr/* redirect (fr reste non préfixé) ----
      { path: '/fr/*', element: <EnLangRedirect /> },

      // ---- 404 catch-all (must be last) ----
      { path: '*', element: <NotFound /> },

      // ---- Member (user) ----
      {
        path: '/dashboard',
        element: <ProtectedRoute><MemberLayout /></ProtectedRoute>,
        children: [
          { index: true,           element: <MemberDashboard /> },
          { path: 'appointments',  element: <MemberAppointments /> },
          { path: 'projects',      element: <MemberProjectsList /> },
          { path: 'projects/:id',  element: <MemberProjectDetail /> },
          { path: 'billing',       element: <MemberBilling /> },
        ],
      },

      // ---- Staff ----
      {
        path: '/staff',
        element: <ProtectedRoute roles={['staff', 'admin']}><MemberLayout /></ProtectedRoute>,
        children: [
          { index: true,       element: <Navigate to="/staff/dashboard" replace /> },
          { path: 'dashboard', element: <StaffDashboard /> },
        ],
      },

      // ---- Admin (admin role only) ----
      {
        path: '/admin',
        element: <ProtectedRoute roles={['admin']}><MemberLayout /></ProtectedRoute>,
        children: [
          { index: true,            element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard',      element: <AdminDashboard /> },
          { path: 'infrastructure', element: <AdminInfrastructure /> },
          { path: 'cookies',        element: <AdminCookies /> },
          { path: 'ouou',           element: <AdminOuou /> },
          { path: 'seo',            element: <AdminSeo /> },
          { path: 'news',           element: <AdminNews /> },
          { path: 'users',          element: <AdminUsers /> },
          { path: 'lesankofa',      element: <AdminLesankofa /> },
        ],
      },
    ],
  },
];

// createBrowserRouter() appelle document.* des sa construction (via
// createBrowserHistory) -- entry-server.tsx importe SEULEMENT routeTree
// depuis ce module, mais evaluer un module ES execute TOUT son code de
// premier niveau, y compris cet export inutilise sous Node. `router` n'a
// aucun sens cote serveur (jamais lu par entry-server.tsx) : ne le
// construis que dans un navigateur.
export const router = typeof window !== 'undefined' ? createBrowserRouter(routeTree) : (null as never);
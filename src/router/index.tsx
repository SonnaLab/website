import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AnalyticsProvider } from '../components/providers/AnalyticsProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { MemberLayout } from '../components/member/MemberLayout';

import Home from '../pages/Home';
import Contact from '../pages/Contact';
import Projects from '../pages/Projects';
import Blog from '../pages/Blog';
import BlogPost from '../pages/BlogPost';
import PrivacyPolicy from '../pages/legal/PrivacyPolicy';
import TermsOfService from '../pages/legal/TermsOfService';
import QualityPolicy from '../pages/legal/QualityPolicy';
import LegalNotice from '../pages/legal/LegalNotice';
import CookiesPolicy from '../pages/legal/CookiesPolicy';
import IntellectualProperty from '../pages/legal/IntellectualProperty';

// Auth
import SignInPage from '../pages/auth/SignIn';
import SignUpPage from '../pages/auth/SignUp';
import ForgotPasswordPage from '../pages/auth/ForgotPassword';
import ResetPasswordPage from '../pages/auth/ResetPassword';
import ConfirmEmailPage from '../pages/auth/ConfirmEmail';

// Member
import MemberDashboard from '../pages/member/Dashboard';
import MemberAppointments from '../pages/member/Appointments';
import { ProjectsList as MemberProjectsList, ProjectDetail as MemberProjectDetail } from '../pages/member/Projects';
import MemberBilling from '../pages/member/Billing';

// Admin
import AdminInfrastructure from '../pages/admin/Infrastructure';
import AdminTracking from '../pages/admin/Tracking';
import AdminOuou from '../pages/admin/Ouou';
import AdminSeo from '../pages/admin/Seo';

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

export const router = createBrowserRouter([
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

      // ---- Auth (no layout) ----
      { path: '/sign-in',         element: <SignInPage /> },
      { path: '/sign-up',         element: <SignUpPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password',  element: <ResetPasswordPage /> },
      { path: '/confirm-email',   element: <ConfirmEmailPage /> },

      // ---- Member ----
      {
        path: '/member',
        element: <ProtectedRoute><MemberLayout /></ProtectedRoute>,
        children: [
          { index: true,           element: <MemberDashboard /> },
          { path: 'appointments',  element: <MemberAppointments /> },
          { path: 'projects',      element: <MemberProjectsList /> },
          { path: 'projects/:id',  element: <MemberProjectDetail /> },
          { path: 'billing',       element: <MemberBilling /> },
        ],
      },

      // ---- Admin (admin role only) ----
      {
        path: '/admin',
        element: <ProtectedRoute roles={['admin']}><MemberLayout /></ProtectedRoute>,
        children: [
          { index: true,            element: <AdminInfrastructure /> },
          { path: 'infrastructure', element: <AdminInfrastructure /> },
          { path: 'tracking',       element: <AdminTracking /> },
          { path: 'ouou',           element: <AdminOuou /> },
          { path: 'seo',            element: <AdminSeo /> },
        ],
      },
    ],
  },
]);
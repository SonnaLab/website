import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Layout } from '@/components/public/Layout';
import { ProtectedRoute } from '@/components/private/auth/ProtectedRoute';
import { MemberLayout } from '@/components/private/member/MemberLayout';

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
import AdminTracking from '@/pages/private/admin/Tracking';
import AdminOuou from '@/pages/private/admin/Ouou';
import AdminSeo from '@/pages/private/admin/Seo';

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
          { path: 'tracking',       element: <AdminTracking /> },
          { path: 'ouou',           element: <AdminOuou /> },
          { path: 'seo',            element: <AdminSeo /> },
        ],
      },
    ],
  },
]);
import { createBrowserRouter } from 'react-router-dom';
import { AnalyticsProvider } from '../components/providers/AnalyticsProvider';
import { Layout } from '../components/Layout';
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

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsProvider>
      <Layout>
        {children}
      </Layout>
    </AnalyticsProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout><Home /></RootLayout>,
  },
  {
    path: '/contact',
    element: <RootLayout><Contact /></RootLayout>,
  },
  {
    path: '/projects',
    element: <RootLayout><Projects /></RootLayout>,
  },
  {
    path: '/blog',
    element: <RootLayout><Blog /></RootLayout>,
  },
  {
    path: '/blog/:slug',
    element: <RootLayout><BlogPost /></RootLayout>,
  },

  // Legals
  {
    path: '/legal/privacy',
    element: <RootLayout><PrivacyPolicy /></RootLayout>,
  },
  {
    path: '/legal/terms',
    element: <RootLayout><TermsOfService /></RootLayout>,
  },
  {
    path: '/legal/quality',
    element: <RootLayout><QualityPolicy /></RootLayout>,
  },
  {
    path: '/legal/notice',
    element: <RootLayout><LegalNotice /></RootLayout>,
  },
  {
    path: '/legal/cookies',
    element: <RootLayout><CookiesPolicy /></RootLayout>,
  },
  {
    path: '/legal/intellectual-property',
    element: <RootLayout><IntellectualProperty /></RootLayout>,
  },
]);
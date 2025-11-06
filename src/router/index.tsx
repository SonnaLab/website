import { createBrowserRouter } from 'react-router-dom';
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/contact',
    element: <Layout><Contact /></Layout>,
  },
  {
    path: '/projects',
    element: <Layout><Projects /></Layout>,
  },
  {
    path: '/blog',
    element: <Layout><Blog /></Layout>,
  },
  {
    path: '/blog/:slug',
    element: <Layout><BlogPost /></Layout>,
  },

  // Legals
  {
    path: '/legal/privacy',
    element: <Layout><PrivacyPolicy /></Layout>,
  },
  {
    path: '/legal/terms',
    element: <Layout><TermsOfService /></Layout>,
  },
  {
    path: '/legal/quality',
    element: <Layout><QualityPolicy /></Layout>,
  },
  {
    path: '/legal/notice',
    element: <Layout><LegalNotice /></Layout>,
  },
  {
    path: '/legal/cookies',
    element: <Layout><CookiesPolicy /></Layout>,
  },
  {
    path: '/legal/intellectual-property',
    element: <Layout><IntellectualProperty /></Layout>,
  },
]);
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

//French
import frHeader from '../locales/fr/header.json';
import frHero from '../locales/fr/hero.json';
import frServices from '../locales/fr/services.json';
import frHowItWorks from '../locales/fr/howItWorks.json';
import frAbout from '../locales/fr/about.json';
import frResearch from '../locales/fr/research.json';
import frSuccess from '../locales/fr/success.json';
import frTestimonials from '../locales/fr/testimonials.json';
import frFooter from '../locales/fr/footer.json';
import frCommon from '../locales/fr/common.json';

import frContact from '../locales/fr/contact.json';
import frProjects from '../locales/fr/projects.json';
import frHome from '../locales/fr/home.json'
import frSEO from '../locales/fr/seo.json'
import frBlog from '../locales/fr/blog.json'
import frConsultation from '../locales/fr/consultation.json'
import frLegal from '../locales/fr/legal.json'
import frCookies from '../locales/fr/cookies.json'
import frAuth from '../locales/fr/auth.json'
import frMember from '../locales/fr/member.json'
import frAdmin from '../locales/fr/admin.json'
import frNotFound from '../pages/404';

// English
import enHeader from '../locales/en/header.json';
import enHero from '../locales/en/hero.json';
import enServices from '../locales/en/services.json';
import enHowItWorks from '../locales/en/howItWorks.json';
import enAbout from '../locales/en/about.json';
import enResearch from '../locales/en/research.json';
import enSuccess from '../locales/en/success.json';
import enTestimonials from '../locales/en/testimonials.json';
import enFooter from '../locales/en/footer.json';
import enCommon from '../locales/en/common.json';

import enContact from '../locales/en/contact.json';
import enProjects from '../locales/en/projects.json';
import enHome from '../locales/en/home.json'
import enSEO from '../locales/en/seo.json'
import enBlog from '../locales/en/blog.json'
import enConsultation from '../locales/en/consultation.json'
import enLegal from '../locales/en/legal.json'
import enCookies from '../locales/en/cookies.json'
import enAuth from '../locales/en/auth.json'
import enMember from '../locales/en/member.json'
import enAdmin from '../locales/en/admin.json'
import enNotFound from '../pages/404';

const resources = {
  fr: {
    header: frHeader,
    hero: frHero,
    services: frServices,
    howItWorks: frHowItWorks,
    about: frAbout,
    research: frResearch,
    success: frSuccess,
    testimonials: frTestimonials,
    footer: frFooter,
    common: frCommon,
    contact: frContact,
    projects: frProjects,
    home: frHome,
    seo: frSEO,
    blog: frBlog,
    consultation: frConsultation,
    legal: frLegal,
    cookies: frCookies,
    auth: frAuth,
    member: frMember,
    admin: frAdmin,
    notFound: frNotFound,
  },
  en: {
    header: enHeader,
    hero: enHero,
    services: enServices,
    howItWorks: enHowItWorks,
    about: enAbout,
    research: enResearch,
    success: enSuccess,
    testimonials: enTestimonials,
    footer: enFooter,
    common: enCommon,
    contact: enContact,
    projects: enProjects,
    home: enHome,
    seo: enSEO,
    blog: enBlog,
    consultation: enConsultation,
    legal: enLegal,
    cookies: enCookies,
    auth: enAuth,
    member: enMember,
    admin: enAdmin,
    notFound: enNotFound,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
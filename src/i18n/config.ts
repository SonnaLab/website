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
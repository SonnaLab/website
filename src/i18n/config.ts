import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

//French
import frHeader from '@/locales/fr/header.json';
import frHero from '@/locales/fr/hero.json';
import frServices from '@/locales/fr/services.json';
import frHowItWorks from '@/locales/fr/howItWorks.json';
import frAbout from '@/locales/fr/about.json';
import frResearch from '@/locales/fr/research.json';
import frSuccess from '@/locales/fr/success.json';
import frTestimonials from '@/locales/fr/testimonials.json';
import frFooter from '@/locales/fr/footer.json';
import frCommon from '@/locales/fr/common.json';

import frContact from '@/locales/fr/contact.json';
import frProjects from '@/locales/fr/projects.json';
import frHome from '@/locales/fr/home.json'
import frSEO from '@/locales/fr/seo.json'
import frBlog from '@/locales/fr/blog.json'
import frConsultation from '@/locales/fr/consultation.json'
import frLegal from '@/locales/fr/legal.json'
import frCookies from '@/locales/fr/cookies.json'
import frAuth from '@/locales/fr/auth.json'
import frMember from '@/locales/fr/member.json'
import frAdmin from '@/locales/fr/admin.json'
import frNotFound from '@/pages/public/404';

// English
import enHeader from '@/locales/en/header.json';
import enHero from '@/locales/en/hero.json';
import enServices from '@/locales/en/services.json';
import enHowItWorks from '@/locales/en/howItWorks.json';
import enAbout from '@/locales/en/about.json';
import enResearch from '@/locales/en/research.json';
import enSuccess from '@/locales/en/success.json';
import enTestimonials from '@/locales/en/testimonials.json';
import enFooter from '@/locales/en/footer.json';
import enCommon from '@/locales/en/common.json';

import enContact from '@/locales/en/contact.json';
import enProjects from '@/locales/en/projects.json';
import enHome from '@/locales/en/home.json'
import enSEO from '@/locales/en/seo.json'
import enBlog from '@/locales/en/blog.json'
import enConsultation from '@/locales/en/consultation.json'
import enLegal from '@/locales/en/legal.json'
import enCookies from '@/locales/en/cookies.json'
import enAuth from '@/locales/en/auth.json'
import enMember from '@/locales/en/member.json'
import enAdmin from '@/locales/en/admin.json'
import enNotFound from '@/pages/public/404';

// Spanish
import esHeader from '@/locales/es/header.json';
import esCommon from '@/locales/es/common.json';
import esAuth from '@/locales/es/auth.json';
import esAdmin from '@/locales/es/admin.json';
import esHero from '@/locales/es/hero.json';
import esServices from '@/locales/es/services.json';
import esHowItWorks from '@/locales/es/howItWorks.json';
import esAbout from '@/locales/es/about.json';
import esResearch from '@/locales/es/research.json';
import esSuccess from '@/locales/es/success.json';
import esTestimonials from '@/locales/es/testimonials.json';
import esFooter from '@/locales/es/footer.json';
import esContact from '@/locales/es/contact.json';
import esProjects from '@/locales/es/projects.json';
import esHome from '@/locales/es/home.json';
import esSEO from '@/locales/es/seo.json';
import esBlog from '@/locales/es/blog.json';
import esConsultation from '@/locales/es/consultation.json';
import esLegal from '@/locales/es/legal.json';
import esCookies from '@/locales/es/cookies.json';
import esMember from '@/locales/es/member.json';

// Italian
import itHeader from '@/locales/it/header.json';
import itCommon from '@/locales/it/common.json';
import itAuth from '@/locales/it/auth.json';
import itAdmin from '@/locales/it/admin.json';
import itHero from '@/locales/it/hero.json';
import itServices from '@/locales/it/services.json';
import itHowItWorks from '@/locales/it/howItWorks.json';
import itAbout from '@/locales/it/about.json';
import itResearch from '@/locales/it/research.json';
import itSuccess from '@/locales/it/success.json';
import itTestimonials from '@/locales/it/testimonials.json';
import itFooter from '@/locales/it/footer.json';
import itContact from '@/locales/it/contact.json';
import itProjects from '@/locales/it/projects.json';
import itHome from '@/locales/it/home.json';
import itSEO from '@/locales/it/seo.json';
import itBlog from '@/locales/it/blog.json';
import itConsultation from '@/locales/it/consultation.json';
import itLegal from '@/locales/it/legal.json';
import itCookies from '@/locales/it/cookies.json';
import itMember from '@/locales/it/member.json';

// German
import deHeader from '@/locales/de/header.json';
import deCommon from '@/locales/de/common.json';
import deAuth from '@/locales/de/auth.json';
import deAdmin from '@/locales/de/admin.json';
import deHero from '@/locales/de/hero.json';
import deServices from '@/locales/de/services.json';
import deHowItWorks from '@/locales/de/howItWorks.json';
import deAbout from '@/locales/de/about.json';
import deResearch from '@/locales/de/research.json';
import deSuccess from '@/locales/de/success.json';
import deTestimonials from '@/locales/de/testimonials.json';
import deFooter from '@/locales/de/footer.json';
import deContact from '@/locales/de/contact.json';
import deProjects from '@/locales/de/projects.json';
import deHome from '@/locales/de/home.json';
import deSEO from '@/locales/de/seo.json';
import deBlog from '@/locales/de/blog.json';
import deConsultation from '@/locales/de/consultation.json';
import deLegal from '@/locales/de/legal.json';
import deCookies from '@/locales/de/cookies.json';
import deMember from '@/locales/de/member.json';

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
  es: {
    header: esHeader,
    common: esCommon,
    auth: esAuth,
    admin: esAdmin,
    hero: esHero,
    services: esServices,
    howItWorks: esHowItWorks,
    about: esAbout,
    research: esResearch,
    success: esSuccess,
    testimonials: esTestimonials,
    footer: esFooter,
    contact: esContact,
    projects: esProjects,
    home: esHome,
    seo: esSEO,
    blog: esBlog,
    consultation: esConsultation,
    legal: esLegal,
    cookies: esCookies,
    member: esMember,
  },
  it: {
    header: itHeader,
    common: itCommon,
    auth: itAuth,
    admin: itAdmin,
    hero: itHero,
    services: itServices,
    howItWorks: itHowItWorks,
    about: itAbout,
    research: itResearch,
    success: itSuccess,
    testimonials: itTestimonials,
    footer: itFooter,
    contact: itContact,
    projects: itProjects,
    home: itHome,
    seo: itSEO,
    blog: itBlog,
    consultation: itConsultation,
    legal: itLegal,
    cookies: itCookies,
    member: itMember,
  },
  de: {
    header: deHeader,
    common: deCommon,
    auth: deAuth,
    admin: deAdmin,
    hero: deHero,
    services: deServices,
    howItWorks: deHowItWorks,
    about: deAbout,
    research: deResearch,
    success: deSuccess,
    testimonials: deTestimonials,
    footer: deFooter,
    contact: deContact,
    projects: deProjects,
    home: deHome,
    seo: deSEO,
    blog: deBlog,
    consultation: deConsultation,
    legal: deLegal,
    cookies: deCookies,
    member: deMember,
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
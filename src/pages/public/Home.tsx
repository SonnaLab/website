import { HeroSection } from '@/components/public/HeroSection';
import { ServicesSection } from '@/components/public/ServicesSection';
import { HowItWorksSection } from '@/components/public/HowItWorksSection';
import { AboutSection } from '@/components/public/AboutSection';
import { SuccessSection } from '@/components/public/SuccessSection';
import ResearchSection from '@/components/public/ResearchSection';
import { SEO, OrganizationStructuredData, WebsiteStructuredData } from '@/components/seo';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation('home');
  return (
    <>
      <OrganizationStructuredData />
      <WebsiteStructuredData />
      <SEO
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
        url="/"
        image="/images/home-og.png"
      />
      <div id="home">
        <HeroSection />
      </div>
      <div id="services">
        <ServicesSection />
      </div>
      <HowItWorksSection />
      <div id="about">
        <AboutSection />
      </div>
      <div id="research">
        <ResearchSection />
      </div>
      <SuccessSection />
      {/* <div id="testimonials">
        <TestimonialsSection />
      </div> 
      */}

    </>
  );
}
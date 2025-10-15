import { HeroSection } from '../components/HeroSection';
import { ServicesSection } from '../components/ServicesSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { AboutSection } from '../components/AboutSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { SuccessSection } from '../components/SuccessSection';
import ResearchSection from '../components/ResearchSection';

export default function Home() {
  return (
    <>
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
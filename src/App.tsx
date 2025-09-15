import React from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { AboutSection } from './components/AboutSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { SuccessSection } from './components/SuccessSection';
import { Footer } from './components/Footer';
import ResearchSection from './components/ResearchSection';


export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-0">
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <AboutSection />
        <ResearchSection />
        <TestimonialsSection />
        <SuccessSection />
      </main>
      <Footer />
    </div>
  );
}
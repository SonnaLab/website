import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin, Send } from 'lucide-react';
import sonnaLabLogo from '../assets/logo/wSonnaLab.png';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation('footer');
  const currentYear = new Date().getFullYear();

  // Extraction des données depuis la traduction
  const newsletter = t('newsletter', { returnObjects: true }) as {
    title: string;
    description: string;
    inputPlaceholder: string;
    subscribe: string;
  };
  const company = t('company', { returnObjects: true }) as {
    description: string;
    address: { line1: string; line2: string };
  };
  const sections = t('sections', { returnObjects: true }) as Array<{ about: string; services: string; policies: string }>[0];
  const quickLinks = t('quickLinks', { returnObjects: true }) as Array<{ label: string; href: string }>;
  const services = t('services', { returnObjects: true }) as Array<{ label: string; href: string }>;
  const policies = t('policies', { returnObjects: true }) as Array<{ label: string; href: string }>;
  const social = t('social', { returnObjects: true }) as { followUs: string };
  const bottom = t('bottom', { returnObjects: true }) as { 
    copyright: string, 
    certifications: string[] 
  };

  return (
    <footer className="bg-black text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-2">{newsletter.title}</h3>
              <p className="text-gray-300">{newsletter.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder={newsletter.inputPlaceholder}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-300"
              />
              <Button className="bg-white text-black hover:bg-gray-200">
                <Send className="w-4 h-4 mr-2" />
                {newsletter.subscribe}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <img 
                src={sonnaLabLogo} 
                alt="SonnaLab" 
                className="h-12 w-auto"
              />
            </div>
            <p className="text-gray-300 leading-relaxed">
              {company.description}
            </p>
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-white" />
                <div>
                  <div className="font-medium">{company.address.line1}</div>
                  <div className="text-sm text-gray-400">{company.address.line2}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">{sections.about}</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-6">{sections.services}</h4>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index}>
                  <a
                    href={service.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {service.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-6">{sections.policies}</h4>
            <ul className="space-y-3 mb-6">
              {policies.map((policy, index) => (
                <li key={index}>
                  <a
                    href={policy.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {policy.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Social Media */}
            <div>
              <h5 className="font-medium mb-3">{social.followUs}</h5>
              <div className="flex space-x-3">
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Bottom Footer */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-gray-400 text-sm">
            {t('bottom.copyright', { year: currentYear })}
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-400">
            {bottom.certifications.map((cert, index) => (
              <span key={index}>{cert}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { 
  Send, 
  MapPin, 
  Mail, 
  Phone,
  Linkedin, 
  Twitter, 
  Github, 
  Instagram,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import sonnaLabLogo from '../assets/logo/wSonnaLab.png';
import { motion, AnimatePresence } from 'framer-motion';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

export function Footer() {
  const { t, i18n } = useTranslation('footer');
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Extraction typée des données
  const newsletter = t('newsletter', { returnObjects: true }) as {
    title: string;
    description: string;
    inputPlaceholder: string;
    subscribe: string;
    success: string;
  };

  const company = t('company', { returnObjects: true }) as {
    description: string;
    address: { line1: string; line2: string };
    contact: { email: string; phone: string };
  };

  const sections = t('sections', { returnObjects: true }) as {
    about: FooterSection;
    services: FooterSection;
    legal: FooterSection;
  };

  const social = t('social', { returnObjects: true }) as {
    title: string;
    description: string;
    links: {
      linkedin: string;
      twitter: string;
      github: string;
      instagram: string;
    };
  };

  const bottom = t('bottom', { returnObjects: true }) as {
    copyright: string;
    certifications: string[];
    madeWith: string;
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Simulation d'un appel API
    console.log('Newsletter subscription:', email);
    
    // Afficher le succès
    setIsSubscribed(true);
    setEmail('');

    // Reset après 3 secondes
    setTimeout(() => {
      setIsSubscribed(false);
    }, 3000);
  };

  const socialIcons = {
    linkedin: Linkedin,
    twitter: Twitter,
    github: Github,
    instagram: Instagram,
  };

  return (
    <footer className="bg-black text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {newsletter.title}
              </h3>
              <p className="text-gray-300">{newsletter.description}</p>
            </motion.div>
            
            <motion.form 
              onSubmit={handleNewsletterSubmit}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                type="email"
                placeholder={newsletter.inputPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-white/40 h-12"
                required
                disabled={isSubscribed}
              />
              <Button 
                type="submit" 
                disabled={isSubscribed}
                className="bg-white text-black hover:bg-gray-200 h-12 px-8 font-semibold"
              >
                <AnimatePresence mode="wait">
                  {isSubscribed ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {newsletter.success}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="subscribe"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {newsletter.subscribe}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-12">
          {/* Company Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Link to="/" className="inline-block">
              <img 
                src={sonnaLabLogo} 
                alt="SonnaLab" 
                className="h-12 w-auto hover:scale-105 transition-transform"
              />
            </Link>
            
            <p className="text-gray-300 leading-relaxed text-sm">
              {company.description}
            </p>

            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <a 
                href={`mailto:${company.contact.email}`}
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>{company.contact.email}</span>
              </a>
              
              <a 
                href={`tel:${company.contact.phone}`}
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
              >
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>{company.contact.phone}</span>
              </a>
              <div className="flex items-start gap-3 text-gray-300">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-white">{company.address.line1}</div>
                  <div className="text-gray-400">{company.address.line2}</div>
                </div>
              </div>
              
            </div>
          </motion.div>

          {/* About Links */}
          <FooterLinksSection section={sections.about} delay={0.1} />

          {/* Services Links */}
          <FooterLinksSection section={sections.services} delay={0.2} />

          {/* Legal Links & Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-8"
          >
            {/* Legal Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6">{sections.legal.title}</h4>
              <ul className="space-y-3">
                {sections.legal.links.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-gray-300 hover:text-white transition-colors text-sm inline-flex items-center gap-2 group"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h5 className="font-semibold mb-3">{social.title}</h5>
              <p className="text-gray-400 text-sm mb-4">{social.description}</p>
              <div className="flex gap-3">
                {Object.entries(social.links).map(([platform, url]) => {
                  const Icon = socialIcons[platform as keyof typeof socialIcons];
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all hover:scale-110"
                      aria-label={platform}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Bottom Footer */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            {t('bottom.copyright', { year: currentYear })}
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-400">
            {bottom.certifications.map((cert, index) => (
              <span key={index} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                {cert}
              </span>
            ))}
          </div>
          
          <div className="text-gray-400 text-sm">
            {bottom.madeWith}
          </div>
        </div>
      </div>
    </footer>
  );
}

// Composant réutilisable pour les sections de liens
function FooterLinksSection({ section, delay }: { section: FooterSection; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <h4 className="text-lg font-semibold mb-6">{section.title}</h4>
      <ul className="space-y-3">
        {section.links.map((link, index) => (
          <li key={index}>
            <Link
              to={link.href}
              className="text-gray-300 hover:text-white transition-colors text-sm inline-flex items-center gap-2 group"
            >
              <span>{link.label}</span>
              {link.href.startsWith('http') && (
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
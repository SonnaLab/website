import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin, Send } from 'lucide-react';
import sonnaLabLogo from '../assets/logo/wSonnaLab.png';

export function Footer() {
  const quickLinks = [
    { label: 'À propos', href: '#about' },
    { label: 'Nos Services', href: '#services' },
    { label: 'Portfolio', href: '#portfolio' },
    { label: 'Recherche & Développement', href: '#research' },
    { label: 'Blog Tech', href: '#blog' },
    { label: 'Contact', href: '#contact' }
  ];

  const services = [
    { label: 'Développement Web', href: '#web-dev' },
    { label: 'Applications Mobile', href: '#mobile-dev' },
    { label: 'Tech Consulting', href: '#cto-consulting' },
    { label: 'UI/UX Design', href: '#design' },
    { label: 'E-commerce', href: '#ecommerce' },
    { label: 'Intelligence Artificielle', href: '#ai' }
  ];

  const policies = [
    { label: 'Politique de Confidentialité', href: '#privacy' },
    { label: 'Conditions de Service', href: '#terms' },
    { label: 'Politique Qualité', href: '#quality' },
    { label: 'Mentions Légales', href: '#legal' },
    { label: 'Cookies', href: '#cookies' }
  ];

  return (
    <footer className="bg-black text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-2">Restez à la Pointe de l'Innovation</h3>
              <p className="text-gray-300">Recevez nos insights tech, tendances IA et analyses du marché directement dans votre boîte mail.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-300"
              />
              <Button className="bg-white text-black hover:bg-gray-200">
                <Send className="w-4 h-4 mr-2" />
                S'abonner
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
              Laboratoire d’innovation digitale : SonnaLab accompagne votre transformation technologique, du conseil stratégique à la création d’applications sur mesure. Propulsez votre entreprise vers l’excellence et l’avenir.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-white" />
                <div>
                  <div className="font-medium">Station F, Paris</div>
                  <div className="text-sm text-gray-400">Paris, France</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Liens Rapides</h4>
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
            <h4 className="text-lg font-semibold mb-6">Nos Services</h4>
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
            <h4 className="text-lg font-semibold mb-6">Légal & Politiques</h4>
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
              <h5 className="font-medium mb-3">Suivez-nous</h5>
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
            © {new Date().getFullYear()} | SonnaLab. Tous droits réservés.
            </div>
          <div className="flex items-center space-x-6 text-sm text-gray-400">
            <span>French Tech</span>
            <span>ISO 27001</span>  
            <span>RGPD Conforme</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
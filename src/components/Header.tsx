'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { Menu, Phone, Mail, MapPin, Calendar, FileText } from 'lucide-react';
import sonnaLabLogo from '../assets/logo/bSonnaLab.png';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);

  const navigation = [
    { name: 'Accueil', href: '#home' },
    { name: 'À propos', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Projets', href: '#projects' },
    { name: 'Blog', href: '#blog' },
    { name: 'Contact', href: '#contact' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
      
      // Determine if we're over a dark background section
      const heroHeight = window.innerHeight * 0.6; // Hero section height
      
      if (offset < heroHeight) {
        // Over hero section - light background
        setIsDarkBackground(false);
      } else {
        // Check specific sections
        const footerSection = document.querySelector('footer');
        const testimonialsSection = document.querySelector('#testimonials');
        
        if (footerSection) {
          const footerTop = footerSection.offsetTop;
          if (offset >= footerTop - 100) {
            // Over footer - dark background
            setIsDarkBackground(true);
            return;
          }
        }
        
        if (testimonialsSection) {
          const testimonialsTop = testimonialsSection.offsetTop;
          const testimonialsBottom = testimonialsTop + testimonialsSection.offsetHeight;
          if (offset >= testimonialsTop - 100 && offset < testimonialsBottom + 100) {
            // Over testimonials - potentially dark background
            setIsDarkBackground(true);
            return;
          }
        }
        
        // Default to light background for other sections
        setIsDarkBackground(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic text colors based on background - now using only black/white
  const textColor = isDarkBackground ? 'text-white drop-shadow-sm' : 'text-black';
  const textColorSecondary = isDarkBackground ? 'text-gray-100 drop-shadow-sm' : 'text-gray-700';
  const logoColor = isDarkBackground ? 'text-white drop-shadow-sm' : 'text-black';

  return (
    <header className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-7xl rounded-full transition-all duration-300 ${
      scrolled 
        ? 'bg-white/20 backdrop-blur-lg shadow-2xl border border-white/30' 
        : 'bg-white/10 backdrop-blur-sm'
    }`}>
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img 
            src={sonnaLabLogo} 
            alt="SonnaLab" 
            className={`h-10 w-auto transition-all duration-300 ${
              isDarkBackground && !scrolled ? 'brightness-0 invert' : ''
            }`}
          />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors duration-300 hover:text-gray-400 ${
                scrolled ? 'text-gray-700 drop-shadow-none' : textColorSecondary
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            className={`transition-all duration-300 ${
              scrolled 
                ? 'border-gray-700 text-gray-700 hover:bg-gray-700 hover:text-white bg-white/50 backdrop-blur-sm' 
                : isDarkBackground 
                  ? 'border-white/70 text-white hover:bg-white/20 hover:text-white bg-white/10 backdrop-blur-sm drop-shadow-sm'
                  : 'border-gray-700 text-gray-700 hover:bg-gray-700 hover:text-white bg-white/50 backdrop-blur-sm'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Portfolio
          </Button>
          <Button 
            size="sm" 
            className={`transition-all duration-300 ${
              scrolled || !isDarkBackground
                ? 'bg-black hover:bg-gray-800 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white border border-white/50 backdrop-blur-sm drop-shadow-sm'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Consultation
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              className={`transition-colors duration-300 ${
                scrolled ? 'text-black hover:bg-white/50' : 
                isDarkBackground ? 'text-white hover:bg-white/20 drop-shadow-sm' : 'text-black hover:bg-white/50'
              }`}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetTitle className="sr-only">Menu de Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Menu de navigation mobile pour le site SonnaLab
            </SheetDescription>
            <div className="flex flex-col space-y-6 mt-6">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-lg font-medium text-gray-700 hover:text-gray-400 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              
              <div className="flex flex-col space-y-3 pt-6 border-t">
                <Button variant="outline" className="border-gray-700 text-gray-700 hover:bg-gray-700 hover:text-white">
                  <FileText className="w-4 h-4 mr-2" />
                  Portfolio
                </Button>
                <Button className="bg-black hover:bg-gray-800">
                  <Calendar className="w-4 h-4 mr-2" />
                  Consultation
                </Button>
              </div>

              <div className="flex flex-col space-y-3 pt-6 border-t text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>+33 (0)1 23 45 67 89</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>hello@sonnalab.fr</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Paris, France</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
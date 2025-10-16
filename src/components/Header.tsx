'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { Menu, Phone, Mail, MapPin, Calendar, FileText } from 'lucide-react';
import { LanguageSwitcher } from './utils/LanguageSwitcher';
import sonnaLabLogo from '../assets/logo/bSonnaLab.png';

export function Header() {
  const { t } = useTranslation('header');
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);

  const navigation = [
    { name: t('nav.home'), href: '/', section: 'home' },
    { name: t('nav.about'), href: '/', section: 'about' },
    { name: t('nav.services'), href: '/', section: 'services' },
    { name: t('nav.research'), href: '/', section: 'research' },
    { name: t('nav.projects'), href: '/projects', section: null },
    { name: t('nav.blog'), href: '/', section: 'blog' },
    { name: t('nav.contact'), href: '/contact', section: null },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
      
      const heroHeight = window.innerHeight * 0.6;
      
      if (offset < heroHeight) {
        setIsDarkBackground(false);
      } else {
        const footerSection = document.querySelector('footer');
        const testimonialsSection = document.querySelector('#testimonials');
        
        if (footerSection) {
          const footerTop = footerSection.offsetTop;
          if (offset >= footerTop - 100) {
            setIsDarkBackground(true);
            return;
          }
        }
        
        if (testimonialsSection) {
          const testimonialsElement = testimonialsSection as HTMLElement;
          const testimonialsTop = testimonialsElement.offsetTop;
          const testimonialsBottom = testimonialsTop + testimonialsElement.offsetHeight;
          if (offset >= testimonialsTop - 100 && offset < testimonialsBottom + 100) {
            setIsDarkBackground(true);
            return;
          }
        }
        
        setIsDarkBackground(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigationClick = (href: string, section: string | null) => (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (section) {
      if (location.pathname === '/') {
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    } else {
      navigate(href);
    }
    
    setIsOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleConsultationClick = () => {
    navigate('/contact');
  };

  const textColorSecondary = isDarkBackground ? 'text-gray-100 drop-shadow-sm' : 'text-gray-700';

  return (
    <header className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-7xl rounded-full transition-all duration-300 ${
      scrolled 
        ? 'bg-white/20 backdrop-blur-lg shadow-2xl border border-white/30' 
        : 'bg-white/10 backdrop-blur-sm'
    }`}>
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <a href="/" onClick={handleLogoClick} className="cursor-pointer">
            <img 
              src={sonnaLabLogo} 
              alt="SonnaLab" 
              className={`h-10 w-auto transition-all duration-300 ${
                isDarkBackground && !scrolled ? 'brightness-0 invert' : ''
              }`}
            />
          </a>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.section ? `#${item.section}` : item.href}
              onClick={handleNavigationClick(item.href, item.section)}
              className={`text-sm font-medium transition-colors duration-300 hover:text-gray-400 cursor-pointer ${
                scrolled ? 'text-gray-700 drop-shadow-none' : textColorSecondary
              } ${location.pathname === item.href && !item.section ? 'underline underline-offset-4' : ''}`}
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-3">
          <LanguageSwitcher />
          <Button 
            size="sm"
            onClick={handleConsultationClick}
            className={`transition-all duration-300 group ${
              scrolled || !isDarkBackground
                ? 'bg-black hover:bg-gray-800 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white border border-white/50 backdrop-blur-sm drop-shadow-sm'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            {t('cta.consultation')}
          </Button>
        </div>

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
            <SheetTitle className="sr-only">{t('accessibility.menuTitle')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('accessibility.menuDescription')}
            </SheetDescription>
            <div className="flex flex-col space-y-6 mt-6">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.section ? `#${item.section}` : item.href}
                  onClick={handleNavigationClick(item.href, item.section)}
                  className={`text-lg font-medium text-gray-700 hover:text-gray-400 transition-colors cursor-pointer ${
                    location.pathname === item.href && !item.section ? 'text-black font-bold' : ''
                  }`}
                >
                  {item.name}
                </a>
              ))}
              
              <div className="flex flex-col space-y-3 pt-6 border-t">
                <Button variant="outline" className="border-gray-700 text-gray-700 hover:bg-gray-700 hover:text-white">
                  <FileText className="w-4 h-4 mr-2" />
                  {t('cta.portfolio')}
                </Button>
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    handleConsultationClick();
                  }}
                  className="bg-black hover:bg-gray-800"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('cta.consultation')}
                </Button>
              </div>

              <div className="flex flex-col space-y-3 pt-6 border-t">
                <LanguageSwitcher />
              </div>

              <div className="flex flex-col space-y-3 pt-6 border-t text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{t('mobile.phone')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{t('mobile.email')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{t('mobile.location')}</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
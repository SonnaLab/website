'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Menu, Phone, Mail, MapPin, X, LockKeyhole } from 'lucide-react';
import { LanguageSwitcher } from '@/components/utils/LanguageSwitcher';
import { useNavigation } from '@/hooks/useNavigation';
import sonnaLabLogo from '@/assets/logo/bSonnaLab.png';
import { useLanguageTracking } from '@/hooks/useAnalytics';

export function Header() {
  const { t } = useTranslation('header');
  const { handleNavigationClick } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const { trackLanguageChange } = useLanguageTracking();

  const navigation = [
    { name: t('nav.home'), href: '/', section: 'home' },
    { name: t('nav.about'), href: '/', section: 'about' },
    { name: t('nav.services'), href: '/', section: 'services' },
    { name: t('nav.research'), href: '/', section: 'research' },
    { name: t('nav.projects'), href: '/projects', section: null },
    { name: t('nav.blog'), href: '/blog', section: null },
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

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const textColorSecondary = isDarkBackground ? 'text-gray-100 drop-shadow-sm' : 'text-gray-700';

  return (
    <header className={`fixed top-0 left-0 z-50 w-full border-b-2 border-black transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-lg shadow-sm'
        : 'bg-white/80 backdrop-blur-sm'
    }`}>
      <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <a href="/" onClick={handleLogoClick} className="cursor-pointer">
            <img 
              src={sonnaLabLogo} 
              alt="SonnaLab" 
              className="h-10 w-auto"
            />
          </a>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.section ? `#${item.section}` : item.href}
              onClick={handleNavigationClick(item.href, item.section)}
              className={`text-sm font-medium transition-colors duration-300 hover:text-gray-400 cursor-pointer text-gray-700
                ${location.pathname === item.href && !item.section ? 'underline underline-offset-4' : ''}`}
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-3">
          <LanguageSwitcher />
          <Button 
            size="sm"
            asChild
            className="bg-black hover:bg-gray-800 text-white transition-all duration-300"
          >
            <Link to="/sign-in">{t('cta.signIn')}<LockKeyhole className="ml-2 h-7 w-7" /></Link>
          </Button>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-black hover:bg-gray-100 transition-colors duration-300"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-80 p-0" showClose={false}>
            <SheetTitle className="sr-only">{t('accessibility.menuTitle')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('accessibility.menuDescription')}
            </SheetDescription>
            
            {/* Mobile Sidebar Content */}
            <div className="flex flex-col h-full">
              {/* Header avec logo et close button */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <img 
                  src={sonnaLabLogo} 
                  alt="SonnaLab" 
                  className="h-8 w-auto"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-10 w-10 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto px-6 py-8">
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.section ? `#${item.section}` : item.href}
                      onClick={handleNavigationClick(item.href, item.section)}
                      className={`block px-4 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer ${
                        location.pathname === item.href && !item.section
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                      }`}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </nav>

              {/* Bottom Section */}
              <div className="border-t border-gray-100 p-6 space-y-6 bg-gray-50">
                {/* Language Switcher */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    Langue
                  </p>
                  <LanguageSwitcher />
                </div>

                {/* CTA Button */}
                <Button 
                  asChild
                  className="w-full bg-black hover:bg-gray-800 text-white h-12 text-base font-semibold"
                >
                  <Link to="/sign-in" onClick={() => setIsOpen(false)}>{t('cta.signIn')}<LockKeyhole className="ml-2 h-5 w-5" /></Link>
                </Button>

                {/* Contact Info */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    Contact
                  </p>
                  <div className="space-y-2.5">
                    <a 
                      href={`tel:${t('mobile.phone')}`}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-gray-600 hover:text-black transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{t('mobile.phone')}</span>
                    </a>
                    <a 
                      href={`mailto:${t('mobile.email')}`}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-gray-600 hover:text-black transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{t('mobile.email')}</span>
                    </a>
                    <div className="flex items-center gap-3 px-2 py-2 text-sm text-gray-600">
                      <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{t('mobile.location')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface LegalPageLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdate: string;
}

export function LegalPageLayout({ children, title, lastUpdate }: LegalPageLayoutProps) {
  const { t } = useTranslation('legal');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('navigation.backToHome')}
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold">{title}</h1>
            </div>
            <p className="text-gray-300 text-sm">{lastUpdate}</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 lg:p-12"
        >
          {children}
        </motion.div>

        {/* Footer Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link 
            to="/legal/terms"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <FileText className="w-4 h-4" />
            {t('navigation.allPolicies')}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
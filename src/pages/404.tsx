import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound(): React.ReactElement {
    const { t } = useTranslation('404');

    useEffect(() => {
        document.title = t('title');
    }, [t]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center px-4">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                
                <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    {t('heading')}
                </h2>
                <p className="text-gray-600 mb-8 max-w-md">
                    {t('description')}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link 
                        to="/"
                        className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Home size={20} className="mr-2" />
                        {t('homeButton')}
                    </Link>
                    <button 
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        {t('backButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
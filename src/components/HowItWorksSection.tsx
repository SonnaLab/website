import React from 'react';
import { Card, CardContent } from './ui/card';
import { MessageCircle, PenTool, Code, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModal } from './providers/ModalProvider';

export function HowItWorksSection() {
  const { t } = useTranslation('howItWorks');
  const { openConsultationModal } = useModal();

  // Extraction des données depuis la traduction
  const title = t('title');
  const subtitle = t('subtitle');
  const steps = t('steps', { returnObjects: true }) as Array<{
    title: string;
    description: string;
    duration: string;
  }>;

  // Définir un tableau d'icônes pour chaque étape.
  const icons = [MessageCircle, PenTool, Code, Rocket];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">{title}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = icons[index % icons.length];
            const stepNumber = (index + 1).toString().padStart(2, '0'); // formate comme "01", "02", etc.
            return (
              <div key={index} className="relative">
                {/* Ligne de connexion (affichée seulement sur grand écran) */}
                {index < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gray-200 z-0"
                    style={{ transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    </div>
                  </div>
                )}

                <Card className="relative z-10 bg-white/80 border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    {/* Numéro de l'étape */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                        {stepNumber}
                      </div>
                    </div>

                    {/* Icône */}
                    <div className="mb-4 mt-2">
                      <div className="w-16 h-16 mx-auto rounded-full bg-white/80 flex items-center justify-center text-gray-600">
                        <IconComponent className="w-8 h-8" />
                      </div>
                    </div>

                    {/* Titre et description */}
                    <h3 className="text-lg font-semibold text-black mb-3">{step.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-4 bg-white p-6 rounded-2xl shadow-lg">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-black">{t('cta.ready')}</h3>
              <p className="text-gray-600">
                {t('cta.discuss')}
              </p>
            </div>
            <button className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium" onClick={openConsultationModal}>
              {t('cta.contact')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
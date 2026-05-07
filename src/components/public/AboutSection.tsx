import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Code, Brain, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/providers/ModalProvider';

export function AboutSection() {
  const { t } = useTranslation('about');
  const { openConsultationModal } = useModal();

  // Extraction des textes depuis la traduction
  const mission = t('mission', { returnObjects: true }) as {
    title: string;
    description: string;
  };
  const features = t('features', { returnObjects: true }) as {
    column1: Array<{ title: string; description: string }>;
    column2: Array<{ title: string; description: string }>;
  };
  const achievements = t('achievements', { returnObjects: true }) as Array<{
    label: string;
    description: string;
  }>;
  const cta = t('cta', { returnObjects: true }) as {
    title: string;
    description: string;
    primary: string;
    secondary: string;
  };

  // Définition des icônes pour les réalisations (achievements)
  const achievementIcons = [Rocket, Brain, Code, Lightbulb];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Mission Statement */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-gilroy font-bold text-black mb-6">
            {mission.title}
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              {mission.description}
            </p>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                {features.column1.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {index === 0 ? (
                      <Lightbulb className="w-6 h-6 text-black mt-1 shrink-0" />
                    ) : (
                      <Code className="w-6 h-6 text-black mt-1 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-gilroy font-semibold text-black mb-1">
                        {item.title}
                      </h4>
                      <p className="text-gray-700">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {features.column2.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {index === 0 ? (
                      <Brain className="w-6 h-6 text-black mt-1 shrink-0" />
                    ) : (
                      <Rocket className="w-6 h-6 text-black mt-1 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-gilroy font-semibold text-black mb-1">
                        {item.title}
                      </h4>
                      <p className="text-gray-700">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {achievements.map((achievement, index) => {
            const IconComponent = achievementIcons[index] || Lightbulb;
            return (
              <Card key={index} className="text-center p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white/80 backdrop-blur-sm">
                <CardContent className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-black flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-gilroy font-bold text-black">
                    {achievement.label}
                  </div>
                  <p className="text-gray-700 text-sm">
                    {achievement.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-black rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-gilroy font-bold mb-4">
              {cta.title}
            </h3>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              {cta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-white text-black font-gilroy font-semibold rounded-lg hover:bg-gray-100 transition-colors" onClick={openConsultationModal}>
                {cta.primary}
              </button>
              <button className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                {cta.secondary}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
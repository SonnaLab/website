import React from 'react';
import { Star, Trophy, Target, Users, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SuccessSection() {
  const { t } = useTranslation('success');

  // Extraction des données depuis la traduction
  const title = t('title');
  const description = t('description');
  const metrics = t('metrics', { returnObjects: true }) as Array<{
    icon: string;
    value: string;
    label: string;
    description: string;
  }>;
  const banner = t('banner', { returnObjects: true }) as { 
    items: Array<{ value: string; caption: string }>
  };

  // Mapping pour associer les clés d'icônes aux composants de lucide-react
  const iconMapping: { [key: string]: React.ElementType } = {
    Star,
    Trophy,
    Target,
    Users,
    ThumbsUp
  };

  return (
    <section id="success" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-gilroy font-bold text-black mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {metrics.map((metric, index) => {
            const IconComponent = iconMapping[metric.icon] || Star;
            return (
              <div
                key={index}
                className="text-center bg-gray-50 rounded-2xl p-8 hover:bg-gray-100 transition-all duration-300 border border-gray-200"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-6">
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                <div className="space-y-2">
                  <div className="text-4xl font-gilroy font-bold text-black">
                    {metric.value}
                  </div>
                  <h3 className="font-gilroy font-semibold text-black">
                    {metric.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {metric.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlight banner */}
        <div className="mt-16 bg-black rounded-2xl p-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {banner.items.map((item, index) => (
              <div key={index}>
                <div className="text-2xl font-gilroy font-bold text-white mb-2">
                  {item.value}
                </div>
                <p className="text-gray-300">{item.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
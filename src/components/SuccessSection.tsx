import React from 'react';
import { Star, Trophy, Users, Target, ThumbsUp } from 'lucide-react';

export function SuccessSection() {
  const successMetrics = [
    {
      icon: Star,
      value: '4.9/5',
      label: 'Note Moyenne',
      description: 'Excellence reconnue',
      color: 'text-yellow-500'
    },
    {
      icon: Trophy,
      value: '100+',
      label: 'Projets Réalisés',
      description: 'Solutions déployées',
      color: 'text-black'
    },
    {
      icon: Target,
      value: '85+',
      label: 'Solutions déployées',
      description: 'En production',
      color: 'text-black'
    },
    {
      icon: Users,
      value: '98%',
      label: 'Clients Satisfaits',
      description: 'Taux de satisfaction',
      color: 'text-black'
    },
    {
      icon: ThumbsUp,
      value: '92%',
      label: 'Nous recommandent',
      description: 'Recommandation active',
      color: 'text-black'
    }
  ];

  return (
    <section id="success" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-gilroy font-bold text-black mb-4">
            Nos Succès
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Des résultats concrets qui témoignent de notre expertise et de notre engagement 
            envers l'excellence technologique.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {successMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
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

                {metric.icon === Star && (
                  <div className="flex justify-center mt-4 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Highlight banner */}
        <div className="mt-16 bg-black rounded-2xl p-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div>
              <div className="text-2xl font-gilroy font-bold text-white mb-2">
                +5 ans d'expérience
              </div>
              <p className="text-gray-300">Dans l'innovation tech</p>
            </div>
            
            <div>
              <div className="text-2xl font-gilroy font-bold text-white mb-2">
                3 applications phares
              </div>
              <p className="text-gray-300">Lescopr, Lebocheur, Lecolt</p>
            </div>
            
            <div>
              <div className="text-2xl font-gilroy font-bold text-white mb-2">
                24/7 Support
              </div>
              <p className="text-gray-300">Accompagnement continu</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
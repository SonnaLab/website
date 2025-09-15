import React from 'react';
import { Card, CardContent } from './ui/card';
import { MessageCircle, PenTool, Code, Rocket } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      icon: MessageCircle,
      title: 'Échangeons',
      description: 'Nous discutons de votre projet, vos objectifs et contraintes pour définir la solution idéale.',
      color: 'bg-gray-50 border-gray-200',
      iconColor: 'text-gray-600',
      step: '01'
    },
    {
      icon: PenTool,
      title: 'On Conçoit',
      description: 'Nous créons les maquettes et prototypes de votre solution en respectant vos attentes.',
      color: 'bg-gray-50 border-gray-200',
      iconColor: 'text-gray-600',
      step: '02'
    },
    {
      icon: Code,
      title: 'On Développe',
      description: 'Notre équipe développe votre solution avec les dernières technologies et meilleures pratiques.',
      color: 'bg-gray-50 border-gray-200',
      iconColor: 'text-gray-600',
      step: '03'
    },
    {
      icon: Rocket,
      title: 'On Lance',
      description: 'Mise en ligne, formation et accompagnement pour assurer le succès de votre projet.',
      color: 'bg-gray-50 border-gray-200',
      iconColor: 'text-gray-600',
      step: '04'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
            Notre Processus
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            De l'idée à la réalisation, découvrez notre approche collaborative et transparente pour donner vie à votre projet digital.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            
            return (
              <div key={index} className="relative">
                {/* Connecting Line (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gray-200 z-0" 
                       style={{ transform: 'translateX(-50%)' }}>
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    </div>
                  </div>
                )}
                
                <Card className={`relative z-10 ${step.color} border-2 hover:shadow-lg transition-all duration-300`}>
                  <CardContent className="p-6 text-center">
                    {/* Step Number */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                        {step.step}
                      </div>
                    </div>
                    
                    {/* Icon */}
                    <div className="mb-4 mt-2">
                      <div className={`w-16 h-16 mx-auto rounded-full bg-white/80 flex items-center justify-center ${step.iconColor}`}>
                        <IconComponent className="w-8 h-8" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg font-semibold text-black mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
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
              <h3 className="text-lg font-semibold text-black">Prêt à commencer ?</h3>
              <p className="text-gray-600">Discutons de votre projet et transformons vos idées en réalité.</p>
            </div>
            <button className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium">
              Discutons-en
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
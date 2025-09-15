import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Globe, Smartphone, ShoppingCart, Palette, BarChart3, Code } from 'lucide-react';

export function ServicesSection() {
  const services = [
    {
      icon: Globe,
      title: 'Sites Web',
      description: 'Sites vitrines, corporatifs et institutionnels modernes et performants',
      tests: ['Landing Page', 'Site Vitrine', 'Site Corporate', 'Portfolio'],
      turnaround: '2-4 semaines'
    },
    {
      icon: Smartphone,
      title: 'Applications Mobiles',
      description: 'Apps natives et cross-platform pour iOS et Android',
      tests: ['App Native', 'React Native', 'Flutter', 'PWA'],
      turnaround: '6-12 semaines'
    },
    {
      icon: ShoppingCart,
      title: 'E-commerce',
      description: 'Solutions de vente en ligne complètes et optimisées',
      tests: ['Shopify', 'WooCommerce', 'Custom Shop', 'Marketplace'],
      turnaround: '4-8 semaines'
    },
    {
      icon: Palette,
      title: 'Design UX/UI',
      description: 'Conception d\'interfaces utilisateur modernes et intuitives',
      tests: ['Wireframes', 'Prototypes', 'Design System', 'User Testing'],
      turnaround: '1-3 semaines'
    },
    {
      icon: BarChart3,
      title: 'Stratégie Digital',
      description: 'Conseil et accompagnement dans votre transformation digitale',
      tests: ['Audit Digital', 'Stratégie SEO', 'Analytics', 'Growth Hacking'],
      turnaround: '1-2 semaines'
    },
    {
      icon: Code,
      title: 'Développement Sur-Mesure',
      description: 'Solutions personnalisées adaptées à vos besoins spécifiques',
      tests: ['API', 'SaaS', 'CRM', 'Intégrations'],
      turnaround: '4-16 semaines'
    }
  ];

  return (
    <section id="services" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
            Nos Services
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            De la conception à la mise en ligne, nous créons des solutions digitales sur-mesure qui répondent à vos objectifs business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-black" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {service.turnaround}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-black">
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">Technologies :</h4>
                    <div className="flex flex-wrap gap-1">
                      {service.tests.map((test, testIndex) => (
                        <Badge key={testIndex} variant="outline" className="text-xs border-gray-300 text-gray-700">
                          {test}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="outline" className="border-black text-black hover:bg-black hover:text-white">
                      En savoir plus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-black hover:bg-gray-800 text-white px-8">
            Voir tous nos services
          </Button>
        </div>
      </div>
    </section>
  );
}
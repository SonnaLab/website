import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Smartphone, ShoppingCart, Palette, BarChart3, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ServicesSection() {
  const { t } = useTranslation('services');

  // Extraire individuellement les valeurs de la traduction
  const title = t('title');
  const subtitle = t('subtitle');
  const cta = t('cta', { returnObjects: true }) as { more: string; all: string };
  const items = t('items', { returnObjects: true }) as Array<{
    icon: string;
    title: string;
    description: string;
    tests: string[];
    turnaround: string;
  }>;

  // Mapping des clés d'icônes aux composants correspondants
  const iconMapping: { [key: string]: React.ElementType } = {
    globe: Globe,
    smartphone: Smartphone,
    "shopping-cart": ShoppingCart,
    palette: Palette,
    "bar-chart-3": BarChart3,
    code: Code
  };

  return (
    <section id="services" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => {
            const IconComponent = iconMapping[item.icon] || Globe;
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-black" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.turnaround}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-black">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">
                      Technologies :
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {item.tests.map((test, testIndex) => (
                        <Badge key={testIndex} variant="outline" className="text-xs border-gray-300 text-gray-700">
                          {test}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="outline" className="border-black text-black hover:bg-black hover:text-white">
                      {cta.more}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-black hover:bg-gray-800 text-white px-8">
            {cta.all}
          </Button>
        </div>
      </div>
    </section>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { University, FlaskConical, Rocket, Brain, Shield, Cloud, Blocks } from "lucide-react";
import { useTranslation } from 'react-i18next';

// Mapping pour associer les clés d'icônes aux composants de lucide-react
const iconMapping: { [key: string]: React.ElementType } = {
  Brain,
  Blocks,
  Cloud,
  Shield,
  FlaskConical,
  Rocket,
  University
};

export default function ResearchSection() {
  const { t } = useTranslation('research');

  // Extraction du titre, sous-titre, zones de recherche et partenaires depuis la traduction
  const title = t('title');
  const subtitle = t('subtitle');
  const areas = t('areas', { returnObjects: true }) as Array<{
    title: string;
    description: string;
    technologies: string[];
    status: string;
    icon: string;
    color: string;
  }>;
  const partners = t('partners', { returnObjects: true }) as Array<{
    icon: string;
    title: string;
    description: string;
  }>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En cours":
      case "In Progress":
        return "bg-green-100 text-green-800 border-green-200";
      case "Recherche":
      case "Research":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Développement":
      case "Development":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {areas.map((area, index) => {
            const IconComponent = iconMapping[area.icon] || Brain;
            return (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-white shadow-sm ${area.color.replace('text-', 'bg-').replace('-600', '-50')}`}>
                      <IconComponent className={`h-6 w-6 ${area.color}`} />
                    </div>
                    <Badge className={`${getStatusColor(area.status)} font-medium`}>
                      {area.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900 mb-3">
                    {area.title}
                  </CardTitle>
                  <p className="text-gray-600 leading-relaxed">
                    {area.description}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {area.technologies.map((tech, techIndex) => (
                      <Badge key={techIndex} variant="outline" className="text-xs bg-white hover:bg-gray-50">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {partners.map((partner, index) => {
            const IconPartner = iconMapping[partner.icon] || University;
            return (
              <Card key={index} className="text-center bg-white border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <IconPartner className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {partner.title}
                  </h3>
                  <p className="text-gray-600">
                    {partner.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Award, Shield, Users, Clock, CheckCircle, Code, Brain, Lightbulb, Rocket } from 'lucide-react';

export function AboutSection() {
  const achievements = [
    { icon: Rocket, label: '100+', description: 'Projets Réalisés' },
    { icon: Users, label: '50+', description: 'Clients Satisfaits' },
    { icon: Code, label: '15+', description: 'Technologies Maîtrisées' },
    { icon: Brain, label: '24/7', description: 'Innovation Continue' }
  ];



  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Mission Statement */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-gilroy font-bold text-black mb-6">
            À propos de SonnaLab
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              SonnaLab est le laboratoire d'idées qui transforme le digital. Nous accompagnons les entreprises 
              dans leur transformation technologique en proposant des solutions innovantes, de la recherche et 
              développement aux applications concrètes. Notre mission : être votre référence en conseil technologique.
            </p>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="w-6 h-6 text-black mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-gilroy font-semibold text-black mb-1">Innovation Continue</h4>
                    <p className="text-gray-700">Recherche et développement sur l'écosystème tech, de l'IA aux matériaux de fabrication des puces.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Code className="w-6 h-6 text-black mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-gilroy font-semibold text-black mb-1">Développement Sur Mesure</h4>
                    <p className="text-gray-700">Applications web et mobile, e-commerce, UI/UX design - toute l'expertise d'une agence moderne.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Brain className="w-6 h-6 text-black mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-gilroy font-semibold text-black mb-1">Conseil Technologique</h4>
                    <p className="text-gray-700">Positionnement CTO pour vos projets tech avec une expertise reconnue et des solutions éprouvées.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Rocket className="w-6 h-6 text-black mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-gilroy font-semibold text-black mb-1">Applications Lancées</h4>
                    <p className="text-gray-700">Lescopr, Lebocheur, Lecolt - nos solutions déjà adoptées et qui font leurs preuves sur le marché.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {achievements.map((achievement, index) => {
            const IconComponent = achievement.icon;
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
              Prêt à Transformer Votre Vision en Réalité ?
            </h3>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Rejoignez les entreprises qui font confiance à SonnaLab pour leur transformation digitale. 
              De l'idée au déploiement, nous sommes votre partenaire technologique de référence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-white text-black font-gilroy font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                Démarrer un Projet
              </button>
              <button className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                Découvrir Nos Solutions
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
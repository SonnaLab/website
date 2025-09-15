import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Calendar, Zap, Users, Lightbulb } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function HeroSection() {
  return (
    <section id="home" className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-black">
                Le laboratoire d'idées qui
                <span className="text-gray-700"> transforme le digital</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                Nous concevons et développons des solutions digitales innovantes 
                qui propulsent votre entreprise vers l'avenir.
              </p>
            </div>

            {/* Quick Project Search */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Décrivez votre projet (e.g., Site web, App mobile, E-commerce)"
                    className="pl-10 h-12 border-gray-200"
                  />
                </div>
                <Button size="lg" className="h-12 px-8 bg-black hover:bg-gray-800">
                  <Calendar className="w-5 h-5 mr-2" />
                  Discutons-en
                </Button>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gray-700" />
                <span>Livraison Agile</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-700" />
                <span>50+ Clients Satisfaits</span>
              </div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-gray-700" />
                <span>Innovation Continue</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-tr from-gray-100 to-gray-50 p-8">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1753715613434-9c7cb58876b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB0ZWNoJTIwb2ZmaWNlJTIwZGlnaXRhbCUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NTc1MzA5NzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Espace de travail digital moderne et innovant"
                className="w-full h-96 object-cover rounded-xl"
              />
              
              {/* Floating Stats Cards */}
              <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg border">
                <div className="text-2xl font-bold text-black">150+</div>
                <div className="text-sm text-gray-600">Projets Livrés</div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-white p-4 rounded-xl shadow-lg border">
                <div className="text-2xl font-bold text-gray-700">5 ans</div>
                <div className="text-sm text-gray-600">d'Excellence</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
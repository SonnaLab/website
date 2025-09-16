import React from 'react';
import { Card, CardContent } from './ui/card';
import { Star, Quote } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Marie Dubois', // CEO innovante dans la tech parisienne
      title: 'CEO, TechStart',
      location: 'Paris, France',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      rating: 5,
      text: "SonnaLab a transformé notre vision en réalité. Leur expertise technique et leur approche innovante nous ont permis de lancer notre plateforme SaaS en un temps record. Une équipe exceptionnelle !",
      projectType: 'Plateforme SaaS'
    },
    {
      name: 'Laurent Martin', // Directeur technique spécialisé en écotechnologie
      title: 'Directeur Technique, EcoTech',
      location: 'Lyon, France',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      rating: 5,
      text: "Le conseil technologique de SonnaLab nous a évité des erreurs coûteuses. Leur positionnement CTO externe nous a donné accès à une expertise de haut niveau. Résultats : +200% de performance.",
      projectType: 'Conseil CTO & Architecture'
    },
    {
      name: 'Sophie Leroy', // Fondatrice visionnaire dans l'EdTech
      title: 'Fondatrice, EdTech Solutions',
      location: 'Bordeaux, France',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      rating: 5,
      text: "L'application mobile développée par SonnaLab dépasse nos attentes. Interface intuitive, performances excellentes et livraison dans les délais. Un partenaire de confiance !",
      projectType: 'Application Mobile React Native'
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-gilroy font-bold text-black mb-4">
            Ils Nous Font Confiance
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Des startups aux grandes entreprises, découvrez comment SonnaLab transforme 
            les idées en succès technologiques concrets.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="relative flex-shrink-0">
                    <ImageWithFallback
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                      <Quote className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <h4 className="text-lg font-gilroy font-semibold text-black">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {testimonial.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {testimonial.location}
                    </p>
                  </div>
                </div>

                <blockquote className="text-gray-700 leading-relaxed mb-4">
                  "{testimonial.text}"
                </blockquote>

                <div className="inline-flex items-center px-3 py-1 bg-gray-900 text-white text-sm rounded-full">
                  {testimonial.projectType}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
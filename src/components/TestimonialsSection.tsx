import React from 'react';
import { Card, CardContent } from './ui/card';
import { Star, Quote } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';

export function TestimonialsSection() {
  const { t } = useTranslation('testimonials');

  // Extraction des données depuis la traduction
  const title = t('title');
  const description = t('description');
  const items = t('items', { returnObjects: true }) as Array<{
    name: string;
    title: string;
    location: string;
    image: string;
    rating: number;
    text: string;
    projectType: string;
  }>;

  return (
    <section id="testimonials" className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-gilroy font-bold text-black mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-12">
          {items.map((testimonial, index) => (
            <Card key={index} className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardContent className="p-8 flex flex-col h-full">
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

                <blockquote className="text-gray-700 leading-relaxed mb-4 flex-grow">
                  "{testimonial.text}"
                </blockquote>

                <div className="inline-flex items-center px-3 py-1 bg-gray-900 text-white text-sm rounded-full self-start mt-auto">
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
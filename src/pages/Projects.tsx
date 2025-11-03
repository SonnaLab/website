import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Sparkles, 
  Users, 
  Target,
  TrendingUp,
  Zap,
  ArrowRight, 
  ExternalLink,
  Check,
  Activity,
  BookOpen,
  Palette,
  Calendar,
  Bell,
  Rocket,
  Shield,
  Eye,
  Heart,
  ChevronRight
} from 'lucide-react';
import { SEO } from '../components/seo';

export default function Projects() {
  const { t } = useTranslation('projects');
  const navigate = useNavigate();
  const [activeProject, setActiveProject] = useState<string>('lescopr');

  const stats = [
    { icon: Target, value: t('stats.projects.value'), label: t('stats.projects.label') },
    { icon: Users, value: t('stats.users.value'), label: t('stats.users.label') },
    { icon: Heart, value: t('stats.satisfaction.value'), label: t('stats.satisfaction.label') },
    { icon: TrendingUp, value: t('stats.uptime.value'), label: t('stats.uptime.label') },
  ];

  const projects = [
    {
      id: 'lescopr',
      icon: Activity,
      website: 'https://lescopr.com',
      category: 'DevOps & Monitoring',
    },
    {
      id: 'lebocheur',
      icon: BookOpen,
      website: 'https://lebocheur.com',
      category: 'Éducation & Apprentissage',
    },
    {
      id: 'lecolt',
      icon: Palette,
      website: 'https://lecolt.com',
      category: 'Art & Créativité',
      comingSoon: true,
    },
  ];

  const ecosystem = t('ecosystem.items', { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  return (
    <>
      <SEO
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
        url="/projects"
        image="/images/projects-og.png"
      />
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 bg-gray-50 overflow-hidden">
        {/* Background Effects - Subtle */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-5xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 bg-black/5 backdrop-blur-sm px-5 py-2.5 rounded-full mb-8">
              <Sparkles className="w-5 h-5 text-black" />
              <span className="text-sm font-semibold text-black tracking-wide">{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-black mb-6">
              {t('hero.title')}
            </h1>
            
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>
        
            {/* Stats Grid - Alternative avec séparateurs */}
            <div className="max-w-6xl mx-auto mt-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x-2 lg:divide-gray-100">
                {stats.map((stat, index) => (
                    <div 
                    key={index} 
                    className="group text-center lg:px-8 transition-all duration-300 hover:scale-105"
                    >
            
                    {/* Value */}
                    <div className="mb-3">
                        <h2 className="block text-xl md:text-xl font-black text-black tracking-tight group-hover:text-gray-800 transition-colors">
                        {stat.value}
                        </h2>
                    </div>

                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                        <stat.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
            
                    {/* Label */}
                    <p className="text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider leading-tight">
                        {stat.label}
                    </p>
                    </div>
                ))}
                </div>
            </div>
        </div>
      </section>

      {/* Projects Showcase */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          {/* Project Navigation */}
          <div className="flex justify-center mb-16">
            <div className="inline-flex bg-gray-50 rounded-2xl p-2 shadow-lg border-2 border-gray-100">
              {projects.map((project) => {
                const Icon = project.icon;
                return (
                  <button
                    key={project.id}
                    onClick={() => setActiveProject(project.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-semibold ${
                      activeProject === project.id
                        ? 'bg-black text-white shadow-lg scale-105'
                        : 'text-gray-600 hover:bg-white hover:text-black'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{t(`${project.id}.title`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Project Display */}
          {projects.map((project) => {
            if (activeProject !== project.id) return null;

            const Icon = project.icon;
            const features = t(`${project.id}.features.list`, { returnObjects: true }) as string[];
            const techStack = t(`${project.id}.tech.stack`, { returnObjects: true }) as string[];
            const highlights = t(`${project.id}.highlights`, { returnObjects: true }) as string[];

            return (
              <div key={project.id} className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  {/* Content Side */}
                  <div className="space-y-8">
                    {/* Header */}
                    <div>
                      <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full mb-4">
                        <Icon className="w-4 h-4 text-black" />
                        <span className="text-sm font-medium text-black">{t(`${project.id}.badge`)}</span>
                      </div>

                      {project.comingSoon && (
                        <div className="inline-flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full mb-4 ml-2">
                          <Rocket className="w-4 h-4 text-black" />
                          <span className="text-sm font-semibold text-black">
                            {t(`${project.id}.launch`)}
                          </span>
                        </div>
                      )}

                      <h2 className="text-5xl lg:text-6xl font-black text-black mb-4">
                        {t(`${project.id}.title`)}
                      </h2>

                      <p className="text-2xl font-bold mb-4 text-black">
                        {t(`${project.id}.tagline`)}
                      </p>

                      <p className="text-lg text-gray-700 leading-relaxed">
                        {t(`${project.id}.description`)}
                      </p>
                    </div>

                    {/* Highlights */}
                    <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-100">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {highlights.map((highlight, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-black shrink-0" />
                            <span className="text-sm font-medium text-gray-800">{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
                        <Shield className="w-6 h-6" />
                        {t(`${project.id}.features.title`)}
                      </h3>
                      <div className="grid gap-3">
                        {features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3 group">
                            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-gray-800 font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tech Stack */}
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-4">
                        {t(`${project.id}.tech.title`)}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {techStack.map((tech, idx) => (
                          <Badge 
                            key={idx} 
                            className="px-4 py-2 bg-black text-white border-0 hover:scale-105 transition-transform font-medium"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-4 pt-4">
                      {project.website ? (
                        <>
                          <Button
                            size="lg"
                            className="bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all shadow-lg group"
                            onClick={() => window.open(project.website!, '_blank')}
                          >
                            <ExternalLink className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                            {t(`${project.id}.cta.visit`)}
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-2 border-black text-black hover:bg-black hover:text-white hover:scale-105 transition-all"
                            onClick={() => navigate('/contact')}
                          >
                            <Calendar className="w-5 h-5 mr-2" />
                            {t(`${project.id}.cta.demo`)}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="lg"
                            className="bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all shadow-lg group"
                            onClick={() => navigate('/contact')}
                          >
                            <Bell className="w-5 h-5 mr-2" />
                            {t(`${project.id}.cta.notify`)}
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-2 border-black text-black hover:bg-black hover:text-white hover:scale-105 transition-all"
                            onClick={() => navigate('/contact')}
                          >
                            <ArrowRight className="w-5 h-5 mr-2" />
                            {t(`${project.id}.cta.learn`)}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                                
                {/* Visual Side - 3D Mockup Style */}
                <div className="relative perspective-1000">
                  <div className="relative transform-gpu hover:rotate-y-2 transition-transform duration-700">
                    <div className="rounded-3xl p-8">
                      {/* Browser Chrome */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <div className="w-3 h-3 rounded-full bg-yellow-400" />
                          <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-lg ml-4 flex items-center px-3 justify-center">
                          <span className="text-xs text-gray-400">{project.website}</span>
                        </div>
                      </div>
                      
                      {/* Screenshot/Content */}
                      <div className="aspect-16/10 rounded-xl overflow-hidden">
                        <img 
                          src={`/projects/${project.id}.png`}
                          alt={t(`${project.id}.title`)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ecosystem Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
              {t('ecosystem.title')}
            </h2>
            <p className="text-xl text-gray-700">
              {t('ecosystem.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {ecosystem.map((item, index) => {
              const icons = [Eye, Users, Shield];
              const Icon = icons[index];

              return (
                <Card key={index} className="border-2 border-gray-100 shadow-lg hover:shadow-xl hover:border-black transition-all group">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-black mb-4">{item.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white text-white relative overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 text-black">
              {t('cta.title')}
            </h2>
            <p className="text-xl mb-10 leading-relaxed text-black">
              {t('cta.description')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-6">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 hover:scale-105 transition-all shadow-xl text-lg px-8 py-6"
                onClick={() => navigate('/contact')}
              >
                <Calendar className="w-6 h-6 mr-2" />
                {t('cta.button')}
              </Button>
            <Button
                size="lg"
                className="bg-black text-white hover:bg-white hover:text-black hover:border-black hover:scale-105 transition-all text-lg px-8 py-6"
                onClick={() => navigate('/contact')}
            >
                <ChevronRight className="w-6 h-6 mr-2" />
                {t('cta.contact')}
            </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
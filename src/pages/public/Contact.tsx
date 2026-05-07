import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PhoneInput } from '../components/ui/phone-input';
import { Card, CardContent } from '../components/ui/card';
import { Mail, Phone, MapPin, Send, MessageCircle, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createContactSchema, ContactFormInputs } from '../schemas/contactSchema';
import { apiService } from '../services/api';
import { SEO } from '../components/seo';
import { useFormTracking } from '../hooks/useAnalytics';
import { analytics } from '../services/analytics/AnalyticsService';
import { getCachedUserCountry } from '../services/geolocation';
import { CountryCode } from 'libphonenumber-js';

export default function Contact() {
  const { t } = useTranslation('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [defaultCountry, setDefaultCountry] = useState<CountryCode>('FR');

  const contactSchema = createContactSchema(t);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ContactFormInputs>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      role: '',
      project_type: '',
      budget: '',
      message: '',
    },
  });

  const { trackStart, trackSubmit, trackError } = useFormTracking('contact_form');

  useEffect(() => {
    async function loadCountry() {
      const country = await getCachedUserCountry();
      setDefaultCountry(country);
    }
    loadCountry();
  }, []);

  const onSubmit: SubmitHandler<ContactFormInputs> = async (data) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      console.log('📞 Submitting phone:', data.phone);
      await apiService.submitContactForm(data);
      trackSubmit(true, { project_type: data.project_type });
      analytics.trackConsultationRequest(data.project_type);
      setSubmitStatus('success');
      reset();
      
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      trackSubmit(false);
      trackError([error.response?.data?.message || 'submission_failed']);
      setSubmitStatus('error');
      setErrorMessage(
        error.response?.data?.message || 
        t('form.error')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectTypeOptions = t('form.project_type.options', { returnObjects: true }) as string[];
  const budgetOptions = t('form.budget.options', { returnObjects: true }) as string[];

  return (
    <>
      <SEO
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
        url="/contact"
        image="/images/contact-og.png"
      />
      <section className="relative py-20 bg-linear-to-br from-gray-50 to-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-100/50 mask-[linear-gradient(0deg,transparent,black)]" />

        <div className="container mx-auto relative px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-black/5 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-6 h-6 text-black" />
              <span className="text-md font-medium text-black">{t('hero.header')}</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-black mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <Card className="border-0 shadow-xl">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" onFocus={trackStart}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="block mb-2 font-medium text-gray-700">
                        {t('form.first_name.label')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="first_name"
                        {...register('first_name')}
                        placeholder={t('form.first_name.placeholder')}
                        className={`h-12 ${errors.first_name ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.first_name && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.first_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block mb-2 font-medium text-gray-700">
                        {t('form.last_name.label')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="last_name"
                        {...register('last_name')}
                        placeholder={t('form.last_name.placeholder')}
                        className={`h-12 ${errors.last_name ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.last_name && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block mb-2 font-medium text-gray-700">
                        {t('form.email.label')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder={t('form.email.placeholder')}
                        className={`h-12 ${errors.email ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block mb-2 font-medium text-gray-700">
                        {t('form.phone.label')} <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <PhoneInput
                            value={value}
                            onChange={(val) => onChange(val || '')}
                            defaultCountry={defaultCountry}
                            placeholder={t('form.phone.placeholder')}
                            disabled={isSubmitting}
                            error={!!errors.phone}
                          />
                        )}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company" className="block mb-2 font-medium text-gray-700">
                        {t('form.company.label')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="company"
                        {...register('company')}
                        placeholder={t('form.company.placeholder')}
                        className={`h-12 ${errors.company ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.company && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.company.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="role" className="block mb-2 font-medium text-gray-700">
                        {t('form.role.label')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="role"
                        {...register('role')}
                        placeholder={t('form.role.placeholder')}
                        className={`h-12 ${errors.role ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.role && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.role.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="project_type" className="block mb-2 font-medium text-gray-700">
                        {t('form.project_type.label')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="project_type"
                        {...register('project_type')}
                        className={`w-full h-12 px-4 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent bg-white ${
                          errors.project_type ? 'border-red-500' : 'border-gray-200'
                        }`}
                        disabled={isSubmitting}
                      >
                        <option value="">{t('form.project_type.placeholder')}</option>
                        {projectTypeOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors.project_type && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.project_type.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="budget" className="block mb-2 font-medium text-gray-700">
                        {t('form.budget.label')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="budget"
                        {...register('budget')}
                        className={`w-full h-12 px-4 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent bg-white ${
                          errors.budget ? 'border-red-500' : 'border-gray-200'
                        }`}
                        disabled={isSubmitting}
                      >
                        <option value="">{t('form.budget.placeholder')}</option>
                        {budgetOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors.budget && (
                        <p className="mt-1 text-sm text-red-600 text-error">{errors.budget.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block mb-2 font-medium text-gray-700">
                      {t('form.message.label')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      {...register('message')}
                      placeholder={t('form.message.placeholder')}
                      className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent ${
                        errors.message ? 'border-red-500' : 'border-gray-200'
                      }`}
                      rows={6}
                      disabled={isSubmitting}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600 text-error">{errors.message.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-gray-800 text-white h-12 group"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('form.submitting')}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                        {t('form.submit')}
                      </>
                    )}
                  </Button>

                  {submitStatus === 'success' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <p className="text-green-800 text-sm">{t('form.success')}</p>
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-red-800 text-sm">{errorMessage}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">{t('info.email.title')}</h3>
                      <p className="text-gray-600 font-medium">{t('info.email.value')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('info.email.description')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">{t('info.phone.title')}</h3>
                      <p className="text-gray-600 font-medium">{t('info.phone.value')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('info.phone.description')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">{t('info.address.title')}</h3>
                      <p className="text-gray-600 font-medium">{t('info.address.value')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('info.address.description')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-black text-white">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{t('info.availability.title')}</h3>
                      <p className="text-gray-300">{t('info.availability.schedule')}</p>
                      <p className="text-gray-300">{t('info.availability.response')}</p>
                      <p className="text-white font-medium mt-2">{t('info.availability.emergency')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
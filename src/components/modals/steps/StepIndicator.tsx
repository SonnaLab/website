import React from 'react';
import { Check } from 'lucide-react';
import { ModalStep } from '../../../types/consultation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface StepIndicatorProps {
  currentStep: ModalStep;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const { t } = useTranslation('consultation');

  const steps = [
    { number: 1, label: t('step.type') },
    { number: 2, label: t('step.details') },
    { number: 3, label: t('step.contact') },
    { number: 4, label: t('step.confirmation') },
  ];

  return (
    <div className="w-full py-6 px-4 bg-gray-50 border-b">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -z-10">
            <motion.div
              className="h-full bg-black"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
            </div>

          {/* Steps */}
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center gap-2 relative z-10">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  currentStep > step.number
                    ? 'bg-black text-white'
                    : currentStep === step.number
                    ? 'bg-black text-white ring-4 ring-black/20'
                    : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}
                initial={false}
                animate={{
                  scale: currentStep === step.number ? 1.1 : 1,
                }}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </motion.div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  currentStep >= step.number ? 'text-black' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
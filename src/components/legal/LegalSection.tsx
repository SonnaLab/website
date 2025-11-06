import React from 'react';

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function LegalSection({ title, children, className = '' }: LegalSectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
        {title}
      </h2>
      <div className="text-gray-700 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
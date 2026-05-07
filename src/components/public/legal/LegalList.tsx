import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface LegalListProps {
  items: string[];
  variant?: 'bullet' | 'check' | 'number';
}

export function LegalList({ items, variant = 'bullet' }: LegalListProps) {
  if (variant === 'check') {
    return (
      <ul className="space-y-2 my-4">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (variant === 'number') {
    return (
      <ol className="list-decimal list-inside space-y-2 my-4 ml-2">
        {items.map((item, index) => (
          <li key={index} className="text-gray-700 pl-2">
            {item}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-disc list-inside space-y-2 my-4 ml-2">
      {items.map((item, index) => (
        <li key={index} className="text-gray-700 pl-2">
          {item}
        </li>
      ))}
    </ul>
  );
}
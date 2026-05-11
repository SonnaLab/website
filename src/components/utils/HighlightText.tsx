import { Fragment } from 'react';

interface HighlightTextProps {
  text: string;
  className?: string;
}

export function HighlightText({ text, className }: HighlightTextProps) {
  const segments = text.split(/(==.+?==)/g).filter(Boolean);

  return (
    <span className={['hl-wrap', className].filter(Boolean).join(' ')}>
      {segments.map((segment, index) => {
        const isHighlighted = segment.startsWith('==') && segment.endsWith('==');
        const key = `${segment}-${index}`;

        if (isHighlighted) {
          return (
            <mark key={key} className="hl">
              {segment.slice(2, -2)}
            </mark>
          );
        }

        return <Fragment key={key}>{segment}</Fragment>;
      })}
    </span>
  );
}
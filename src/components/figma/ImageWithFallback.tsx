import React, { useState, useEffect } from 'react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholderSrc?: string; // ✨ Nouveau : image placeholder
  loading?: 'lazy' | 'eager';
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);

  const { 
    src, 
    placeholderSrc, 
    alt, 
    style, 
    className, 
    loading = 'lazy',
    ...rest 
  } = props;

  useEffect(() => {
    // Démarrer avec le placeholder si disponible
    if (placeholderSrc) {
      setCurrentSrc(placeholderSrc);
    }

    // Précharger l'image haute résolution
    const img = new Image();
    img.src = src || '';
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setDidError(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, placeholderSrc]);

  const handleError = () => {
    setDidError(true);
  };

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={ERROR_IMG_SRC} 
            alt="Error loading image" 
            {...rest} 
            data-original-url={src} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" style={style}>
      <img
        src={currentSrc}
        alt={alt}
        className={`transition-all duration-700 ease-out ${className ?? ''} ${
          !isLoaded && placeholderSrc 
            ? 'blur-2xl scale-105' 
            : 'blur-0 scale-100'
        }`}
        style={{
          ...style,
          filter: !isLoaded && placeholderSrc ? 'blur(20px)' : 'none',
        }}
        loading={loading}
        onError={handleError}
        {...rest}
      />
      
      {/* Loading overlay */}
      {!isLoaded && placeholderSrc && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      )}
    </div>
  );
}
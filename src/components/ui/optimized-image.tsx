
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  blurHash?: string;
  aspectRatio?: number;
  eager?: boolean;
  loading?: 'lazy' | 'eager';
  className?: string;
  containerClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = ({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  blurHash,
  aspectRatio,
  eager = false,
  loading = 'lazy',
  className,
  containerClassName,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(blurHash || '');
  const [isIntersecting, setIsIntersecting] = useState(eager);

  useEffect(() => {
    if (!eager && 'IntersectionObserver' in window) {
      const element = document.getElementById(`image-${src.replace(/[^a-zA-Z0-9]/g, '')}`);
      if (!element) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsIntersecting(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px 0px' }
      );
      
      observer.observe(element);
      return () => observer.disconnect();
    }
    
    return undefined;
  }, [src, eager]);

  useEffect(() => {
    if (!isIntersecting) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      setImageSrc(fallbackSrc);
      setHasError(true);
      if (onError) onError();
    };
  }, [src, fallbackSrc, isIntersecting, onLoad, onError]);

  // Calculate aspect ratio styling
  const aspectRatioStyle = aspectRatio
    ? {
        paddingBottom: `${(1 / aspectRatio) * 100}%`,
      }
    : undefined;

  return (
    <div 
      id={`image-${src.replace(/[^a-zA-Z0-9]/g, '')}`}
      className={cn('relative overflow-hidden', containerClassName)}
      style={aspectRatioStyle ? { position: 'relative', ...aspectRatioStyle } : undefined}
    >
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300 ease-in-out',
            isLoaded ? 'opacity-100' : 'opacity-0', 
            className
          )}
          loading={loading}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setImageSrc(fallbackSrc);
            setHasError(true);
          }}
          {...props}
        />
      )}
    </div>
  );
};

// Preload important images
export const preloadImage = (src: string): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
};

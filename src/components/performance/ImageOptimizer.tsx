import React, { useState, useRef, useEffect } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

export const ImageOptimizer: React.FC<ImageOptimizerProps> = React.memo(({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
  quality = 75
}) => {
  const [optimizedSrc, setOptimizedSrc] = useState(src);
  const [isWebPSupported, setIsWebPSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check WebP support
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const supported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      setIsWebPSupported(supported);
    };

    checkWebPSupport();
  }, []);

  useEffect(() => {
    if (isWebPSupported === null) return;

    // Generate optimized image URL
    const generateOptimizedUrl = () => {
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
        return src;
      }

      const url = new URL(src, window.location.origin);
      const params = new URLSearchParams();

      if (width) params.append('w', width.toString());
      if (height) params.append('h', height.toString());
      if (quality !== 75) params.append('q', quality.toString());
      if (isWebPSupported) params.append('format', 'webp');

      // Only add params if we have any
      if (params.toString()) {
        url.search = params.toString();
      }

      return url.toString();
    };

    setOptimizedSrc(generateOptimizedUrl());
  }, [src, width, height, quality, isWebPSupported]);

  // Generate srcSet for responsive images
  const generateSrcSet = () => {
    if (!width || !src) return undefined;

    const breakpoints = [0.5, 1, 1.5, 2];
    return breakpoints
      .map(multiplier => {
        const scaledWidth = Math.round(width * multiplier);
        const url = new URL(src, window.location.origin);
        const params = new URLSearchParams();
        
        params.append('w', scaledWidth.toString());
        if (height) params.append('h', Math.round(height * multiplier).toString());
        if (quality !== 75) params.append('q', quality.toString());
        if (isWebPSupported) params.append('format', 'webp');
        
        url.search = params.toString();
        return `${url.toString()} ${scaledWidth}w`;
      })
      .join(', ');
  };

  return (
    <LazyImage
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      srcSet={generateSrcSet()}
      sizes={sizes || (width ? `${width}px` : '100vw')}
    />
  );
});

ImageOptimizer.displayName = 'ImageOptimizer';

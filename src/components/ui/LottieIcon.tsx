import React from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

interface LottieIconProps {
  animationData: any;
  className?: string;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export const LottieIcon: React.FC<LottieIconProps> = ({
  animationData,
  className,
  width = 64,
  height = 64,
  loop = true,
  autoplay = true,
}) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Lottie
        animationData={animationData}
        width={width}
        height={height}
        loop={loop}
        autoplay={autoplay}
      />
    </div>
  );
};

export default LottieIcon;

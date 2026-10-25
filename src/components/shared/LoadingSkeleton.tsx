import {
  SkeletonLine,
  SkeletonCircle,
  SkeletonBlock,
  SkeletonStatCard,
} from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'circle' | 'chart' | 'table';
  /** Alias for type */
  variant?: string;
  count?: number;
  className?: string;
}

/**
 * Legacy loading-placeholder API, now rendered entirely from the
 * skeleton kit (.doc-shimmer base: token-driven, dark-mode-safe,
 * layout-matching shapes) instead of hardcoded pulse blocks.
 */
export const LoadingSkeleton = ({ type, variant, count = 1, className = '' }: LoadingSkeletonProps) => {
  const resolvedType = (type ?? (variant as LoadingSkeletonProps['type']) ?? 'card');
  const renderSkeleton = () => {
    switch (resolvedType) {
      case 'card':
        return (
          <div aria-hidden className={`vf-card p-5 ${className}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-3">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-8 w-32" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
            <SkeletonLine className="w-40" />
          </div>
        );

      case 'text':
        return (
          <div aria-hidden className={`space-y-2 ${className}`}>
            <SkeletonLine />
            <SkeletonLine className="w-5/6" />
            <SkeletonLine className="w-4/6" />
          </div>
        );

      case 'circle':
        return <SkeletonCircle className={`h-12 w-12 ${className}`} />;

      case 'chart':
        return (
          <div aria-hidden className={`vf-card p-5 ${className}`}>
            <div className="mb-4 space-y-2">
              <SkeletonLine className="w-32" />
              <SkeletonLine className="h-3 w-48" />
            </div>
            <SkeletonBlock className="h-48 rounded-lg" />
          </div>
        );

      case 'table':
        return (
          <div aria-hidden className={`vf-card p-5 ${className}`}>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonLine key={i} className={`h-10 ${i % 2 ? 'w-11/12' : 'w-full'}`} />
              ))}
            </div>
          </div>
        );

      default:
        return <SkeletonBlock className={`h-20 ${className}`} />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div aria-hidden className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-10 w-64" />
          <SkeletonLine className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-12 w-40 rounded-pill" />
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton type="chart" count={2} />
      </div>
    </div>
  );
};

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'circle' | 'chart' | 'table';
  count?: number;
  className?: string;
}

export const LoadingSkeleton = ({ type = 'card', count = 1, className = '' }: LoadingSkeletonProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`vf-card p-5 animate-pulse ${className}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-3">
                <div className="h-3 bg-graphite-200 rounded w-24" />
                <div className="h-8 bg-graphite-200 rounded w-32" />
              </div>
              <div className="h-12 w-12 bg-graphite-200 rounded-xl" />
            </div>
            <div className="h-4 bg-graphite-200 rounded w-40" />
          </div>
        );
      
      case 'text':
        return (
          <div className={`animate-pulse space-y-2 ${className}`}>
            <div className="h-4 bg-graphite-200 rounded w-full" />
            <div className="h-4 bg-graphite-200 rounded w-5/6" />
            <div className="h-4 bg-graphite-200 rounded w-4/6" />
          </div>
        );
      
      case 'circle':
        return (
          <div className={`h-12 w-12 bg-graphite-200 rounded-full animate-pulse ${className}`} />
        );
      
      case 'chart':
        return (
          <div className={`vf-card p-5 animate-pulse ${className}`}>
            <div className="mb-4 space-y-2">
              <div className="h-4 bg-graphite-200 rounded w-32" />
              <div className="h-3 bg-graphite-200 rounded w-48" />
            </div>
            <div className="h-48 bg-graphite-200 rounded-lg" />
          </div>
        );
      
      case 'table':
        return (
          <div className={`vf-card p-5 animate-pulse ${className}`}>
            <div className="space-y-3">
              <div className="h-10 bg-graphite-200 rounded" />
              <div className="h-10 bg-graphite-100 rounded" />
              <div className="h-10 bg-graphite-200 rounded" />
              <div className="h-10 bg-graphite-100 rounded" />
              <div className="h-10 bg-graphite-200 rounded" />
            </div>
          </div>
        );
      
      default:
        return <div className={`h-20 bg-graphite-200 rounded animate-pulse ${className}`} />;
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
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-graphite-200 rounded animate-pulse" />
          <div className="h-10 w-64 bg-graphite-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-graphite-200 rounded animate-pulse" />
        </div>
        <div className="h-12 w-40 bg-graphite-200 rounded-pill animate-pulse" />
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <LoadingSkeleton type="card" count={4} />
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton type="chart" count={2} />
      </div>
    </div>
  );
};

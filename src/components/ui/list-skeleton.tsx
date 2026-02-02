import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  count?: number;
  variant?: "card" | "row" | "compact";
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({
  count = 3,
  variant = "card",
  showAvatar = false,
  className
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} variant={variant} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

function SkeletonItem({ 
  variant, 
  showAvatar 
}: { 
  variant: "card" | "row" | "compact"; 
  showAvatar: boolean;
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-2">
        {showAvatar && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className="flex items-center gap-4 p-4 border-b border-border last:border-0">
        {showAvatar && <Skeleton className="w-10 h-10 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {showAvatar && <Skeleton className="w-12 h-12 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface PageSkeletonProps {
  showHeader?: boolean;
  showTabs?: boolean;
  listCount?: number;
  className?: string;
}

export function PageSkeleton({
  showHeader = true,
  showTabs = false,
  listCount = 4,
  className
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}
      
      {showTabs && (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      )}

      <ListSkeleton count={listCount} showAvatar />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>

      {/* Chart Area */}
      <Card className="p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </Card>

      {/* Recent Activity */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <ListSkeleton count={3} variant="row" showAvatar />
      </div>
    </div>
  );
}

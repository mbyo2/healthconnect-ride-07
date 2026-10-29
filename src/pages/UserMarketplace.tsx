
import React from 'react';
import { UserMarketplace } from '@/components/connections/UserMarketplace';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard, SkeletonLine } from '@/components/ui/skeleton-kit';
import { Skeleton } from '@/components/ui/skeleton';

const UserMarketplacePage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8" role="status" aria-label="Loading marketplace">
        <p className="sr-only">Loading marketplace...</p>
        <div aria-hidden className="space-y-6">
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-72 max-w-full" />
            <SkeletonLine className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} className="h-44" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the marketplace.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <UserMarketplace />;
};

export default UserMarketplacePage;

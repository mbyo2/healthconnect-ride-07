
import React from 'react';
import { UserMarketplace } from '@/components/connections/UserMarketplace';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const UserMarketplacePage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

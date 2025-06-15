
import React from 'react';
import { UserMarketplace } from '@/components/connections/UserMarketplace';
import { useSession } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const UserMarketplacePage = () => {
  const session = useSession();

  if (!session?.user) {
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

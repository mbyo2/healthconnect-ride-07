
import React from 'react';
import { ConnectionsDashboard } from '@/components/connections/ConnectionsDashboard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Connections = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your connections.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <ConnectionsDashboard />;
};

export default Connections;

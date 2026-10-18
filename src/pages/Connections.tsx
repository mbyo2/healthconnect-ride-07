
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionsDashboard } from '@/components/connections/ConnectionsDashboard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Connections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your connections.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full min-h-[44px]">
              Log in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ConnectionsDashboard />;
};

export default Connections;

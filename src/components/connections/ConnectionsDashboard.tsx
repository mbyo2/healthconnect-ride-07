import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConnections } from '@/hooks/useConnections';
import { ConnectionCard } from './ConnectionCard';
import { PrimaryProviderCard } from './PrimaryProviderCard';
import { SearchProviders } from './SearchProviders';
import { useAuth } from '@/context/AuthContext';
import { Users, UserPlus, Star, Clock, CheckCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ConnectionsDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    connections,
    connectionsLoading,
    primaryProvider,
    updateConnection,
    assignPrimaryProvider,
    isUpdatingConnection,
    isAssigningProvider,
    getApprovedConnections,
    getPendingRequests,
    getSentRequests,
    getMyPatients,
    getMyProviders
  } = useConnections();

  const [activeTab, setActiveTab] = useState('overview');

  const handleApproveConnection = (connectionId: string) => {
    updateConnection({ connectionId, status: 'approved' });
  };

  const handleRejectConnection = (connectionId: string) => {
    updateConnection({ connectionId, status: 'rejected' });
  };

  const handleSetPrimaryProvider = (providerId: string) => {
    assignPrimaryProvider({ providerId });
  };

  if (connectionsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading connections...</div>
      </div>
    );
  }

  const approvedConnections = getApprovedConnections();
  const pendingRequests = getPendingRequests();
  const sentRequests = getSentRequests();
  const myPatients = getMyPatients();
  const myProviders = getMyProviders();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-xl md:text-3xl font-bold mb-2">Healthcare Connections</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Manage connections with providers and patients
        </p>
      </div>

      {/* Add marketplace button */}
      <div className="flex justify-center">
        <Button
          onClick={() => navigate('/marketplace-users')}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Browse User Marketplace
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">My Connections</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="search">Find Providers</TabsTrigger>
          <TabsTrigger value="primary">Primary Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvedConnections.length}</div>
                <p className="text-xs text-muted-foreground">Active connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingRequests.length}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            {profile?.role === 'health_personnel' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Patients</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myPatients.length}</div>
                  <p className="text-xs text-muted-foreground">Connected patients</p>
                </CardContent>
              </Card>
            )}

            {profile?.role === 'patient' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Providers</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myProviders.length}</div>
                  <p className="text-xs text-muted-foreground">Connected providers</p>
                </CardContent>
              </Card>
            )}

            {profile?.role === 'patient' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Primary Provider</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{primaryProvider ? '1' : '0'}</div>
                  <p className="text-xs text-muted-foreground">
                    {primaryProvider ? 'Assigned' : 'Not set'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Connections</CardTitle>
              <CardDescription>Your latest approved connections</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedConnections.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No connections yet. Start by searching for providers or sending connection requests.
                </p>
              ) : (
                <div className="space-y-4">
                  {approvedConnections.slice(0, 3).map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      onSetPrimary={handleSetPrimaryProvider}
                      isAssigningPrimary={isAssigningProvider}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Connections</CardTitle>
              <CardDescription>Manage your approved healthcare connections</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedConnections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No approved connections yet.
                </p>
              ) : (
                <div className="grid gap-4">
                  {approvedConnections.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      onSetPrimary={handleSetPrimaryProvider}
                      isAssigningPrimary={isAssigningProvider}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Connection requests waiting for your approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {pendingRequests.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      onApprove={handleApproveConnection}
                      onReject={handleRejectConnection}
                      showActions={true}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {sentRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sent Requests</CardTitle>
                <CardDescription>Connection requests you've sent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {sentRequests.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {pendingRequests.length === 0 && sentRequests.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search">
          <SearchProviders />
        </TabsContent>

        <TabsContent value="primary" className="space-y-4">
          <PrimaryProviderCard 
            primaryProvider={primaryProvider}
            onAssign={handleSetPrimaryProvider}
            isAssigning={isAssigningProvider}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

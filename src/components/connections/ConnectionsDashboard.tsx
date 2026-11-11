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
import { useUserRoles } from '@/context/UserRolesContext';
import { ALL_CLINICIAN_ROLES } from '@/config/roleConfig';
import { Users, UserPlus, Star, Clock, CheckCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ConnectionsDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { availableRoles, isPatient } = useUserRoles();
  // Any clinical cadre (doctor, nurse, pharmacist…) sees the provider-side
  // cards — never just the legacy 'health_personnel' string.
  const isClinician =
    availableRoles.some((r) => (ALL_CLINICIAN_ROLES as readonly string[]).includes(r)) ||
    profile?.role === 'health_personnel';
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
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-bold">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Care Network</span>
              </div>
              <h1 className="text-greeting mt-0.5">Healthcare Connections</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Manage your network of verified doctors, clinics, patients and primary care providers
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/marketplace-users')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-gold-ink text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            <Search className="h-4 w-4" />
            Browse User Marketplace
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="text-xs font-semibold transition-all">Overview</TabsTrigger>
            <TabsTrigger value="connections" className="text-xs font-semibold transition-all">Network</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs font-semibold transition-all">Requests</TabsTrigger>
            <TabsTrigger value="search" className="text-xs font-semibold transition-all">Find</TabsTrigger>
            <TabsTrigger value="primary" className="text-xs font-semibold transition-all">Primary Care</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Connections</span>
                  <div className="p-2 rounded-xl bg-primary-50 dark:bg-blue-950 text-primary-500">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">{approvedConnections.length}</div>
                <p className="text-xs text-slate-400 font-medium mt-1">Active verified connections</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Requests</span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">{pendingRequests.length}</div>
                <p className="text-xs text-slate-400 font-medium mt-1">Awaiting confirmation</p>
              </div>

              {isClinician && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Patients</span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                      <UserPlus className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">{myPatients.length}</div>
                  <p className="text-xs text-slate-400 font-medium mt-1">Direct patient roster</p>
                </div>
              )}

              {isPatient && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Providers</span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">{myProviders.length}</div>
                  <p className="text-xs text-slate-400 font-medium mt-1">Approved doctors &amp; specialists</p>
                </div>
              )}

              {isPatient && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Care</span>
                    <div className="p-2 rounded-xl bg-primary-50 dark:bg-blue-950 text-primary-500">
                      <Star className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">{primaryProvider ? '1' : '0'}</div>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {primaryProvider ? 'Primary Physician Assigned' : 'Not yet selected'}
                  </p>
                </div>
              )}
            </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="border-b border-border pb-4 mb-4">
              <h2 className="text-lg font-bold text-foreground">Recent Connections</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Your latest verified medical connections</p>
            </div>
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
            </div>
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
    </div>
  );
};

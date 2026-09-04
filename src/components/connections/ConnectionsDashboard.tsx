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
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="rounded-3xl bg-[#0f172a] text-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black shadow-md">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Care Network</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Healthcare Connections</h1>
              <p className="text-xs text-slate-400 font-medium">
                Manage your network of verified doctors, clinics, patients and primary care providers
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/marketplace-users')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0073ea] hover:bg-[#0060c7] text-white text-xs font-black shadow-sm shadow-[#0073ea]/30 transition-all active:scale-95 shrink-0"
          >
            <Search className="h-4 w-4" />
            Browse User Marketplace
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-5 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 rounded-2xl shadow-xs">
            <TabsTrigger value="overview" className="text-xs font-extrabold rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white transition-all">Overview</TabsTrigger>
            <TabsTrigger value="connections" className="text-xs font-extrabold rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white transition-all">Network</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs font-extrabold rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white transition-all">Requests</TabsTrigger>
            <TabsTrigger value="search" className="text-xs font-extrabold rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white transition-all">Find</TabsTrigger>
            <TabsTrigger value="primary" className="text-xs font-extrabold rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white transition-all">Primary Care</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Connections</span>
                  <div className="p-2 rounded-xl bg-[#e5f0ff] dark:bg-blue-950 text-[#0073ea]">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{approvedConnections.length}</div>
                <p className="text-xs text-slate-400 font-medium mt-1">Active verified connections</p>
              </div>

              <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Requests</span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{pendingRequests.length}</div>
                <p className="text-xs text-slate-400 font-medium mt-1">Awaiting confirmation</p>
              </div>

              {profile?.role === 'health_personnel' && (
                <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">My Patients</span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                      <UserPlus className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{myPatients.length}</div>
                  <p className="text-xs text-slate-400 font-medium mt-1">Direct patient roster</p>
                </div>
              )}

              {profile?.role === 'patient' && (
                <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">My Providers</span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{myProviders.length}</div>
                  <p className="text-xs text-slate-400 font-medium mt-1">Approved doctors &amp; specialists</p>
                </div>
              )}

              {profile?.role === 'patient' && (
                <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Primary Care</span>
                    <div className="p-2 rounded-xl bg-[#e5f0ff] dark:bg-blue-950 text-[#0073ea]">
                      <Star className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{primaryProvider ? '1' : '0'}</div>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {primaryProvider ? 'Primary Physician Assigned' : 'Not yet selected'}
                  </p>
                </div>
              )}
            </div>

          {/* Recent Activity */}
          <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="border-b border-[#e6e9ef] dark:border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Recent Connections</h2>
              <p className="text-xs text-slate-400 font-medium">Your latest verified medical connections</p>
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

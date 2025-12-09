
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConnections } from '@/hooks/useConnections';
import { useSession } from '@supabase/auth-helpers-react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { UserCard } from './UserCard';

interface UserWithServices {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  specialty?: string;
  bio?: string;
  city?: string;
  state?: string;
  services?: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    duration?: number;
  }>;
  products?: Array<{
    id: string;
    medication_name: string;
    description?: string;
    price: number;
    category: string;
    stock_quantity: number;
  }>;
  institution?: {
    id: string;
    name: string;
    type: string;
    address?: string;
  };
}

export const UserMarketplace = () => {
  const session = useSession();
  const { requestConnection, isRequestingConnection } = useConnections();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Get current user's profile to check their role
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user
  });

  // Fetch all users with their services and products (excluding patients for patient users)
  const { data: users, isLoading } = useQuery({
    queryKey: ['marketplace-users', searchTerm, activeTab],
    queryFn: async () => {
      if (!session?.user) throw new Error('Not authenticated');

      let baseQuery = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url,
          role,
          specialty,
          bio,
          city,
          state
        `)
        .neq('id', session.user.id);

      // Always exclude patients from the marketplace view
      baseQuery = baseQuery.neq('role', 'patient');

      // Filter by role if specific tab is selected
      if (activeTab !== 'all') {
        baseQuery = baseQuery.eq('role', activeTab as 'health_personnel' | 'admin');
      }

      // Apply search filter
      if (searchTerm) {
        baseQuery = baseQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }

      const { data: profilesData, error } = await baseQuery.limit(50);
      if (error) throw error;

      // Fetch services for health personnel
      const healthPersonnelIds = profilesData
        ?.filter(p => p.role === 'health_personnel')
        .map(p => p.id) || [];

      let servicesData = [];
      if (healthPersonnelIds.length > 0) {
        const { data: services } = await supabase
          .from('healthcare_services')
          .select('*')
          .in('provider_id', healthPersonnelIds);
        servicesData = services || [];
      }

      // Fetch institutions and their products
      const { data: institutions } = await supabase
        .from('healthcare_institutions')
        .select(`
          id,
          name,
          type,
          address,
          admin_id
        `);

      const { data: products } = await supabase
        .from('marketplace_products')
        .select(`
          id,
          medication_name,
          description,
          price,
          category,
          stock_quantity,
          pharmacy_id
        `)
        .eq('is_active', true);

      // Combine data
      const combinedUsers: UserWithServices[] = profilesData?.map(profile => {
        const userServices = servicesData.filter(s => s.provider_id === profile.id);
        const userInstitution = institutions?.find(i => i.admin_id === profile.id);
        const institutionProducts = userInstitution
          ? products?.filter(p => p.pharmacy_id === userInstitution.id) || []
          : [];

        return {
          ...profile,
          services: userServices,
          products: institutionProducts,
          institution: userInstitution
        };
      }) || [];

      return combinedUsers;
    },
    enabled: !!session?.user && !!currentUserProfile
  });

  const handleSendConnectionRequest = (targetUserId: string, targetRole: string) => {
    if (!session?.user) return;

    const isTargetProvider = targetRole === 'health_personnel';

    requestConnection({
      patient_id: isTargetProvider ? session.user.id : targetUserId,
      provider_id: isTargetProvider ? targetUserId : session.user.id,
      connection_type: 'manual',
      notes: `Connection request from ${session.user.email}`
    });
  };

  // Filter available tabs based on user role
  const getAvailableTabs = () => {
    return [
      { id: "all", label: "All Providers", count: users?.length || 0 },
      { id: "health_personnel", label: "Doctors & Specialists", count: users?.filter(u => u.role === 'health_personnel').length || 0 },
      { id: "admin", label: "Institutions", count: users?.filter(u => u.role === 'admin').length || 0 }
    ];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Healthcare Marketplace</h1>
        <p className="text-muted-foreground">
          Connect with healthcare providers{currentUserProfile?.role !== 'patient' ? ', patients,' : ''} and pharmacies
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, specialty, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full grid-cols-${getAvailableTabs().length}`}>
            {getAvailableTabs().map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label} ({tab.count})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onConnect={handleSendConnectionRequest}
            isConnecting={isRequestingConnection}
          />
        ))}
      </div>

      {users?.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? 'No users found matching your search.' : 'No users available.'}
          </p>
        </div>
      )}
    </div>
  );
};

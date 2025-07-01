import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConnections } from '@/hooks/useConnections';
import { useSession } from '@supabase/auth-helpers-react';
import { 
  Search, 
  MapPin, 
  Star, 
  MessageCircle, 
  Calendar,
  Pill,
  Stethoscope,
  Building,
  User,
  ShoppingCart,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
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

      // If current user is a patient, exclude other patients for privacy
      if (currentUserProfile?.role === 'patient') {
        baseQuery = baseQuery.neq('role', 'patient');
      }

      // Filter by role if specific tab is selected
      if (activeTab !== 'all') {
        // For patients, don't allow them to select patient tab
        if (currentUserProfile?.role === 'patient' && activeTab === 'patient') {
          return [];
        }
        baseQuery = baseQuery.eq('role', activeTab);
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

    const isUserPatient = currentUserProfile?.role === 'patient';
    const isTargetProvider = targetRole === 'health_personnel';

    // Prevent patients from connecting to other patients
    if (isUserPatient && targetRole === 'patient') {
      toast.error('Cannot connect with other patients for privacy reasons');
      return;
    }

    requestConnection({
      patient_id: isTargetProvider ? session.user.id : targetUserId,
      provider_id: isTargetProvider ? targetUserId : session.user.id,
      connection_type: 'manual',
      notes: `Connection request from ${session.user.email}`
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'health_personnel': return <Stethoscope className="h-4 w-4" />;
      case 'patient': return <User className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'health_personnel': return 'bg-blue-100 text-blue-800';
      case 'patient': return 'bg-green-100 text-green-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  // Filter available tabs based on user role
  const getAvailableTabs = () => {
    const allTabs = [
      { id: "all", label: "All Users", count: users?.length || 0 },
      { id: "health_personnel", label: "Providers", count: users?.filter(u => u.role === 'health_personnel').length || 0 },
      { id: "patient", label: "Patients", count: users?.filter(u => u.role === 'patient').length || 0 },
      { id: "admin", label: "Institutions", count: users?.filter(u => u.role === 'admin').length || 0 }
    ];

    // If current user is patient, remove patient tab
    if (currentUserProfile?.role === 'patient') {
      return allTabs.filter(tab => tab.id !== 'patient');
    }

    return allTabs;
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
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {user.first_name} {user.last_name}
                    </CardTitle>
                    {user.specialty && (
                      <p className="text-sm text-muted-foreground">{user.specialty}</p>
                    )}
                    {user.city && user.state && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {user.city}, {user.state}
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={getRoleColor(user.role)}>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(user.role)}
                    {user.role.replace('_', ' ')}
                  </div>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {user.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {user.bio}
                </p>
              )}

              {/* Institution Info */}
              {user.institution && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-800">{user.institution.name}</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">{user.institution.type}</p>
                  {user.institution.address && (
                    <p className="text-xs text-purple-600 mt-1">{user.institution.address}</p>
                  )}
                </div>
              )}

              {/* Services */}
              {user.services && user.services.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    Services Offered
                  </h4>
                  <div className="space-y-1">
                    {user.services.slice(0, 3).map((service) => (
                      <div key={service.id} className="flex justify-between items-center text-xs">
                        <span className="font-medium">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-bold">K{service.price}</span>
                          {service.duration && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duration}min
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {user.services.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{user.services.length - 3} more services
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Products */}
              {user.products && user.products.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-1">
                    <Pill className="h-3 w-3" />
                    Products Available
                  </h4>
                  <div className="space-y-1">
                    {user.products.slice(0, 3).map((product) => (
                      <div key={product.id} className="flex justify-between items-center text-xs">
                        <span className="font-medium">{product.medication_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-bold">K{product.price}</span>
                          <span className="text-muted-foreground">
                            Stock: {product.stock_quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                    {user.products.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{user.products.length - 3} more products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {user.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {user.phone}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleSendConnectionRequest(user.id, user.role)}
                  disabled={isRequestingConnection}
                  className="flex-1"
                >
                  <User className="h-3 w-3 mr-1" />
                  Connect
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat
                </Button>
                {user.role === 'health_personnel' && (
                  <Button size="sm" variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Book
                  </Button>
                )}
                {user.products && user.products.length > 0 && (
                  <Button size="sm" variant="outline">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Shop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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

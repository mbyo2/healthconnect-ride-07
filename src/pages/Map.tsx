
import React, { useState, useEffect } from 'react';
import ProviderMap from '@/components/ProviderMap';
import { ProviderList } from '@/components/ProviderList';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Provider } from '@/types/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { MobileOptimizedCard } from '@/components/ui/MobileOptimizedCard';
import { LoadingScreen } from '@/components/LoadingScreen';

const MapPage = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          bio,
          avatar_url,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq('role', 'health_personnel');

      if (error) throw error;

      return data.map((profile): Provider => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        specialty: profile.specialty || 'General Practice',
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        expertise: ['General Medicine', 'Primary Care'],
        location: profile.provider_locations?.[0] ? {
          latitude: profile.provider_locations[0].latitude ? Number(profile.provider_locations[0].latitude) : 37.7749,
          longitude: profile.provider_locations[0].longitude ? Number(profile.provider_locations[0].longitude) : -122.4194
        } : {
          latitude: -15.3875,
          longitude: 28.3228
        }
      }));
    }
  });

  // Get user's current location
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      toast.success('Location detected successfully');
    } catch (error) {
      console.error('Location detection failed:', error);
      toast.error('Failed to detect location');
    } finally {
      setLocationLoading(false);
    }
  };

  // Filter providers based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProviders(providers);
      return;
    }

    const filtered = providers.filter(provider =>
      `${provider.first_name} ${provider.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProviders(filtered);
  }, [providers, searchQuery]);

  if (isLoading) {
    return <LoadingScreen message="Loading healthcare providers..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-2 sm:p-4 space-y-4">
        {/* Header */}
        <MobileOptimizedCard compact>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Find Healthcare Providers
              </h1>
              <p className="text-sm text-muted-foreground">
                Discover nearby healthcare professionals
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              {locationLoading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              {locationLoading ? 'Detecting...' : 'My Location'}
            </Button>
          </div>
        </MobileOptimizedCard>

        {/* Search Bar */}
        <MobileOptimizedCard compact>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </MobileOptimizedCard>

        {/* User Location Display */}
        {userLocation && (
          <MobileOptimizedCard compact>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>
                Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </span>
            </div>
          </MobileOptimizedCard>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Provider List */}
          <div className="order-2 lg:order-1">
            <MobileOptimizedCard
              title="Healthcare Providers"
              description={`${filteredProviders.length} providers found`}
            >
              <ProviderList
                providers={filteredProviders}
                selectedProvider={selectedProvider}
                onProviderSelect={setSelectedProvider}
              />
            </MobileOptimizedCard>
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2">
            <MobileOptimizedCard
              title="Map View"
              className="h-[400px] sm:h-[500px] lg:h-[600px]"
            >
              <div className="h-full w-full">
                <ProviderMap
                  providers={filteredProviders}
                  userLocation={userLocation ? {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng
                  } : undefined}
                />
              </div>
            </MobileOptimizedCard>
          </div>
        </div>

        {/* Selected Provider Details */}
        {selectedProvider && (
          <MobileOptimizedCard
            title="Selected Provider"
            className="border-primary/20 dark:border-primary/30 bg-primary/5"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {selectedProvider.avatar_url && (
                  <img
                    src={selectedProvider.avatar_url}
                    alt={`${selectedProvider.first_name} ${selectedProvider.last_name}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {selectedProvider.first_name} {selectedProvider.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProvider.specialty}
                  </p>
                  {selectedProvider.bio && (
                    <p className="text-sm mt-2">{selectedProvider.bio}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => window.location.href = `/book/${selectedProvider.id}`}>
                  Book Appointment
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.href = `/provider/${selectedProvider.id}`}>
                  View Profile
                </Button>
              </div>
            </div>
          </MobileOptimizedCard>
        )}
      </div>
    </div>
  );
};

export default MapPage;

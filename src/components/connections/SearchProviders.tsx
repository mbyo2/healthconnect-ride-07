
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useConnections } from '@/hooks/useConnections';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export const SearchProviders = () => {
  const { user } = useAuth();
  const { requestConnection, isRequestingConnection } = useConnections();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connectionNotes, setConnectionNotes] = useState('');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['search-providers', searchTerm],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'health_personnel')
        .neq('id', user.id);

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const handleSendRequest = (providerId: string) => {
    if (!user) return;

    requestConnection({
      patient_id: user.id,
      provider_id: providerId,
      connection_type: 'manual',
      notes: connectionNotes
    });

    setSelectedProvider(null);
    setConnectionNotes('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Healthcare Providers
          </CardTitle>
          <CardDescription>
            Search for healthcare providers and send connection requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search by name or specialty</Label>
              <Input
                id="search"
                placeholder="e.g. Dr. Smith or Cardiology"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Searching providers...</div>
      ) : (
        <div className="grid gap-4">
          {providers?.map((provider) => (
            <Card key={provider.id}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={provider.avatar_url} />
                    <AvatarFallback>
                      {provider.first_name?.[0]}{provider.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-semibold">
                        {provider.first_name} {provider.last_name}
                      </h3>
                      {provider.specialty && (
                        <Badge variant="outline" className="mt-1">
                          {provider.specialty}
                        </Badge>
                      )}
                    </div>

                    {provider.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {provider.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedProvider(provider.id)}
                        className="flex items-center gap-1"
                      >
                        <UserPlus className="h-3 w-3" />
                        Send Request
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedProvider === provider.id && (
                  <div className="mt-4 p-4 border rounded-lg space-y-3">
                    <div>
                      <Label htmlFor="notes">Connection Request Message (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add a personal message to your connection request..."
                        value={connectionNotes}
                        onChange={(e) => setConnectionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSendRequest(provider.id)}
                        disabled={isRequestingConnection}
                        size="sm"
                      >
                        {isRequestingConnection ? 'Sending...' : 'Send Request'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedProvider(null);
                          setConnectionNotes('');
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {providers?.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No providers found matching your search.' : 'Start typing to search for providers.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

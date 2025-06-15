import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';
import { UserConnection, PrimaryProviderAssignment, ConnectionRequest } from '@/types/connections';
import { toast } from 'sonner';

export const useConnections = () => {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();

  // Get all connections for current user
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['user-connections', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_connections')
        .select(`
          *,
          patient:profiles!user_connections_patient_id_fkey(
            id, first_name, last_name, avatar_url, email
          ),
          provider:profiles!user_connections_provider_id_fkey(
            id, first_name, last_name, avatar_url, specialty, email
          )
        `)
        .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to handle potential query errors and null safety
      return (data || []).map(conn => {
        let correctedPatient: UserConnection['patient'] = null;
        let correctedProvider: UserConnection['provider'] = null;
        if (
          conn &&
          conn.patient &&
          typeof conn.patient === 'object' &&
          'id' in conn.patient &&
          (conn.patient as any).id !== null
        ) {
          correctedPatient = {
            ...(conn.patient ?? {})
          } as {
            id: string;
            first_name?: string;
            last_name?: string;
            avatar_url?: string;
            email?: string;
          };
        }
        if (
          conn &&
          conn.provider &&
          typeof conn.provider === 'object' &&
          'id' in conn.provider &&
          (conn.provider as any).id !== null
        ) {
          correctedProvider = {
            ...(conn.provider ?? {})
          } as {
            id: string;
            first_name?: string;
            last_name?: string;
            avatar_url?: string;
            specialty?: string;
            email?: string;
          };
        }
        return {
          ...conn,
          patient: correctedPatient,
          provider: correctedProvider
        };
      }) as UserConnection[];
    },
    enabled: !!user
  });

  // Get primary provider assignment
  const { data: primaryProvider, isLoading: primaryProviderLoading } = useQuery({
    queryKey: ['primary-provider', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('primary_provider_assignments')
        .select(`
          *,
          provider:profiles!primary_provider_assignments_provider_id_fkey(
            id, first_name, last_name, avatar_url, specialty, email
          )
        `)
        .eq('patient_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      let correctedProvider: PrimaryProviderAssignment['provider'] = null;
      if (
        data &&
        data.provider &&
        typeof data.provider === 'object' &&
        'id' in data.provider &&
        (data.provider as any).id !== null
      ) {
        correctedProvider = {
          ...(data.provider ?? {})
        } as {
          id: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string;
          specialty?: string;
          email?: string;
        };
      }

      return {
        ...data,
        provider: correctedProvider
      } as PrimaryProviderAssignment;
    },
    enabled: !!user
  });

  // Request connection mutation
  const requestConnectionMutation = useMutation({
    mutationFn: async (request: ConnectionRequest) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          patient_id: request.patient_id,
          provider_id: request.provider_id,
          connection_type: request.connection_type,
          status: 'pending',
          requested_by: user.id,
          notes: request.notes
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-connections'] });
      toast.success('Connection request sent successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to send connection request: ' + error.message);
    }
  });

  // Update connection status mutation
  const updateConnectionMutation = useMutation({
    mutationFn: async ({ 
      connectionId, 
      status, 
      notes 
    }: { 
      connectionId: string; 
      status: 'approved' | 'rejected' | 'blocked'; 
      notes?: string; 
    }) => {
      const updateData: any = { status };
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('user_connections')
        .update(updateData)
        .eq('id', connectionId);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-connections'] });
      const action = variables.status === 'approved' ? 'approved' : 
                    variables.status === 'rejected' ? 'rejected' : 'blocked';
      toast.success(`Connection ${action} successfully`);
    },
    onError: (error: any) => {
      toast.error('Failed to update connection: ' + error.message);
    }
  });

  // Assign primary provider mutation
  const assignPrimaryProviderMutation = useMutation({
    mutationFn: async ({ providerId, notes }: { providerId: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('primary_provider_assignments')
        .upsert({
          patient_id: user.id,
          provider_id: providerId,
          assigned_by: user.id,
          notes
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primary-provider'] });
      toast.success('Primary provider assigned successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to assign primary provider: ' + error.message);
    }
  });

  // Helper functions to categorize connections
  const getApprovedConnections = () => {
    return connections?.filter(conn => conn.status === 'approved') || [];
  };

  const getPendingRequests = () => {
    return connections?.filter(conn => 
      conn.status === 'pending' && conn.requested_by !== user?.id
    ) || [];
  };

  const getSentRequests = () => {
    return connections?.filter(conn => 
      conn.status === 'pending' && conn.requested_by === user?.id
    ) || [];
  };

  const getMyPatients = () => {
    return connections?.filter(conn => 
      conn.status === 'approved' && conn.provider_id === user?.id
    ) || [];
  };

  const getMyProviders = () => {
    return connections?.filter(conn => 
      conn.status === 'approved' && conn.patient_id === user?.id
    ) || [];
  };

  return {
    connections,
    connectionsLoading,
    primaryProvider,
    primaryProviderLoading,
    requestConnection: requestConnectionMutation.mutate,
    updateConnection: updateConnectionMutation.mutate,
    assignPrimaryProvider: assignPrimaryProviderMutation.mutate,
    isRequestingConnection: requestConnectionMutation.isPending,
    isUpdatingConnection: updateConnectionMutation.isPending,
    isAssigningProvider: assignPrimaryProviderMutation.isPending,
    getApprovedConnections,
    getPendingRequests,
    getSentRequests,
    getMyPatients,
    getMyProviders
  };
};


import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';
import { UserConnection, PrimaryProviderAssignment, ConnectionRequest } from '@/types/connections';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/utils/friendly-error';

export const useConnections = () => {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();

  // Get all connections for current user
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['user-connections', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // NOTE (gate 2026-11-14): user_connections.patient_id and
      // .provider_id both reference auth.users, not profiles, so the
      // patient/provider profiles!… embeds 400d (PGRST200) and the
      // connections list never loaded. Profiles are fetched separately
      // and merged below as `patient` / `provider` (the shape the
      // mapping code after this expects).
      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as any[];
      const personIds = Array.from(new Set(
        rows.flatMap((r) => [r.patient_id, r.provider_id]).filter(Boolean)
      ));
      let personMap: Record<string, any> = {};
      if (personIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, specialty, email')
          .in('id', personIds);
        for (const p of (profs as any[]) || []) personMap[p.id] = p;
      }
      const merged = rows.map((r) => ({
        ...r,
        patient: personMap[r.patient_id] || null,
        provider: personMap[r.provider_id] || null,
      }));

      // Fix: Add explicit null checks and type guards
      return merged.map(conn => {
        let correctedPatient: UserConnection['patient'] = null;
        let correctedProvider: UserConnection['provider'] = null;
        
        // Type guard for patient with comprehensive null check
        if (conn.patient && typeof conn.patient === 'object' && conn.patient !== null) {
          const patientData = conn.patient as any;
          if (patientData && typeof patientData === 'object' && patientData.id) {
            correctedPatient = {
              id: patientData.id,
              first_name: patientData.first_name || undefined,
              last_name: patientData.last_name || undefined,
              avatar_url: patientData.avatar_url || undefined,
              email: patientData.email || undefined
            };
          }
        }
        
        // Type guard for provider with comprehensive null check
        if (conn.provider && typeof conn.provider === 'object' && conn.provider !== null) {
          const providerData = conn.provider as any;
          if (providerData && typeof providerData === 'object' && providerData.id) {
            correctedProvider = {
              id: providerData.id,
              first_name: providerData.first_name || undefined,
              last_name: providerData.last_name || undefined,
              avatar_url: providerData.avatar_url || undefined,
              specialty: providerData.specialty || undefined,
              email: providerData.email || undefined
            };
          }
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

      // NOTE (gate 2026-11-14): primary_provider_assignments.provider_id
      // references auth.users, not profiles, so the provider profiles!…
      // embed 400s (PGRST200). The provider profile is fetched separately
      // and attached as `provider` (the shape the code below expects).
      const { data, error } = await supabase
        .from('primary_provider_assignments')
        .select('*')
        .eq('patient_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      if ((data as any).provider_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, specialty, email, role')
          .eq('id', (data as any).provider_id)
          .maybeSingle();
        (data as any).provider = prof || null;
      } else {
        (data as any).provider = null;
      }

      let correctedProvider: PrimaryProviderAssignment['provider'] = null;
      
      // Type guard for provider with comprehensive null check
      if (data.provider && typeof data.provider === 'object' && data.provider !== null) {
        const providerData = data.provider as any;
        if (providerData && typeof providerData === 'object' && providerData.id) {
          correctedProvider = {
            id: providerData.id,
            first_name: providerData.first_name || undefined,
            last_name: providerData.last_name || undefined,
            avatar_url: providerData.avatar_url || undefined,
            specialty: providerData.specialty || undefined,
            email: providerData.email || undefined
          };
        }
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
      toast.error(friendlyErrorMessage(error, "Failed to send connection request. Please try again."));
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
      toast.error(friendlyErrorMessage(error, "Failed to update connection. Please try again."));
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
      toast.error(friendlyErrorMessage(error, "Failed to assign primary provider. Please try again."));
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

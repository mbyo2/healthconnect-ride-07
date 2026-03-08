import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  owner_id: string;
  member_id: string | null;
  member_email: string;
  role_title: string;
  specialty_role_id: string | null;
  status: 'invited' | 'active' | 'removed';
  invited_at: string;
  joined_at: string | null;
}

export const useProviderTeam = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['provider-team', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('provider_team_members')
        .select('*')
        .eq('owner_id', user!.id)
        .neq('status', 'removed')
        .order('invited_at', { ascending: false });
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!user,
  });
};

export const useInviteTeamMember = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role_title, specialty_role_id }: { email: string; role_title: string; specialty_role_id?: string }) => {
      const { data, error } = await (supabase as any)
        .from('provider_team_members')
        .insert({
          owner_id: user!.id,
          member_email: email.toLowerCase().trim(),
          role_title,
          specialty_role_id: specialty_role_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-team'] });
      toast.success('Team member invited!');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useRemoveTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from('provider_team_members')
        .update({ status: 'removed' })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-team'] });
      toast.success('Team member removed');
    },
  });
};

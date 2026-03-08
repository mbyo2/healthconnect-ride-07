import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface QueueToken {
  id: string;
  institution_id: string;
  patient_id: string | null;
  token_number: string;
  patient_name: string;
  department: string;
  priority: 'emergency' | 'urgent' | 'normal' | 'low';
  status: 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';
  check_in_time: string;
  serving_start_time: string | null;
  completed_time: string | null;
  assigned_doctor_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export function useQueueTokens() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('queue_tokens')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('created_at', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTokens((data as unknown as QueueToken[]) || []);
    } catch (err: any) {
      console.error('Failed to fetch queue tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Real-time subscription
  useEffect(() => {
    if (!institutionId) return;
    const channel = supabase
      .channel('queue_tokens_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue_tokens',
        filter: `institution_id=eq.${institutionId}`
      }, () => {
        fetchTokens();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [institutionId, fetchTokens]);

  const createToken = async (data: {
    patient_name: string;
    department: string;
    priority: 'emergency' | 'urgent' | 'normal' | 'low';
    patient_id?: string;
    notes?: string;
  }) => {
    if (!institutionId || !user) return null;
    try {
      const { data: token, error } = await supabase
        .from('queue_tokens')
        .insert({
          institution_id: institutionId,
          patient_name: data.patient_name,
          department: data.department,
          priority: data.priority,
          patient_id: data.patient_id || null,
          notes: data.notes || null,
          created_by: user.id,
          token_number: 'TEMP', // Will be overwritten by trigger
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Token ${(token as any).token_number} generated for ${data.patient_name}`);
      return token as unknown as QueueToken;
    } catch (err: any) {
      toast.error('Failed to create token: ' + err.message);
      return null;
    }
  };

  const updateTokenStatus = async (tokenId: string, status: QueueToken['status']) => {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'serving') updates.serving_start_time = new Date().toISOString();
      if (status === 'completed' || status === 'no_show') updates.completed_time = new Date().toISOString();

      const { error } = await supabase
        .from('queue_tokens')
        .update(updates)
        .eq('id', tokenId);

      if (error) throw error;
      toast.success(`Token status updated to ${status}`);
    } catch (err: any) {
      toast.error('Failed to update token: ' + err.message);
    }
  };

  const waiting = tokens.filter(t => t.status === 'waiting');
  const serving = tokens.filter(t => t.status === 'serving');
  const completed = tokens.filter(t => t.status === 'completed');

  // Sort waiting by priority then time
  const sortedWaiting = [...waiting].sort((a, b) => {
    const priorityOrder = { emergency: 0, urgent: 1, normal: 2, low: 3 };
    const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (diff !== 0) return diff;
    return new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime();
  });

  return {
    tokens, loading, waiting: sortedWaiting, serving, completed,
    createToken, updateTokenStatus, refetch: fetchTokens,
  };
}

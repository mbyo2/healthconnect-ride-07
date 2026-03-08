import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface SessionTemplate {
  id: string;
  specialty_type: string;
  template_name: string;
  protocol_steps: any[];
  default_duration_minutes: number;
  required_equipment: string[];
  pre_session_checklist: any[];
  post_session_checklist: any[];
  is_active: boolean;
}

export interface SpecialistSession {
  id: string;
  template_id: string | null;
  patient_name: string;
  specialty_type: string;
  session_number: number;
  total_sessions: number | null;
  status: string;
  vitals_before: any;
  vitals_after: any;
  medications_administered: any[];
  protocol_notes: string | null;
  complications: string | null;
  outcome: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  next_session_date: string | null;
  created_at: string;
}

export function useSpecialistSessions() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [sessions, setSessions] = useState<SpecialistSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [templRes, sessRes] = await Promise.all([
        (supabase.from('specialist_session_templates' as any) as any).select('*').eq('is_active', true).order('template_name'),
        institutionId
          ? (supabase.from('specialist_sessions' as any) as any).select('*').eq('institution_id', institutionId).order('session_date', { ascending: false }).limit(200)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (!templRes.error) setTemplates(templRes.data || []);
      if (!(sessRes as any).error) setSessions((sessRes as any).data || []);
    } catch (err) {
      console.error('Specialist sessions error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createSession = async (data: Partial<SpecialistSession>) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await (supabase.from('specialist_sessions' as any) as any)
        .insert({ ...data, institution_id: institutionId, provider_id: user.id })
        .select().single();
      if (error) throw error;
      toast.success('Session scheduled');
      fetchAll();
      return result;
    } catch (err: any) { toast.error(err.message); return null; }
  };

  const updateSession = async (id: string, data: Partial<SpecialistSession>) => {
    try {
      const { error } = await (supabase.from('specialist_sessions' as any) as any)
        .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success('Session updated');
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const todaySessions = sessions.filter(s => s.session_date === new Date().toISOString().split('T')[0]);
  const activeSessions = sessions.filter(s => s.status === 'in_progress');

  return { templates, sessions, loading, todaySessions, activeSessions, createSession, updateSession, refetch: fetchAll };
}

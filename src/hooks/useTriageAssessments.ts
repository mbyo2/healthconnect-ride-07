import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface TriageAssessment {
  id: string;
  institution_id: string;
  patient_id: string | null;
  queue_token_id: string | null;
  patient_name: string;
  triage_level: 'critical' | 'urgent' | 'standard' | 'non_urgent';
  chief_complaint: string;
  vital_signs: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    spo2?: number;
  };
  pain_level: number | null;
  consciousness_level: string;
  mobility: string;
  bleeding: boolean;
  allergies: string | null;
  current_medications: string | null;
  assessment_notes: string | null;
  disposition: string | null;
  assessed_by: string;
  assessed_at: string;
}

export function useTriageAssessments() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [assessments, setAssessments] = useState<TriageAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('triage_assessments')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('assessed_at', today)
        .order('assessed_at', { ascending: false });

      if (error) throw error;
      setAssessments((data as unknown as TriageAssessment[]) || []);
    } catch (err: any) {
      console.error('Failed to fetch triage assessments:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  useEffect(() => {
    if (!institutionId) return;
    const channel = supabase
      .channel('triage_changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'triage_assessments',
        filter: `institution_id=eq.${institutionId}`
      }, () => fetchAssessments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [institutionId, fetchAssessments]);

  const createAssessment = async (data: Omit<TriageAssessment, 'id' | 'institution_id' | 'assessed_by' | 'assessed_at'>) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await supabase
        .from('triage_assessments')
        .insert({
          institution_id: institutionId,
          assessed_by: user.id,
          patient_name: data.patient_name,
          triage_level: data.triage_level,
          chief_complaint: data.chief_complaint,
          vital_signs: data.vital_signs as any,
          pain_level: data.pain_level,
          consciousness_level: data.consciousness_level,
          mobility: data.mobility,
          bleeding: data.bleeding,
          allergies: data.allergies,
          current_medications: data.current_medications,
          assessment_notes: data.assessment_notes,
          disposition: data.disposition,
          patient_id: data.patient_id,
          queue_token_id: data.queue_token_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Triage assessment completed for ${data.patient_name}`);
      return result as unknown as TriageAssessment;
    } catch (err: any) {
      toast.error('Failed to create assessment: ' + err.message);
      return null;
    }
  };

  const critical = assessments.filter(a => a.triage_level === 'critical');
  const urgent = assessments.filter(a => a.triage_level === 'urgent');
  const standard = assessments.filter(a => a.triage_level === 'standard');
  const nonUrgent = assessments.filter(a => a.triage_level === 'non_urgent');

  return {
    assessments, loading, critical, urgent, standard, nonUrgent,
    createAssessment, refetch: fetchAssessments,
  };
}

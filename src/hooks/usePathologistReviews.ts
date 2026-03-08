import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface PathologistReview {
  id: string;
  institution_id: string;
  lab_result_id: string | null;
  patient_name: string;
  test_name: string;
  result_value: string | null;
  reference_range: string | null;
  lab_tech_name: string | null;
  pathologist_name: string | null;
  status: string;
  findings: string | null;
  clinical_significance: string | null;
  is_critical: boolean;
  reviewed_at: string | null;
  released_at: string | null;
  created_at: string;
}

export function usePathologistReviews() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [reviews, setReviews] = useState<PathologistReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('pathologist_reviews' as any) as any)
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Pathologist reviews fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  useEffect(() => {
    if (!institutionId) return;
    const ch = supabase.channel('pathologist_review_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pathologist_reviews', filter: `institution_id=eq.${institutionId}` }, () => fetchReviews())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [institutionId, fetchReviews]);

  const signOff = async (id: string, findings: string, significance: string = 'normal') => {
    if (!user) return;
    try {
      const { error } = await (supabase.from('pathologist_reviews' as any) as any).update({
        status: 'released',
        findings,
        clinical_significance: significance,
        pathologist_id: user.id,
        pathologist_name: user.email,
        reviewed_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.success('Report signed off & released');
      fetchReviews();
    } catch (err: any) { toast.error(err.message); }
  };

  const flagCritical = async (id: string) => {
    try {
      const { error } = await (supabase.from('pathologist_reviews' as any) as any).update({
        status: 'critical', is_critical: true, updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.warning('Report flagged as CRITICAL');
      fetchReviews();
    } catch (err: any) { toast.error(err.message); }
  };

  const pending = reviews.filter(r => r.status === 'pending_review');
  const critical = reviews.filter(r => r.status === 'critical');
  const released = reviews.filter(r => r.status === 'released');

  return { reviews, loading, pending, critical, released, signOff, flagCritical, refetch: fetchReviews };
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HospitalPatient {
  id: string;
  name: string;
  source: string;
}

/**
 * Every patient this facility already knows about — pulled from the OPD queue,
 * inpatient admissions and appointments. Used by modules that need to attach a
 * new record (case sheet, referral, order) to a real patient rather than free text.
 */
export function useHospitalPatients(hospitalId?: string | null) {
  const [patients, setPatients] = useState<HospitalPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hospitalId) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [queue, admissions, appts] = await Promise.all([
        (supabase.from('queue_tokens' as any) as any)
          .select('patient_id, patient_name')
          .eq('institution_id', hospitalId)
          .limit(300),
        (supabase.from('hospital_admissions' as any) as any)
          .select('patient_id')
          .eq('hospital_id', hospitalId)
          .limit(300),
        (supabase.from('appointments' as any) as any)
          .select('patient_id')
          .eq('institution_id', hospitalId)
          .limit(300),
      ]);

      const ids = new Set<string>();
      const fallbackNames: Record<string, string> = {};
      (queue.data || []).forEach((r: any) => {
        if (r.patient_id) {
          ids.add(r.patient_id);
          if (r.patient_name) fallbackNames[r.patient_id] = r.patient_name;
        }
      });
      (admissions.data || []).forEach((r: any) => r.patient_id && ids.add(r.patient_id));
      (appts.data || []).forEach((r: any) => r.patient_id && ids.add(r.patient_id));

      const list = Array.from(ids);
      if (list.length === 0) {
        setPatients([]);
        return;
      }

      const { data: profiles } = await (supabase.from('profiles' as any) as any)
        .select('id, first_name, last_name')
        .in('id', list.slice(0, 500));

      const nameMap: Record<string, string> = { ...fallbackNames };
      (profiles || []).forEach((p: any) => {
        const full = [p.first_name, p.last_name].filter(Boolean).join(' ');
        if (full) nameMap[p.id] = full;
      });

      setPatients(
        list
          .map((id) => ({ id, name: nameMap[id] || `Patient ${id.slice(0, 8)}`, source: 'facility' }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e) {
      console.error('useHospitalPatients', e);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    load();
  }, [load]);

  return { patients, loading, refresh: load };
}

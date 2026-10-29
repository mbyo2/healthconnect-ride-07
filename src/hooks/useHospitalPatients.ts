import { useCallback, useEffect, useState } from 'react';
import { searchInstitutionPatients } from '@/lib/patients';

export interface HospitalPatient {
  id: string;
  name: string;
  source: string;
}

/**
 * The institution's patients — ONE list for every module (Patient Unity
 * W3). Backed by `search_institution_patients`: the institution roster
 * union established clinical relationships at this institution. This hook
 * replaces the old per-module derivations (queue tokens ∪ admissions ∪
 * appointments) that made a registered patient invisible to most modules.
 * Display/list consumers keep the { id, name, source } shape; interactive
 * pickers should use InstitutionPatientPicker / HospitalPatientSelect,
 * which search the same source with create-on-missing.
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
      const results = await searchInstitutionPatients(hospitalId, '');
      setPatients(
        results.map((p) => ({
          id: p.id,
          name: p.name,
          source: p.onRoster ? 'roster' : (p.source || 'facility'),
        }))
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

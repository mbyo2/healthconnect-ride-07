import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ALL_CLINICIAN_ROLES } from '@/config/roleConfig';

export interface PlatformStats {
  doctors: number;
  hospitals: number;
  pharmacies: number;
  patients: number;
  appointments: number;
  rating: number;
  loading: boolean;
}

/** Format a number as "1,200+" style */
export const formatStat = (n: number): string => {
  if (n === 0) return '—';
  if (n < 100) return `${n}+`;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const rounded = Math.floor(n / magnitude) * magnitude;
  return `${rounded.toLocaleString()}+`;
};

// Neutral initial state — real counts replace these on load. Never fake
// social proof: unknown counts render as "—" via formatStat.
const DEFAULT_STATS: PlatformStats = {
  doctors: 0,
  hospitals: 0,
  pharmacies: 0,
  patients: 0,
  appointments: 0,
  rating: 0,
  loading: true,
};

let cachedStats: PlatformStats | null = null;

export const usePlatformStats = (): PlatformStats => {
  const [stats, setStats] = useState<PlatformStats>(cachedStats ?? DEFAULT_STATS);

  useEffect(() => {
    if (cachedStats) return;

    // Defer the DB fetch so it doesn't block initial paint
    const timer = setTimeout(async () => {
      try {
        const [doctorsRes, hospitalsRes, pharmaciesRes, patientsRes, appointmentsRes] =
          await Promise.all([
            // Every clinical cadre counts as a care provider.
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .in('role', ALL_CLINICIAN_ROLES as any[])
              .eq('is_verified', true),
            // Verified care facilities (marketplace-listed or HMS-only —
            // both are real facilities on the platform).
            supabase
              .from('healthcare_institutions')
              .select('id', { count: 'exact', head: true })
              .eq('is_verified', true),
            // All ZAMRA pharmacy premises types.
            supabase
              .from('healthcare_institutions')
              .select('id', { count: 'exact', head: true })
              .eq('is_verified', true)
              .in('type', ['pharmacy', 'retail_pharmacy', 'hospital_pharmacy', 'wholesale_pharmacy', 'health_shop', 'dispensary', 'drug_store'] as any),
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('role', 'patient'),
            supabase
              .from('appointments')
              .select('id', { count: 'exact', head: true }),
          ]);

        const result: PlatformStats = {
          doctors: doctorsRes.count ?? 0,
          hospitals: hospitalsRes.count ?? 0,
          pharmacies: pharmaciesRes.count ?? 0,
          patients: patientsRes.count ?? 0,
          appointments: appointmentsRes.count ?? 0,
          rating: 0,
          loading: false,
        };

        cachedStats = result;
        setStats(result);
      } catch (error) {
        console.error('Error fetching platform stats:', error);
        setStats((s) => ({ ...s, loading: false }));
      }
    }, 100); // Small delay to let the page paint first

    return () => clearTimeout(timer);
  }, []);

  return stats;
};

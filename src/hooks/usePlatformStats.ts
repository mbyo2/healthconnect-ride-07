import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Sensible defaults so the hero renders instantly
const DEFAULT_STATS: PlatformStats = {
  doctors: 50,
  hospitals: 12,
  pharmacies: 8,
  patients: 500,
  appointments: 1200,
  rating: 4.8,
  loading: false,
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
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .in('role', ['health_personnel', 'doctor', 'specialist', 'nurse'] as any[]),
            supabase
              .from('healthcare_institutions')
              .select('id', { count: 'exact', head: true }),
            supabase
              .from('healthcare_institutions')
              .select('id', { count: 'exact', head: true })
              .eq('type', 'pharmacy'),
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('role', 'patient'),
            supabase
              .from('appointments')
              .select('id', { count: 'exact', head: true }),
          ]);

        const result: PlatformStats = {
          doctors: doctorsRes.count || DEFAULT_STATS.doctors,
          hospitals: hospitalsRes.count || DEFAULT_STATS.hospitals,
          pharmacies: pharmaciesRes.count || DEFAULT_STATS.pharmacies,
          patients: patientsRes.count || DEFAULT_STATS.patients,
          appointments: appointmentsRes.count || DEFAULT_STATS.appointments,
          rating: DEFAULT_STATS.rating,
          loading: false,
        };

        cachedStats = result;
        setStats(result);
      } catch (error) {
        console.error('Error fetching platform stats:', error);
      }
    }, 100); // Small delay to let the page paint first

    return () => clearTimeout(timer);
  }, []);

  return stats;
};

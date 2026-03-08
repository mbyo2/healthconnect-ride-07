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
  if (n === 0) return '0';
  if (n < 100) return `${n}+`;
  // Round down to nearest significant figure
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const rounded = Math.floor(n / magnitude) * magnitude;
  return `${rounded.toLocaleString()}+`;
};

let cachedStats: PlatformStats | null = null;

export const usePlatformStats = (): PlatformStats => {
  const [stats, setStats] = useState<PlatformStats>(
    cachedStats ?? {
      doctors: 0,
      hospitals: 0,
      pharmacies: 0,
      patients: 0,
      appointments: 0,
      rating: 4.8,
      loading: true,
    }
  );

  useEffect(() => {
    if (cachedStats) return;

    const fetchStats = async () => {
      try {
        const [
          doctorsRes,
          hospitalsRes,
          pharmaciesRes,
          patientsRes,
          appointmentsRes,
          ratingsRes,
        ] = await Promise.all([
          // Doctors + health personnel
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .in('role', ['health_personnel', 'doctor', 'specialist', 'nurse'] as any[]),
          // Institutions (hospitals/clinics)
          supabase
            .from('healthcare_institutions')
            .select('id', { count: 'exact', head: true }),
          // Pharmacies (institutions of pharmacy type)
          supabase
            .from('healthcare_institutions')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'pharmacy'),
          // Patients
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'patient'),
          // Appointments
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true }),
          // Average rating from reviews (if table exists, gracefully handle)
          supabase
            .from('reviews' as any)
            .select('rating')
            .limit(500),
        ]);

        // Compute average rating
        let avgRating = 4.8;
        if (ratingsRes.data && ratingsRes.data.length > 0) {
          const sum = ratingsRes.data.reduce(
            (acc: number, r: any) => acc + (r.rating || 0),
            0
          );
          avgRating = Math.round((sum / ratingsRes.data.length) * 10) / 10;
        }

        const result: PlatformStats = {
          doctors: doctorsRes.count ?? 0,
          hospitals: hospitalsRes.count ?? 0,
          pharmacies: pharmaciesRes.count ?? 0,
          patients: patientsRes.count ?? 0,
          appointments: appointmentsRes.count ?? 0,
          rating: avgRating,
          loading: false,
        };

        cachedStats = result;
        setStats(result);
      } catch (error) {
        console.error('Error fetching platform stats:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};

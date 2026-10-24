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
  loaded: boolean;
}

/**
 * Format a count as "1,200+" style. Returns null for unknown/zero counts:
 * consumers must filter nulls out so a stat with no real value renders
 * nothing at all — never a dash or placeholder. Never fake social proof.
 */
export const formatStat = (n: number): string | null => {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 100) return `${n}+`;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const rounded = Math.floor(n / magnitude) * magnitude;
  return `${rounded.toLocaleString()}+`;
};

// Neutral initial state — real counts replace these on load.
const DEFAULT_STATS: PlatformStats = {
  doctors: 0,
  hospitals: 0,
  pharmacies: 0,
  patients: 0,
  appointments: 0,
  rating: 0,
  loading: true,
  loaded: false,
};

let cachedStats: PlatformStats | null = null;

export const usePlatformStats = (): PlatformStats => {
  const [stats, setStats] = useState<PlatformStats>(cachedStats ?? DEFAULT_STATS);

  useEffect(() => {
    if (cachedStats) return;

    // Defer the DB fetch so it doesn't block initial paint
    const timer = setTimeout(async () => {
      try {
        // Aggregate-only SECURITY DEFINER RPC: anonymous visitors get real
        // platform totals without any table-level RLS widening (direct
        // head-counts return 0 / 401 to anon under RLS).
        const { data, error } = await (supabase as any).rpc('get_public_platform_counts');
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error('get_public_platform_counts returned no row');

        const result: PlatformStats = {
          doctors: Number(row.doctors) || 0,
          hospitals: Number(row.hospitals) || 0,
          pharmacies: Number(row.pharmacies) || 0,
          patients: Number(row.patients) || 0,
          appointments: Number(row.appointments) || 0,
          rating: 0,
          loading: false,
          loaded: true,
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

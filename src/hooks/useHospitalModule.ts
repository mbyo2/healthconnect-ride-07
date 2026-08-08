import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Options {
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * Generic loader for hospital/institution scoped module tables.
 * Keeps every HMS submodule driven by live database rows instead of static fixtures.
 */
export function useHospitalModule<T = any>(
  table: string,
  filterColumn: string | null,
  filterValue: string | null | undefined,
  options: Options = {}
) {
  const {
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    limit = 200,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || (filterColumn && !filterValue)) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = (supabase.from(table as any) as any).select(select);
      if (filterColumn && filterValue) query = query.eq(filterColumn, filterValue);
      if (orderBy) query = query.order(orderBy, { ascending });
      if (limit) query = query.limit(limit);
      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData((rows || []) as T[]);
    } catch (e: any) {
      console.error(`useHospitalModule(${table})`, e);
      setError(e?.message || 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, filterColumn, filterValue, select, orderBy, ascending, limit, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData, setData };
}

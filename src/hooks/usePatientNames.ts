import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Resolves patient display names for a set of patient ids (no static names anywhere). */
export function usePatientNames(ids: (string | null | undefined)[]) {
  const key = Array.from(new Set(ids.filter(Boolean) as string[])).sort().join(',');
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (list.length === 0) {
      setNames({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('id, first_name, last_name')
        .in('id', list);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        map[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed patient';
      });
      setNames(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const nameFor = (id?: string | null) =>
    (id && names[id]) || (id ? `Patient ${id.slice(0, 8)}` : 'Unknown patient');

  return { names, nameFor };
}

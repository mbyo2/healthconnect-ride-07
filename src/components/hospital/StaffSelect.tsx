// StaffSelect — pick a staff member from the facility's roster instead of
// typing names free-text. Smooth-data principle: backend data is reused.
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export interface StaffOption {
  id: string;
  name: string;
  role: string;
}

interface Props {
  hospitalId?: string | null;
  value: string;
  onChange: (name: string) => void;
  label?: string;
  placeholder?: string;
  /** Only show staff with these roles (e.g. ['doctor', 'nurse']). Empty = all. */
  roleFilter?: string[];
}

export const StaffSelect = ({
  hospitalId,
  value,
  onChange,
  label = 'Staff',
  placeholder = 'Select staff member',
  roleFilter,
}: Props) => {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await (supabase.from('institution_staff' as any) as any)
          .select('id, provider_id, role, profiles!institution_staff_provider_id_fkey(first_name, last_name)')
          .eq('institution_id', hospitalId)
          .eq('is_active', true)
          .order('role');
        if (error) throw error;
        const list: StaffOption[] = ((data as any[]) || [])
          .map((s: any) => ({
            id: s.id,
            name: `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.trim() || s.role,
            role: s.role,
          }))
          .filter((s: StaffOption) => !roleFilter || roleFilter.includes(s.role));
        setStaff(list);
      } catch (e) {
        console.error('Failed to load staff:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  // Fall back to free text when no roster exists yet.
  if (!loading && staff.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Loading staff...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {staff.map((s) => (
            <SelectItem key={s.id} value={s.name}>
              {s.name} <span className="text-xs text-muted-foreground">· {s.role}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DepartmentSelectProps {
  hospitalId: string;
  value: string;
  onChange: (v: string) => void;
  /** Current department list from the parent (avoids a refetch flash). */
  departments?: any[];
  /** Called with the fresh list after a department is created. */
  onDepartmentsChange?: (depts: any[]) => void;
  /** Whether `value` holds the department id or its name. */
  valueMode?: 'id' | 'name';
  label?: string;
  required?: boolean;
  placeholder?: string;
}

const toCode = (name: string) =>
  name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 12) || 'DEPT';

/**
 * Department picker with inline creation.
 *
 * Department is a required field in admission, bed, OPD, IPD and roster
 * flows — but institutions created before the signup seed (or via admin)
 * can have zero departments, leaving a required dropdown permanently
 * empty. This component lets staff create the department on the spot
 * instead of abandoning the workflow to go find Department Management.
 */
export const DepartmentSelect = ({
  hospitalId,
  value,
  onChange,
  departments: propDepartments,
  onDepartmentsChange,
  valueMode = 'id',
  label = 'Department',
  required = false,
  placeholder = 'Select department',
}: DepartmentSelectProps) => {
  const [depts, setDepts] = useState<any[]>(propDepartments ?? []);
  const [loading, setLoading] = useState(!propDepartments);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDepts = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hospital_departments' as any)
        .select('id, name, code')
        .eq('hospital_id', hospitalId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      const list = (data as any[]) || [];
      setDepts(list);
      onDepartmentsChange?.(list);
    } catch (e) {
      console.error('Failed to load departments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propDepartments) {
      setDepts(propDepartments);
    } else {
      fetchDepts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  // Keep in sync when the parent list changes (e.g. after its own refresh).
  useEffect(() => {
    if (propDepartments) setDepts(propDepartments);
  }, [propDepartments]);

  const createDepartment = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Enter a department name');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('hospital_departments' as any)
        .insert({
          hospital_id: hospitalId,
          name,
          code: toCode(name),
          bed_capacity: 0,
          is_active: true,
        })
        .select('id, name, code')
        .single();
      if (error) throw error;
      toast.success(`Department "${name}" created`);
      setNewName('');
      setShowCreate(false);
      await fetchDepts();
      // Auto-select the department that was just created.
      const created = data as any;
      onChange(valueMode === 'id' ? created.id : created.name);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && '*'}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowCreate(v => !v)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New
        </Button>
      </div>

      {depts.length === 0 && !loading ? (
        <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
          <Building2 className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No departments yet. Create the first one to continue.
          </p>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? 'Loading…' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {depts.map((d: any) => (
              <SelectItem key={d.id} value={valueMode === 'id' ? d.id : d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(showCreate || (depts.length === 0 && !loading)) && (
        <div className="rounded-lg border p-3 space-y-2 bg-muted/40">
          <Label className="text-xs">New department name</Label>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Outpatient (OPD)"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  createDepartment();
                }
              }}
            />
            <Button type="button" onClick={createDepartment} disabled={creating} size="sm">
              {creating && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
          {newName.trim() && (
            <p className="text-xs text-muted-foreground">
              Code: <span className="font-mono">{toCode(newName.trim())}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

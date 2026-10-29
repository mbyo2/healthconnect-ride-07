// StaffSelect — pick a staff member from the facility's roster instead of
// typing names free-text. Smooth-data principle: backend data is reused.
//
// Create-on-missing (CEO Odoo rule, Patient Unity W4): when the person
// isn't on the roster yet, institution admins/managers get "+ Add staff
// member" — a modal over the current workflow that links an existing
// Doc'O Clock account (found by email) into institution_staff and
// selects them. Other roles see who can add staff instead of a dead-end.
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionTeam } from '@/hooks/useInstitutionTeam';

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

const DEFAULT_ROLE_OPTIONS = [
  'doctor', 'medical_officer', 'specialist', 'consultant', 'clinical_officer',
  'nurse', 'midwife', 'pharmacist', 'lab_technician', 'radiologist',
  'receptionist', 'staff',
];

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
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState(roleFilter?.[0] || 'doctor');
  const [adding, setAdding] = useState(false);
  const { canManageStaff } = useInstitutionTeam(hospitalId);

  const loadStaff = async () => {
    if (!hospitalId) return;
    setLoading(true);
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
        .filter((s: StaffOption) => !roleFilter || roleFilter.length === 0 || roleFilter.includes(s.role));
      setStaff(list);
    } catch (e) {
      console.error('Failed to load staff:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  const handleAddStaff = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Enter the staff member\u2019s email address');
      return;
    }
    if (!hospitalId) return;
    setAdding(true);
    try {
      // Staff must already hold a Doc'O Clock account (same rule as
      // Personnel Management) — we link accounts, never invent them.
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('email', email)
        .single();
      if (profErr || !profile) {
        toast.error('No Doc\u2019O Clock account uses that email yet — ask them to sign up first, then add them here.');
        return;
      }
      const { data: existing } = await (supabase.from('institution_staff' as any) as any)
        .select('id')
        .eq('institution_id', hospitalId)
        .eq('provider_id', profile.id)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { error: insErr } = await (supabase.from('institution_staff' as any) as any)
          .insert({
            institution_id: hospitalId,
            provider_id: profile.id,
            role: addRole,
            is_active: true,
          });
        if (insErr) throw insErr;
      }
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || email;
      toast.success(`${name} added to the facility team and selected`);
      setShowAdd(false);
      setAddEmail('');
      await loadStaff();
      onChange(name);
    } catch (e: any) {
      toast.error('That staff member could not be added. Only the institution admin or a manager can add staff.');
      console.error('StaffSelect add failed', e);
    } finally {
      setAdding(false);
    }
  };

  const addDialog = (
    <Dialog open={showAdd} onOpenChange={setShowAdd}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Add staff member
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Link an existing Doc'O Clock account to this facility's team. They must
            already have an account — if they don't, ask them to sign up first.
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email address *</Label>
            <Input
              id="staff-email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="colleague@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role at this facility</Label>
            <Select value={addRole} onValueChange={setAddRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(roleFilter && roleFilter.length > 0 ? roleFilter : DEFAULT_ROLE_OPTIONS).map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)} disabled={adding}>
            Cancel
          </Button>
          <Button onClick={handleAddStaff} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Add &amp; select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const header = (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      {canManageStaff && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add staff
        </Button>
      )}
    </div>
  );

  // Fall back to free text when no roster exists yet.
  if (!loading && staff.length === 0) {
    return (
      <div className="space-y-2">
        {header}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
        {!canManageStaff && (
          <p className="text-xs text-muted-foreground">
            No team members are linked to this facility yet — only the institution admin can add staff.
          </p>
        )}
        {addDialog}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {header}
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
      {addDialog}
    </div>
  );
};

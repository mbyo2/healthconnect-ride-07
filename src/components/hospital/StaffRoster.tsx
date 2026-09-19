import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePatientNames } from '@/hooks/usePatientNames';

interface StaffRosterProps {
  hospital: any;
  departments: any[];
}

const SHIFT_TIMES = {
  morning: { start: '06:00', end: '14:00', label: 'Morning (6AM-2PM)' },
  afternoon: { start: '14:00', end: '22:00', label: 'Afternoon (2PM-10PM)' },
  night: { start: '22:00', end: '06:00', label: 'Night (10PM-6AM)' },
} as const;

const STAFF_ROLES = [
  'Doctor', 'Nurse', 'Clinical Officer', 'Midwife', 'Pharmacist',
  'Lab Technologist', 'Radiographer', 'Physiotherapist', 'Receptionist', 'Administrator',
];

export const StaffRoster = ({ hospital, departments }: StaffRosterProps) => {
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staffId: '', department: '', shift: 'morning' as keyof typeof SHIFT_TIMES, date: new Date().toISOString().split('T')[0], role: 'Doctor'
  });

  useEffect(() => {
    const fetchPersonnel = async () => {
      if (!hospital?.id) return;
      const { data } = await supabase
        .from('institution_personnel')
        .select('*, profile:user_id(first_name, last_name)')
        .eq('institution_id', hospital.id);
      setPersonnel((data as any[]) || []);
    };
    fetchPersonnel();
  }, [hospital?.id]);

  const fetchRoster = async () => {
    if (!hospital?.id) return;
    setLoadingRoster(true);
    try {
      const { data, error } = await supabase
        .from('staff_schedules' as any)
        .select('*, department:hospital_departments(name)')
        .eq('institution_id', hospital.id)
        .order('shift_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRoster((data as any[]) || []);
    } catch (e) {
      console.error('Failed to load duty roster:', e);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital?.id]);

  const { nameFor } = usePatientNames(roster.map((r: any) => r.staff_id));

  const addDuty = async () => {
    if (!form.staffId || !form.department || !form.date) {
      toast.error('Select staff, department and date');
      return;
    }
    const dept = (departments || []).find((d: any) => d.name === form.department);
    const times = SHIFT_TIMES[form.shift];
    setSaving(true);
    try {
      const { error } = await supabase.from('staff_schedules' as any).insert({
        institution_id: hospital.id,
        staff_id: form.staffId,
        department_id: dept?.id || null,
        shift_date: form.date,
        shift_start: times.start,
        shift_end: times.end,
        shift_type: form.shift,
        notes: form.role,
      });
      if (error) throw error;
      toast.success('Duty assigned successfully');
      setShowDialog(false);
      setForm({ staffId: '', department: '', shift: 'morning', date: new Date().toISOString().split('T')[0], role: 'Doctor' });
      fetchRoster();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to assign duty');
    } finally {
      setSaving(false);
    }
  };

  const removeDuty = async (id: string) => {
    try {
      const { error } = await supabase.from('staff_schedules' as any).delete().eq('id', id);
      if (error) throw error;
      toast.success('Duty assignment removed');
      fetchRoster();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove assignment');
    }
  };

  const shiftColors = {
    morning: 'default',
    afternoon: 'secondary',
    night: 'outline'
  };

  const todayKey = new Date().toISOString().split('T')[0];
  const todayRoster = roster.filter((r: any) => r.shift_date === todayKey);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{personnel.length}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{todayRoster.length}</p>
                <p className="text-xs text-muted-foreground">On Duty Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{roster.length}</p>
                <p className="text-xs text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Duty Roster</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Assign Duty
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Registered Personnel */}
          {personnel.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Registered Staff</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {personnel.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {p.profile?.first_name || 'Staff'} {p.profile?.last_name || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.role || 'Staff'}</p>
                    </div>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {p.status || 'active'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roster Table */}
          {loadingRoster ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Loading duty roster…</div>
          ) : roster.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{nameFor(entry.staff_id) || 'Staff'}</TableCell>
                    <TableCell>{entry.notes || '—'}</TableCell>
                    <TableCell>{entry.department?.name || 'General'}</TableCell>
                    <TableCell>{entry.shift_date}</TableCell>
                    <TableCell>
                      <Badge variant={shiftColors[entry.shift_type] as any} className="capitalize">
                        {entry.shift_type} ({entry.shift_start}–{entry.shift_end})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeDuty(entry.id)} title="Remove assignment">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No duty assignments yet. Click "Assign Duty" to start.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Duty</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member *</Label>
              <Select value={form.staffId} onValueChange={v => setForm(p => ({ ...p, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select registered staff" /></SelectTrigger>
                <SelectContent>
                  {personnel.map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {[p.profile?.first_name, p.profile?.last_name].filter(Boolean).join(' ') || p.user_id} ({p.role || 'Staff'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {personnel.length === 0 && (
                <p className="text-xs text-muted-foreground">No registered personnel yet — add staff under Personnel first.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Shift *</Label>
                <Select value={form.shift} onValueChange={(v: any) => setForm(p => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6AM-2PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (2PM-10PM)</SelectItem>
                    <SelectItem value="night">Night (10PM-6AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addDuty} disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

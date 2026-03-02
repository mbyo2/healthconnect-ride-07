import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, Calendar, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StaffRosterProps {
  hospital: any;
  departments: any[];
}

interface DutyEntry {
  id: string;
  staffName: string;
  department: string;
  shift: 'morning' | 'afternoon' | 'night';
  date: string;
  role: string;
  status: 'on-duty' | 'off-duty' | 'leave';
}

export const StaffRoster = ({ hospital, departments }: StaffRosterProps) => {
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [roster, setRoster] = useState<DutyEntry[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    staffName: '', department: '', shift: 'morning' as const, date: new Date().toISOString().split('T')[0], role: 'Doctor'
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

  const addDuty = () => {
    if (!form.staffName || !form.department || !form.date) {
      toast.error('Please fill required fields');
      return;
    }
    const entry: DutyEntry = {
      id: crypto.randomUUID(),
      staffName: form.staffName,
      department: form.department,
      shift: form.shift,
      date: form.date,
      role: form.role,
      status: 'on-duty'
    };
    setRoster(prev => [...prev, entry]);
    setShowDialog(false);
    toast.success('Duty assigned successfully');
  };

  const shiftColors = {
    morning: 'default',
    afternoon: 'secondary',
    night: 'outline'
  };

  const todayRoster = roster.filter(r => r.date === new Date().toISOString().split('T')[0]);

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
          {roster.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.staffName}</TableCell>
                    <TableCell>{entry.role}</TableCell>
                    <TableCell>{entry.department}</TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>
                      <Badge variant={shiftColors[entry.shift] as any} className="capitalize">{entry.shift}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'on-duty' ? 'default' : 'outline'} className="capitalize">{entry.status}</Badge>
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
              <Label>Staff Name *</Label>
              <Input value={form.staffName} onChange={e => setForm(p => ({ ...p, staffName: e.target.value }))} placeholder="Staff member name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Doctor', 'Nurse', 'Surgeon', 'Anesthetist', 'Pharmacist', 'Lab Tech', 'Receptionist', 'Ward Boy'].map(r => (
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
            <Button onClick={addDuty}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

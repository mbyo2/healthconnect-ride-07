import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, Clock, Hash, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHospitalModule } from '@/hooks/useHospitalModule';

interface OPDProps {
  hospital: any;
  departments: any[];
}

interface QueueToken {
  id: string;
  token_number: string;
  patient_name: string;
  department: string;
  priority: string;
  status: string;
  check_in_time: string;
  notes: string | null;
}

const parseVitals = (notes: string | null) => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object' && parsed.vitals) return parsed.vitals as Record<string, string>;
  } catch {
    /* plain-text note */
  }
  return null;
};

const parseDoctor = (notes: string | null) => {
  if (!notes) return '';
  try {
    const parsed = JSON.parse(notes);
    return parsed?.doctor || '';
  } catch {
    return '';
  }
};

export const OPDManagement = ({ hospital, departments }: OPDProps) => {
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '', phone: '', department: '', doctor: '',
    bp: '', temp: '', pulse: '', weight: ''
  });

  const { data: opdQueue, loading, refresh } = useHospitalModule<QueueToken>(
    'queue_tokens',
    'institution_id',
    hospital?.id,
    { orderBy: 'check_in_time', ascending: true }
  );

  const todayQueue = useMemo(() => {
    const today = new Date().toDateString();
    return opdQueue.filter(t => new Date(t.check_in_time).toDateString() === today);
  }, [opdQueue]);

  const registerPatient = async () => {
    if (!newPatient.name || !newPatient.department) {
      toast.error('Please fill required fields');
      return;
    }
    if (!hospital?.id) {
      toast.error('No hospital context available');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const vitals: Record<string, string> = {};
      if (newPatient.bp) vitals.bp = newPatient.bp;
      if (newPatient.temp) vitals.temp = newPatient.temp;
      if (newPatient.pulse) vitals.pulse = newPatient.pulse;
      if (newPatient.weight) vitals.weight = newPatient.weight;

      const { error } = await (supabase.from('queue_tokens' as any) as any).insert({
        institution_id: hospital.id,
        patient_name: newPatient.name,
        department: newPatient.department,
        priority: 'normal',
        status: 'waiting',
        created_by: userData?.user?.id,
        notes: JSON.stringify({ phone: newPatient.phone || undefined, doctor: newPatient.doctor || undefined, vitals }),
      });
      if (error) throw error;

      setNewPatient({ name: '', phone: '', department: '', doctor: '', bp: '', temp: '', pulse: '', weight: '' });
      setShowRegDialog(false);
      toast.success(`Token issued for ${newPatient.name}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: 'serving' | 'completed' | 'cancelled') => {
    try {
      const patch: Record<string, any> = { status };
      if (status === 'serving') patch.serving_start_time = new Date().toISOString();
      if (status === 'completed') patch.completed_time = new Date().toISOString();
      const { error } = await (supabase.from('queue_tokens' as any) as any).update(patch).eq('id', id);
      if (error) throw error;
      toast.success(`Patient status updated to ${status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const waitingCount = todayQueue.filter(p => p.status === 'waiting').length;
  const inConsultation = todayQueue.filter(p => p.status === 'serving').length;
  const completed = todayQueue.filter(p => p.status === 'completed').length;

  const filteredQueue = todayQueue.filter(p =>
    p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.token_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'secondary';
      case 'serving': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* OPD Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{waitingCount}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{inConsultation}</p>
                <p className="text-xs text-muted-foreground">In Consultation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">OPD Queue - Today</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or token..." className="pl-8 w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button onClick={() => setShowRegDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Register Patient
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading OPD queue…</div>
          ) : filteredQueue.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Token</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Vitals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueue.map(patient => {
                  const vitals = parseVitals(patient.notes);
                  const doctor = parseDoctor(patient.notes);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-sm">{patient.token_number}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{patient.patient_name}</div>
                        {doctor && <div className="text-xs text-muted-foreground">Dr. {doctor}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{patient.department}</TableCell>
                      <TableCell className="text-sm">{new Date(patient.check_in_time).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          {vitals?.bp && <span className="block">BP: {vitals.bp}</span>}
                          {vitals?.temp && <span className="block">Temp: {vitals.temp}°C</span>}
                          {vitals?.pulse && <span className="block">Pulse: {vitals.pulse}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(patient.status) as any}>{patient.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {patient.status === 'waiting' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(patient.id, 'serving')}>
                              Start
                            </Button>
                          )}
                          {patient.status === 'serving' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(patient.id, 'completed')}>
                                Complete
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus(patient.id, 'cancelled')}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No patients in queue. Register a new patient to start.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Dialog */}
      <Dialog open={showRegDialog} onOpenChange={setShowRegDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>OPD Patient Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input value={newPatient.name} onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newPatient.phone} onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={newPatient.department} onValueChange={v => setNewPatient(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                    <SelectItem value="General OPD">General OPD</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consulting Doctor</Label>
                <Input value={newPatient.doctor} onChange={e => setNewPatient(p => ({ ...p, doctor: e.target.value }))} placeholder="Doctor name" />
              </div>
            </div>
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold mb-3 block">Vitals (Triage)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Blood Pressure</Label>
                  <Input value={newPatient.bp} onChange={e => setNewPatient(p => ({ ...p, bp: e.target.value }))} placeholder="120/80" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temperature (°C)</Label>
                  <Input value={newPatient.temp} onChange={e => setNewPatient(p => ({ ...p, temp: e.target.value }))} placeholder="37.0" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pulse (bpm)</Label>
                  <Input value={newPatient.pulse} onChange={e => setNewPatient(p => ({ ...p, pulse: e.target.value }))} placeholder="72" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight (kg)</Label>
                  <Input value={newPatient.weight} onChange={e => setNewPatient(p => ({ ...p, weight: e.target.value }))} placeholder="70" className="text-sm" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegDialog(false)}>Cancel</Button>
            <Button onClick={registerPatient} disabled={saving}>
              <Hash className="h-4 w-4 mr-2" /> {saving ? 'Issuing…' : 'Issue Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

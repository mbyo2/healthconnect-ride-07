import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, UserPlus, Clock, Hash, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface OPDProps {
  hospital: any;
  departments: any[];
}

interface OPDPatient {
  id: string;
  tokenNumber: number;
  name: string;
  phone: string;
  department: string;
  doctor: string;
  status: 'waiting' | 'in-consultation' | 'completed' | 'referred';
  registeredAt: string;
  vitals?: { bp?: string; temp?: string; pulse?: string; weight?: string };
}

export const OPDManagement = ({ hospital, departments }: OPDProps) => {
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [opdQueue, setOpdQueue] = useState<OPDPatient[]>([]);
  const [tokenCounter, setTokenCounter] = useState(1);
  const [newPatient, setNewPatient] = useState({
    name: '', phone: '', department: '', doctor: '',
    bp: '', temp: '', pulse: '', weight: ''
  });

  const registerPatient = () => {
    if (!newPatient.name || !newPatient.department) {
      toast.error('Please fill required fields');
      return;
    }
    const patient: OPDPatient = {
      id: crypto.randomUUID(),
      tokenNumber: tokenCounter,
      name: newPatient.name,
      phone: newPatient.phone,
      department: newPatient.department,
      doctor: newPatient.doctor,
      status: 'waiting',
      registeredAt: new Date().toLocaleTimeString(),
      vitals: {
        bp: newPatient.bp || undefined,
        temp: newPatient.temp || undefined,
        pulse: newPatient.pulse || undefined,
        weight: newPatient.weight || undefined,
      }
    };
    setOpdQueue(prev => [...prev, patient]);
    setTokenCounter(prev => prev + 1);
    setNewPatient({ name: '', phone: '', department: '', doctor: '', bp: '', temp: '', pulse: '', weight: '' });
    setShowRegDialog(false);
    toast.success(`Token #${patient.tokenNumber} issued for ${patient.name}`);
  };

  const updateStatus = (id: string, status: OPDPatient['status']) => {
    setOpdQueue(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    toast.success(`Patient status updated to ${status}`);
  };

  const waitingCount = opdQueue.filter(p => p.status === 'waiting').length;
  const inConsultation = opdQueue.filter(p => p.status === 'in-consultation').length;
  const completed = opdQueue.filter(p => p.status === 'completed').length;

  const filteredQueue = opdQueue.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tokenNumber.toString().includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'secondary';
      case 'in-consultation': return 'default';
      case 'completed': return 'outline';
      case 'referred': return 'destructive';
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
              <Clock className="h-4 w-4 text-yellow-500" />
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
          {filteredQueue.length > 0 ? (
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
                {filteredQueue.map(patient => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-sm">#{patient.tokenNumber}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{patient.name}</div>
                      {patient.phone && <div className="text-xs text-muted-foreground">{patient.phone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{patient.department}</TableCell>
                    <TableCell className="text-sm">{patient.registeredAt}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {patient.vitals?.bp && <span className="block">BP: {patient.vitals.bp}</span>}
                        {patient.vitals?.temp && <span className="block">Temp: {patient.vitals.temp}°C</span>}
                        {patient.vitals?.pulse && <span className="block">Pulse: {patient.vitals.pulse}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(patient.status) as any}>{patient.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {patient.status === 'waiting' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(patient.id, 'in-consultation')}>
                            Start
                          </Button>
                        )}
                        {patient.status === 'in-consultation' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(patient.id, 'completed')}>
                              Complete
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateStatus(patient.id, 'referred')}>
                              Refer
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
            <Button onClick={registerPatient}>
              <Hash className="h-4 w-4 mr-2" /> Issue Token #{tokenCounter}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

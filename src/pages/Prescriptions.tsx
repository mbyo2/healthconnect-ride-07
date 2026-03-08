
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Pill, Calendar, User, Clock, Download, Plus, FileText, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Prescriptions = () => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  const queryClient = useQueryClient();
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [newRx, setNewRx] = useState({
    patient_id: '',
    medication_name: '',
    dosage: '',
    instructions: '',
    quantity: 1,
    duration_days: 7,
    refills_remaining: 0,
  });

  const isProvider = availableRoles.some(r =>
    ['health_personnel', 'doctor', 'pharmacist', 'pharmacy'].includes(r)
  );

  // Fetch prescriptions based on role
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', user?.id, isProvider],
    queryFn: async () => {
      if (!user) return [];
      const query = (supabase as any)
        .from('comprehensive_prescriptions')
        .select(`
          id, medication_name, dosage, duration_days, prescribed_date, status,
          refills_remaining, instructions, quantity, generic_name, strength,
          patient:profiles!comprehensive_prescriptions_patient_id_fkey(first_name, last_name),
          provider:profiles!comprehensive_prescriptions_provider_id_fkey(first_name, last_name)
        `)
        .order('prescribed_date', { ascending: false });

      if (isProvider) {
        query.eq('provider_id', user.id);
      } else {
        query.eq('patient_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Search patients for provider prescribing
  const { data: patients = [] } = useQuery({
    queryKey: ['prescription-patients', searchPatient],
    queryFn: async () => {
      if (!searchPatient || searchPatient.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${searchPatient}%,last_name.ilike.%${searchPatient}%,email.ilike.%${searchPatient}%`)
        .limit(10);
      return data || [];
    },
    enabled: isProvider && searchPatient.length >= 2
  });

  const handleCreatePrescription = async () => {
    if (!user || !newRx.patient_id || !newRx.medication_name || !newRx.dosage || !newRx.instructions) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('comprehensive_prescriptions')
        .insert({
          provider_id: user.id,
          patient_id: newRx.patient_id,
          medication_name: newRx.medication_name,
          dosage: newRx.dosage,
          instructions: newRx.instructions,
          quantity: newRx.quantity,
          duration_days: newRx.duration_days,
          refills_remaining: newRx.refills_remaining,
          status: 'active',
        });

      if (error) throw error;
      toast.success('Prescription created successfully');
      setShowNewPrescription(false);
      setNewRx({ patient_id: '', medication_name: '', dosage: '', instructions: '', quantity: 1, duration_days: 7, refills_remaining: 0 });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'expired': return 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200';
      default: return 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200';
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading prescriptions...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isProvider ? 'Prescriptions' : 'My Prescriptions'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isProvider ? 'Write and manage patient prescriptions' : 'Track and manage your medication prescriptions'}
          </p>
        </div>
        {isProvider && (
          <Dialog open={showNewPrescription} onOpenChange={setShowNewPrescription}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Write Prescription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Search Patient</Label>
                  <Input
                    placeholder="Search by name or email..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                  />
                  {patients.length > 0 && (
                    <div className="mt-1 border rounded-md max-h-32 overflow-y-auto">
                      {patients.map((p: any) => (
                        <button
                          key={p.id}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${newRx.patient_id === p.id ? 'bg-primary/10' : ''}`}
                          onClick={() => {
                            setNewRx(prev => ({ ...prev, patient_id: p.id }));
                            setSearchPatient(`${p.first_name} ${p.last_name}`);
                          }}
                        >
                          {p.first_name} {p.last_name} <span className="text-muted-foreground">({p.email})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Medication Name *</Label>
                  <Input value={newRx.medication_name} onChange={(e) => setNewRx(p => ({ ...p, medication_name: e.target.value }))} placeholder="e.g. Amoxicillin 500mg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Dosage *</Label>
                    <Input value={newRx.dosage} onChange={(e) => setNewRx(p => ({ ...p, dosage: e.target.value }))} placeholder="e.g. 1 tablet 3x daily" />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" value={newRx.quantity} onChange={(e) => setNewRx(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Duration (days)</Label>
                    <Input type="number" value={newRx.duration_days} onChange={(e) => setNewRx(p => ({ ...p, duration_days: parseInt(e.target.value) || 7 }))} />
                  </div>
                  <div>
                    <Label>Refills</Label>
                    <Input type="number" value={newRx.refills_remaining} onChange={(e) => setNewRx(p => ({ ...p, refills_remaining: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div>
                  <Label>Instructions *</Label>
                  <Textarea value={newRx.instructions} onChange={(e) => setNewRx(p => ({ ...p, instructions: e.target.value }))} placeholder="Take with food. Complete the full course..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewPrescription(false)}>Cancel</Button>
                <Button onClick={handleCreatePrescription}>Create Prescription</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {prescriptions.map((p: any) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">{p.medication_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3" />
                      {isProvider
                        ? `Patient: ${p.patient?.first_name || ''} ${p.patient?.last_name || ''}`
                        : `Dr. ${p.provider?.first_name || ''} ${p.provider?.last_name || ''}`
                      }
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(p.status || 'active')}>
                  {p.status || 'active'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Dosage</p>
                  <p className="font-medium text-foreground">{p.dosage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Duration</p>
                  <p className="font-medium text-foreground">{p.duration_days ? `${p.duration_days} days` : 'As directed'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Quantity</p>
                  <p className="font-medium text-foreground">{p.quantity || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Refills</p>
                  <p className="font-medium text-foreground">{p.refills_remaining || 0}</p>
                </div>
              </div>

              {p.instructions && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                  <p className="text-sm text-foreground">{p.instructions}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(p.prescribed_date).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  {!isProvider && p.status === 'active' && (p.refills_remaining || 0) > 0 && (
                    <Button size="sm">Request Refill</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prescriptions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {isProvider ? 'No prescriptions written yet' : 'No prescriptions found'}
            </p>
            {isProvider && (
              <Button className="mt-4 gap-2" onClick={() => setShowNewPrescription(true)}>
                <Plus className="h-4 w-4" />
                Write First Prescription
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Prescriptions;

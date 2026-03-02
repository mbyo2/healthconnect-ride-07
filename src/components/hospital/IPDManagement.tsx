import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, UserPlus, Bed, ArrowRightLeft, FileOutput, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface IPDProps {
  hospital: any;
  departments: any[];
  beds: any[];
  admissions: any[];
  onRefresh: () => void;
}

export const IPDManagement = ({ hospital, departments, beds, admissions, onRefresh }: IPDProps) => {
  const [showAdmitDialog, setShowAdmitDialog] = useState(false);
  const [showDischargeDialog, setShowDischargeDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [admitForm, setAdmitForm] = useState({
    patientName: '', admissionType: 'regular', departmentId: '',
    bedId: '', diagnosis: '', treatmentPlan: ''
  });

  const [dischargeForm, setDischargeForm] = useState({
    dischargeSummary: '', followUpInstructions: ''
  });

  const [transferForm, setTransferForm] = useState({
    newDepartmentId: '', newBedId: '', reason: ''
  });

  const availableBeds = beds?.filter(b => b.status === 'available') || [];

  const handleAdmit = async () => {
    if (!admitForm.departmentId || !admitForm.admissionType) {
      toast.error('Please fill required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const admissionNumber = `ADM-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('hospital_admissions' as any).insert({
        hospital_id: hospital.id,
        patient_id: hospital.admin_id, // placeholder - would be actual patient
        admission_number: admissionNumber,
        admission_type: admitForm.admissionType,
        department_id: admitForm.departmentId,
        bed_id: admitForm.bedId || null,
        diagnosis: admitForm.diagnosis,
        treatment_plan: admitForm.treatmentPlan,
        admitting_doctor_id: hospital.admin_id,
        status: 'admitted'
      });

      if (error) throw error;

      // Update bed status
      if (admitForm.bedId) {
        await supabase.from('hospital_beds' as any)
          .update({ status: 'occupied' })
          .eq('id', admitForm.bedId);
      }

      toast.success(`Patient admitted. Admission #${admissionNumber}`);
      setShowAdmitDialog(false);
      setAdmitForm({ patientName: '', admissionType: 'regular', departmentId: '', bedId: '', diagnosis: '', treatmentPlan: '' });
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to admit patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    setIsSubmitting(true);
    try {
      await supabase.from('hospital_admissions' as any)
        .update({
          status: 'discharged',
          discharge_date: new Date().toISOString(),
          discharge_summary: dischargeForm.dischargeSummary
        })
        .eq('id', selectedAdmission.id);

      if (selectedAdmission.bed_id) {
        await supabase.from('hospital_beds' as any)
          .update({ status: 'available', current_patient_id: null })
          .eq('id', selectedAdmission.bed_id);
      }

      toast.success('Patient discharged successfully');
      setShowDischargeDialog(false);
      setDischargeForm({ dischargeSummary: '', followUpInstructions: '' });
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to discharge patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAdmission || !transferForm.newDepartmentId) return;
    setIsSubmitting(true);
    try {
      // Free old bed
      if (selectedAdmission.bed_id) {
        await supabase.from('hospital_beds' as any)
          .update({ status: 'available', current_patient_id: null })
          .eq('id', selectedAdmission.bed_id);
      }

      // Update admission
      await supabase.from('hospital_admissions' as any)
        .update({
          department_id: transferForm.newDepartmentId,
          bed_id: transferForm.newBedId || null
        })
        .eq('id', selectedAdmission.id);

      // Occupy new bed
      if (transferForm.newBedId) {
        await supabase.from('hospital_beds' as any)
          .update({ status: 'occupied', current_patient_id: selectedAdmission.patient_id })
          .eq('id', transferForm.newBedId);
      }

      toast.success('Patient transferred successfully');
      setShowTransferDialog(false);
      setTransferForm({ newDepartmentId: '', newBedId: '', reason: '' });
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to transfer patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdmissions = admissions?.filter(a =>
    a.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Patients ({admissions?.length || 0})</TabsTrigger>
          <TabsTrigger value="discharged">Discharged</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-base">Inpatient Management (ADT)</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-8 w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <Button onClick={() => setShowAdmitDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Admission
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAdmissions.length > 0 ? (
                <div className="space-y-3">
                  {filteredAdmissions.map((admission: any) => (
                    <div key={admission.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">
                            {admission.patient?.first_name} {admission.patient?.last_name}
                          </h4>
                          <Badge className="text-[10px]">{admission.admission_type}</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">#{admission.admission_number}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>Dept: <strong>{admission.department?.name}</strong></span>
                          <span>Since: {format(new Date(admission.admission_date), 'MMM d, yyyy')}</span>
                          {admission.diagnosis && <span>Dx: {admission.diagnosis}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedAdmission(admission); setShowTransferDialog(true); }}>
                          <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedAdmission(admission); setShowDischargeDialog(true); }}>
                          <FileOutput className="h-3 w-3 mr-1" /> Discharge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active admissions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discharged">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center py-4">Discharged patients will appear here after discharge processing.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admit Dialog */}
      <Dialog open={showAdmitDialog} onOpenChange={setShowAdmitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Patient Admission</DialogTitle>
            <DialogDescription>Admit a patient to the hospital</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admission Type *</Label>
                <Select value={admitForm.admissionType} onValueChange={v => setAdmitForm(p => ({ ...p, admissionType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="daycare">Day Care</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="surgical">Surgical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={admitForm.departmentId} onValueChange={v => setAdmitForm(p => ({ ...p, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Bed</Label>
              <Select value={admitForm.bedId} onValueChange={v => setAdmitForm(p => ({ ...p, bedId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select available bed" /></SelectTrigger>
                <SelectContent>
                  {availableBeds.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      Bed {b.bed_number} - {b.department?.name} ({b.bed_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input value={admitForm.diagnosis} onChange={e => setAdmitForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Provisional diagnosis" />
            </div>
            <div className="space-y-2">
              <Label>Treatment Plan</Label>
              <Textarea value={admitForm.treatmentPlan} onChange={e => setAdmitForm(p => ({ ...p, treatmentPlan: e.target.value }))} placeholder="Initial treatment plan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdmitDialog(false)}>Cancel</Button>
            <Button onClick={handleAdmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Admit Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge Dialog */}
      <Dialog open={showDischargeDialog} onOpenChange={setShowDischargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
            <DialogDescription>
              {selectedAdmission && `${selectedAdmission.patient?.first_name} ${selectedAdmission.patient?.last_name} - #${selectedAdmission.admission_number}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Discharge Summary *</Label>
              <Textarea value={dischargeForm.dischargeSummary} onChange={e => setDischargeForm(p => ({ ...p, dischargeSummary: e.target.value }))}
                placeholder="Summary of treatment, outcomes, and medications..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Instructions</Label>
              <Textarea value={dischargeForm.followUpInstructions} onChange={e => setDischargeForm(p => ({ ...p, followUpInstructions: e.target.value }))}
                placeholder="Follow-up schedule, dietary instructions..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDischargeDialog(false)}>Cancel</Button>
            <Button onClick={handleDischarge} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Patient</DialogTitle>
            <DialogDescription>
              {selectedAdmission && `Transfer ${selectedAdmission.patient?.first_name} ${selectedAdmission.patient?.last_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Department *</Label>
              <Select value={transferForm.newDepartmentId} onValueChange={v => setTransferForm(p => ({ ...p, newDepartmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Bed</Label>
              <Select value={transferForm.newBedId} onValueChange={v => setTransferForm(p => ({ ...p, newBedId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                <SelectContent>
                  {availableBeds.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      Bed {b.bed_number} - {b.department?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for Transfer</Label>
              <Input value={transferForm.reason} onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

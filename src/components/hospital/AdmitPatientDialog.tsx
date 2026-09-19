import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BedDouble } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AdmitPatientDialogProps {
  hospital: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-linked registered patient (when the source already knows one) */
  defaultPatientId?: string | null;
  /** Walk-in display name shown as context */
  defaultPatientName?: string;
  defaultDiagnosis?: string;
  defaultAdmissionType?: string;
  sourceLabel?: string;
  onAdmitted?: (admission: { id: string; admission_number: string }) => void;
}

/**
 * Shared OPD / A&E → IPD admission dialog. One workflow everywhere:
 * pick registered patient + department + bed → creates the admission,
 * occupies the bed. Walk-ins must be linked to a registered patient
 * record first (admissions require a real patient profile).
 */
export const AdmitPatientDialog = ({
  hospital,
  open,
  onOpenChange,
  defaultPatientId,
  defaultPatientName,
  defaultDiagnosis,
  defaultAdmissionType = 'scheduled',
  sourceLabel,
  onAdmitted,
}: AdmitPatientDialogProps) => {
  const [patientId, setPatientId] = useState(defaultPatientId || '');
  const [departmentId, setDepartmentId] = useState('');
  const [bedId, setBedId] = useState('');
  const [diagnosis, setDiagnosis] = useState(defaultDiagnosis || '');
  const [admissionType, setAdmissionType] = useState(defaultAdmissionType);
  const [departments, setDepartments] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPatientId(defaultPatientId || '');
    setDiagnosis(defaultDiagnosis || '');
    setAdmissionType(defaultAdmissionType);
    setDepartmentId('');
    setBedId('');
    (async () => {
      try {
        const [{ data: depts }, { data: bedRows }, { data: patientRows }] = await Promise.all([
          supabase.from('hospital_departments' as any).select('id, name').eq('hospital_id', hospital?.id).eq('is_active', true).order('name'),
          supabase.from('hospital_beds' as any).select('id, bed_number, bed_type, department:hospital_departments(name)').eq('hospital_id', hospital?.id).eq('status', 'available').limit(100),
          supabase.from('profiles').select('id, first_name, last_name, phone').eq('role', 'patient').order('last_name').limit(200),
        ]);
        setDepartments(depts || []);
        setBeds(bedRows || []);
        setPatients(patientRows || []);
      } catch (e) {
        console.error('Failed to load admit options:', e);
      }
    })();
  }, [open, hospital?.id, defaultPatientId, defaultDiagnosis, defaultAdmissionType]);

  const handleAdmit = async () => {
    if (!patientId || !departmentId) {
      toast.error('Select a registered patient and department');
      return;
    }
    setSubmitting(true);
    try {
      const admissionNumber = `ADM-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase.from('hospital_admissions' as any).insert({
        hospital_id: hospital.id,
        patient_id: patientId,
        admission_number: admissionNumber,
        admission_type: admissionType,
        department_id: departmentId,
        bed_id: bedId || null,
        diagnosis: diagnosis || null,
        admitting_doctor_id: hospital.admin_id,
        status: 'admitted',
      }).select('id, admission_number').single();
      if (error) throw error;

      if (bedId) {
        await supabase.from('hospital_beds' as any)
          .update({ status: 'occupied', current_patient_id: patientId })
          .eq('id', bedId);
      }
      toast.success(`Patient admitted — #${admissionNumber}. See the IPD tab.`);
      onOpenChange(false);
      onAdmitted?.(data as any);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to admit patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Admit to IPD{sourceLabel ? <span className="font-mono text-sm"> · {sourceLabel}</span> : null}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {defaultPatientName && !defaultPatientId && (
            <p className="text-xs text-muted-foreground">
              {defaultPatientName} is a walk-in — link a registered patient record below (admissions require one).
            </p>
          )}
          <div className="space-y-2">
            <Label>Registered Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient record" /></SelectTrigger>
              <SelectContent>
                {patients.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.phone || p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Admission Type</Label>
              <Select value={admissionType} onValueChange={setAdmissionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign Bed</Label>
            <Select value={bedId} onValueChange={setBedId}>
              <SelectTrigger><SelectValue placeholder="Select available bed" /></SelectTrigger>
              <SelectContent>
                {beds.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    Bed {b.bed_number} - {b.department?.name} ({b.bed_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Diagnosis / Reason</Label>
            <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Provisional diagnosis" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdmit} disabled={submitting}>
            <BedDouble className="h-4 w-4 mr-2" /> {submitting ? 'Admitting…' : 'Admit Patient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

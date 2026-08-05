import React, { useEffect, useState } from 'react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { HospitalPatientSelect } from '@/components/hospital/HospitalPatientSelect';
import { useHospitalPatients } from '@/hooks/useHospitalPatients';
import { FileText, Plus, Search, User, Clock, Stethoscope, Save } from 'lucide-react';

interface Props {
  hospital: any;
  departments: any[];
}

export const EMRCaseSheets = ({ hospital, departments }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCase, setActiveCase] = useState<any>(null);
  const [caseSheet, setCaseSheet] = useState({
    chief_complaint: '',
    history_present_illness: '',
    past_medical_history: '',
    family_history: '',
    examination_findings: '',
    vitals: { bp: '', pulse: '', temp: '', spo2: '', rr: '', weight: '', height: '' },
    provisional_diagnosis: '',
    investigations_ordered: '',
    treatment_plan: '',
    prescriptions: '',
    follow_up_notes: '',
    icd_code: '',
  });

  const { data: recentCases, loading, error, refresh } = useHospitalModule<any>(
    'comprehensive_medical_records', 'institution_id', hospital?.id, { orderBy: 'visit_date', ascending: false }
  );
  const { nameFor } = usePatientNames(recentCases.map((c: any) => c.patient_id));
  const [saving, setSaving] = useState(false);

  const { patients, loading: patientsLoading } = useHospitalPatients(hospital?.id);
  const [newOpen, setNewOpen] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [creating, setCreating] = useState(false);

  const createCaseSheet = async () => {
    if (!newPatientId) {
      toast.error('Select a patient first');
      return;
    }
    setCreating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error: err } = await (supabase.from('comprehensive_medical_records' as any) as any)
        .insert({
          patient_id: newPatientId,
          provider_id: auth?.user?.id,
          institution_id: hospital?.id,
          record_type: 'consultation',
          title: newTitle || 'Consultation case sheet',
          description: newDepartment ? `Department: ${newDepartment}` : null,
          visit_date: new Date().toISOString(),
          status: 'active',
          clinical_data: {},
        })
        .select()
        .single();
      if (err) throw err;
      toast.success('Case sheet created');
      setNewOpen(false);
      setNewPatientId('');
      setNewTitle('');
      setNewDepartment('');
      setActiveCase(data);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create case sheet');
    } finally {
      setCreating(false);
    }
  };


  useEffect(() => {
    if (!activeCase) return;
    const cd = (activeCase.clinical_data && typeof activeCase.clinical_data === 'object') ? activeCase.clinical_data : {};
    setCaseSheet(prev => ({ ...prev, ...cd, vitals: { ...prev.vitals, ...(cd.vitals || {}) } }));
  }, [activeCase]);

  const filteredCases = recentCases.filter((c: any) =>
    nameFor(c.patient_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveCaseSheet = async () => {
    if (!activeCase) return;
    setSaving(true);
    try {
      const { error: err } = await (supabase.from('comprehensive_medical_records' as any) as any)
        .update({ clinical_data: caseSheet, description: caseSheet.provisional_diagnosis || activeCase.description })
        .eq('id', activeCase.id);
      if (err) throw err;
      toast.success('Case sheet saved');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save case sheet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Electronic Medical Records & Case Sheets</h3>
          <p className="text-sm text-muted-foreground">Create and manage patient consultation records</p>
        </div>
        <Button className="gap-2" size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> New Case Sheet
        </Button>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Case Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <HospitalPatientSelect
              patients={patients}
              loading={patientsLoading}
              value={newPatientId}
              onChange={setNewPatientId}
              emptyHint="No patients are registered at this facility yet. Register a walk-in through OPD Management or admit a patient in IPD, then create their case sheet here."
            />
            <div className="space-y-1.5">
              <Label>Visit title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. OPD consultation — chest pain" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={newDepartment} onValueChange={setNewDepartment}>
                <SelectTrigger><SelectValue placeholder={departments.length ? 'Select department' : 'No departments configured'} /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments.length === 0 && (
                <p className="text-xs text-muted-foreground">Add departments in Department Management to categorise case sheets.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createCaseSheet} disabled={creating || !newPatientId}>
              {creating ? 'Creating…' : 'Create case sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient List Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or UHID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {loading ? (
              <ListSkeleton count={3} variant="compact" />
            ) : error ? (
              <EmptyState icon={FileText} title="Could not load records" description={error} actionLabel="Retry" onAction={refresh} />
            ) : filteredCases.length === 0 ? (
              <EmptyState icon={FileText} title="No case sheets" description="Consultation records created at this facility appear here." />
            ) : filteredCases.map((c: any) => (
              <div key={c.id} onClick={() => setActiveCase(c)} className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${activeCase?.id === c.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{nameFor(c.patient_id)}</span>
                  <Badge variant={c.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] capitalize">{c.status || 'active'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{c.title || c.record_type}</div>
                <div className="text-xs text-muted-foreground">{c.visit_date ? new Date(c.visit_date).toLocaleDateString() : ''}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Case Sheet Editor */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {activeCase ? `Case Sheet — ${nameFor(activeCase.patient_id)}` : 'Select a Patient'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCase ? (
              <Tabs defaultValue="consultation" className="space-y-4">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="consultation" className="text-xs">Consultation</TabsTrigger>
                  <TabsTrigger value="vitals" className="text-xs">Vitals</TabsTrigger>
                  <TabsTrigger value="diagnosis" className="text-xs">Diagnosis & Plan</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                </TabsList>

                <TabsContent value="consultation" className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Chief Complaint</label>
                    <Textarea placeholder="Patient's main complaint..." value={caseSheet.chief_complaint} onChange={e => setCaseSheet(p => ({ ...p, chief_complaint: e.target.value }))} rows={2} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">History of Present Illness</label>
                    <Textarea placeholder="Detailed history..." value={caseSheet.history_present_illness} onChange={e => setCaseSheet(p => ({ ...p, history_present_illness: e.target.value }))} rows={3} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Examination Findings</label>
                    <Textarea placeholder="Physical examination notes..." value={caseSheet.examination_findings} onChange={e => setCaseSheet(p => ({ ...p, examination_findings: e.target.value }))} rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="vitals" className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'bp', label: 'BP (mmHg)', placeholder: '120/80' },
                      { key: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
                      { key: 'temp', label: 'Temp (°C)', placeholder: '36.6' },
                      { key: 'spo2', label: 'SpO2 (%)', placeholder: '98' },
                      { key: 'rr', label: 'Resp Rate', placeholder: '16' },
                      { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
                      { key: 'height', label: 'Height (cm)', placeholder: '170' },
                    ].map(v => (
                      <div key={v.key}>
                        <label className="text-xs font-medium text-foreground">{v.label}</label>
                        <Input placeholder={v.placeholder} value={(caseSheet.vitals as any)[v.key]} onChange={e => setCaseSheet(p => ({ ...p, vitals: { ...p.vitals, [v.key]: e.target.value } }))} />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="diagnosis" className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Provisional Diagnosis</label>
                      <Textarea placeholder="Diagnosis..." value={caseSheet.provisional_diagnosis} onChange={e => setCaseSheet(p => ({ ...p, provisional_diagnosis: e.target.value }))} rows={2} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">ICD-10 Code</label>
                      <Input placeholder="e.g. J06.9" value={caseSheet.icd_code} onChange={e => setCaseSheet(p => ({ ...p, icd_code: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Investigations Ordered</label>
                    <Textarea placeholder="Labs, imaging..." value={caseSheet.investigations_ordered} onChange={e => setCaseSheet(p => ({ ...p, investigations_ordered: e.target.value }))} rows={2} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Treatment Plan</label>
                    <Textarea placeholder="Treatment & prescriptions..." value={caseSheet.treatment_plan} onChange={e => setCaseSheet(p => ({ ...p, treatment_plan: e.target.value }))} rows={3} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Follow-up Notes</label>
                    <Textarea placeholder="Follow-up instructions..." value={caseSheet.follow_up_notes} onChange={e => setCaseSheet(p => ({ ...p, follow_up_notes: e.target.value }))} rows={2} />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Past Medical History</label>
                    <Textarea placeholder="Previous illnesses, surgeries..." value={caseSheet.past_medical_history} onChange={e => setCaseSheet(p => ({ ...p, past_medical_history: e.target.value }))} rows={3} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Family History</label>
                    <Textarea placeholder="Relevant family history..." value={caseSheet.family_history} onChange={e => setCaseSheet(p => ({ ...p, family_history: e.target.value }))} rows={2} />
                  </div>
                </TabsContent>

                <div className="flex gap-2 pt-2">
                  <Button className="gap-2" disabled={saving} onClick={saveCaseSheet}><Save className="h-4 w-4" /> Save Case Sheet</Button>
                  <Button variant="outline" onClick={() => window.print()}>Print</Button>
                </div>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a patient from the list to start or view their case sheet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

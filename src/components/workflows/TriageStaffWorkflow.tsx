import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Heart, Users, Clock, Stethoscope, Search, Loader2, Plus, Activity } from 'lucide-react';
import { useTriageAssessments, TriageAssessment } from '@/hooks/useTriageAssessments';
import { format } from 'date-fns';

const TRIAGE_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white', border: 'border-l-red-600', description: 'Immediate life-threatening' },
  urgent: { label: 'Urgent', color: 'bg-orange-500 text-white', border: 'border-l-orange-500', description: 'High priority, <30 min' },
  standard: { label: 'Standard', color: 'bg-yellow-500 text-white', border: 'border-l-yellow-500', description: 'Normal queue' },
  non_urgent: { label: 'Non-Urgent', color: 'bg-green-500 text-white', border: 'border-l-green-500', description: 'Can wait safely' },
};

const CONSCIOUSNESS_LEVELS = ['Alert', 'Verbal response', 'Pain response', 'Unresponsive'];
const MOBILITY_OPTIONS = ['Ambulatory', 'Wheelchair', 'Stretcher', 'Immobile'];

export const TriageStaffWorkflow = () => {
  const { assessments, loading, critical, urgent, standard, nonUrgent, createAssessment } = useTriageAssessments();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    patient_name: '',
    triage_level: 'standard' as TriageAssessment['triage_level'],
    chief_complaint: '',
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    spo2: '',
    pain_level: 0,
    consciousness_level: 'Alert',
    mobility: 'Ambulatory',
    bleeding: false,
    allergies: '',
    current_medications: '',
    assessment_notes: '',
    disposition: '',
  });

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.patient_name.trim() || !form.chief_complaint.trim()) return;
    setCreating(true);
    const result = await createAssessment({
      patient_name: form.patient_name,
      patient_id: null,
      queue_token_id: null,
      triage_level: form.triage_level,
      chief_complaint: form.chief_complaint,
      vital_signs: {
        blood_pressure: form.blood_pressure || undefined,
        heart_rate: form.heart_rate ? parseInt(form.heart_rate) : undefined,
        temperature: form.temperature ? parseFloat(form.temperature) : undefined,
        respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate) : undefined,
        spo2: form.spo2 ? parseInt(form.spo2) : undefined,
      },
      pain_level: form.pain_level,
      consciousness_level: form.consciousness_level,
      mobility: form.mobility,
      bleeding: form.bleeding,
      allergies: form.allergies || null,
      current_medications: form.current_medications || null,
      assessment_notes: form.assessment_notes || null,
      disposition: form.disposition || null,
    });
    if (result) {
      setForm({
        patient_name: '', triage_level: 'standard', chief_complaint: '',
        blood_pressure: '', heart_rate: '', temperature: '', respiratory_rate: '', spo2: '',
        pain_level: 0, consciousness_level: 'Alert', mobility: 'Ambulatory',
        bleeding: false, allergies: '', current_medications: '', assessment_notes: '', disposition: '',
      });
      setIsDialogOpen(false);
    }
    setCreating(false);
  };

  const AssessmentCard = ({ assessment }: { assessment: TriageAssessment }) => {
    const config = TRIAGE_CONFIG[assessment.triage_level];
    return (
      <Card className={`border-l-4 ${config.border}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className={config.color}>{config.label}</Badge>
              <span className="font-medium text-foreground">{assessment.patient_name}</span>
            </div>
            <span className="text-sm text-muted-foreground">{format(new Date(assessment.assessed_at), 'HH:mm')}</span>
          </div>
          <p className="text-sm text-foreground mb-2"><strong>Complaint:</strong> {assessment.chief_complaint}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {assessment.vital_signs?.blood_pressure && <Badge variant="outline">BP: {assessment.vital_signs.blood_pressure}</Badge>}
            {assessment.vital_signs?.heart_rate && <Badge variant="outline">HR: {assessment.vital_signs.heart_rate}</Badge>}
            {assessment.vital_signs?.temperature && <Badge variant="outline">Temp: {assessment.vital_signs.temperature}°C</Badge>}
            {assessment.vital_signs?.spo2 && <Badge variant="outline">SpO₂: {assessment.vital_signs.spo2}%</Badge>}
            {assessment.pain_level != null && assessment.pain_level > 0 && <Badge variant="outline">Pain: {assessment.pain_level}/10</Badge>}
            {assessment.bleeding && <Badge variant="destructive">Bleeding</Badge>}
          </div>
          {assessment.disposition && <p className="text-xs text-muted-foreground mt-2">→ {assessment.disposition}</p>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Triage Dashboard</h1>
          <p className="text-muted-foreground">Patient assessment, prioritization & emergency routing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Assessment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Triage Assessment Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient Name *</Label>
                  <Input value={form.patient_name} onChange={e => updateForm('patient_name', e.target.value)} />
                </div>
                <div>
                  <Label>Triage Level *</Label>
                  <Select value={form.triage_level} onValueChange={v => updateForm('triage_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIAGE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">{config.label} — {config.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Chief Complaint *</Label>
                <Textarea value={form.chief_complaint} onChange={e => updateForm('chief_complaint', e.target.value)} rows={2} />
              </div>

              <div>
                <Label className="text-sm font-semibold flex items-center gap-1"><Activity className="h-4 w-4" /> Vital Signs</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">BP (mmHg)</Label>
                    <Input value={form.blood_pressure} onChange={e => updateForm('blood_pressure', e.target.value)} placeholder="120/80" />
                  </div>
                  <div>
                    <Label className="text-xs">Heart Rate</Label>
                    <Input type="number" value={form.heart_rate} onChange={e => updateForm('heart_rate', e.target.value)} placeholder="72" />
                  </div>
                  <div>
                    <Label className="text-xs">Temp (°C)</Label>
                    <Input type="number" step="0.1" value={form.temperature} onChange={e => updateForm('temperature', e.target.value)} placeholder="36.6" />
                  </div>
                  <div>
                    <Label className="text-xs">Resp. Rate</Label>
                    <Input type="number" value={form.respiratory_rate} onChange={e => updateForm('respiratory_rate', e.target.value)} placeholder="16" />
                  </div>
                  <div>
                    <Label className="text-xs">SpO₂ (%)</Label>
                    <Input type="number" value={form.spo2} onChange={e => updateForm('spo2', e.target.value)} placeholder="98" />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Pain Level: {form.pain_level}/10</Label>
                <Slider value={[form.pain_level]} onValueChange={v => updateForm('pain_level', v[0])} max={10} step={1} className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Consciousness (AVPU)</Label>
                  <Select value={form.consciousness_level} onValueChange={v => updateForm('consciousness_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONSCIOUSNESS_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mobility</Label>
                  <Select value={form.mobility} onValueChange={v => updateForm('mobility', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOBILITY_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.bleeding} onCheckedChange={v => updateForm('bleeding', v)} />
                <Label>Active Bleeding</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Known Allergies</Label>
                  <Input value={form.allergies} onChange={e => updateForm('allergies', e.target.value)} />
                </div>
                <div>
                  <Label>Current Medications</Label>
                  <Input value={form.current_medications} onChange={e => updateForm('current_medications', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Assessment Notes</Label>
                <Textarea value={form.assessment_notes} onChange={e => updateForm('assessment_notes', e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Disposition / Routing</Label>
                <Input value={form.disposition} onChange={e => updateForm('disposition', e.target.value)} placeholder="e.g., Route to ER Bay 3, OPD Dr. Smith" />
              </div>

              <Button onClick={handleSubmit} disabled={creating || !form.patient_name.trim() || !form.chief_complaint.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Stethoscope className="h-4 w-4 mr-2" />}
                Submit Triage Assessment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-3xl font-bold text-destructive">{critical.length}</p>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4 text-center">
            <Stethoscope className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-orange-600">{urgent.length}</p>
            <p className="text-sm text-muted-foreground">Urgent</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-yellow-600">{standard.length}</p>
            <p className="text-sm text-muted-foreground">Standard</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-green-600">{nonUrgent.length}</p>
            <p className="text-sm text-muted-foreground">Non-Urgent</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessment List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({assessments.length})</TabsTrigger>
          <TabsTrigger value="critical">🔴 Critical ({critical.length})</TabsTrigger>
          <TabsTrigger value="urgent">🟠 Urgent ({urgent.length})</TabsTrigger>
          <TabsTrigger value="standard">🟡 Standard ({standard.length})</TabsTrigger>
        </TabsList>

        {['all', 'critical', 'urgent', 'standard'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              (tab === 'all' ? assessments : tab === 'critical' ? critical : tab === 'urgent' ? urgent : standard)
                .length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">No assessments in this category today.</CardContent></Card>
                ) : (
                  (tab === 'all' ? assessments : tab === 'critical' ? critical : tab === 'urgent' ? urgent : standard)
                    .map(a => <AssessmentCard key={a.id} assessment={a} />)
                )
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

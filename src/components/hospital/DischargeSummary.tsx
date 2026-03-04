import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Printer, Save, CheckCircle2, Clock } from 'lucide-react';

export const DischargeSummary = ({ hospital, admissions }: { hospital: any; admissions: any[] }) => {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [summary, setSummary] = useState({
    admission_diagnosis: '',
    discharge_diagnosis: '',
    procedures_performed: '',
    course_in_hospital: '',
    condition_at_discharge: 'stable',
    discharge_medications: '',
    diet_advice: '',
    follow_up_instructions: '',
    investigations_summary: '',
    doctor_notes: '',
  });

  const [discharges] = useState([
    { id: 1, patient: 'John Mwale', uhid: 'UH-001', admDate: '2026-02-28', dischDate: '2026-03-04', dept: 'General Medicine', doctor: 'Dr. Banda', status: 'pending' },
    { id: 2, patient: 'Sarah Tembo', uhid: 'UH-005', admDate: '2026-03-01', dischDate: '2026-03-03', dept: 'Surgery', doctor: 'Dr. Chanda', status: 'completed' },
    { id: 3, patient: 'James Kapota', uhid: 'UH-008', admDate: '2026-03-02', dischDate: '2026-03-04', dept: 'Orthopedics', doctor: 'Dr. Mulenga', status: 'draft' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Discharge Summary</h3>
          <p className="text-sm text-muted-foreground">Structured discharge documentation with medication & follow-up</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient List */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 space-y-2 max-h-[500px] overflow-y-auto">
            <Input placeholder="Search discharges..." className="mb-2" />
            {discharges.map(d => (
              <div key={d.id} onClick={() => setSelectedPatient(d)} className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedPatient?.id === d.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{d.patient}</span>
                  <Badge variant={d.status === 'completed' ? 'default' : d.status === 'draft' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{d.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{d.uhid} • {d.dept} • {d.doctor}</p>
                <p className="text-xs text-muted-foreground">Adm: {d.admDate} → Dis: {d.dischDate}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Discharge Form */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            {selectedPatient ? (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium text-sm text-foreground">{selectedPatient.patient} ({selectedPatient.uhid})</p>
                  <p className="text-xs text-muted-foreground">{selectedPatient.dept} • {selectedPatient.doctor} • Admitted: {selectedPatient.admDate}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Admission Diagnosis</label>
                    <Textarea rows={2} placeholder="Diagnosis at admission..." value={summary.admission_diagnosis} onChange={e => setSummary(p => ({ ...p, admission_diagnosis: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Discharge Diagnosis</label>
                    <Textarea rows={2} placeholder="Final diagnosis..." value={summary.discharge_diagnosis} onChange={e => setSummary(p => ({ ...p, discharge_diagnosis: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Procedures Performed</label>
                  <Textarea rows={2} placeholder="Surgeries, procedures..." value={summary.procedures_performed} onChange={e => setSummary(p => ({ ...p, procedures_performed: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Course in Hospital</label>
                  <Textarea rows={3} placeholder="Treatment timeline..." value={summary.course_in_hospital} onChange={e => setSummary(p => ({ ...p, course_in_hospital: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Investigations Summary</label>
                  <Textarea rows={2} placeholder="Key lab/imaging results..." value={summary.investigations_summary} onChange={e => setSummary(p => ({ ...p, investigations_summary: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Discharge Medications</label>
                  <Textarea rows={3} placeholder="Medications with dosage & duration..." value={summary.discharge_medications} onChange={e => setSummary(p => ({ ...p, discharge_medications: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Diet Advice</label>
                    <Textarea rows={2} placeholder="Dietary instructions..." value={summary.diet_advice} onChange={e => setSummary(p => ({ ...p, diet_advice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Follow-up Instructions</label>
                    <Textarea rows={2} placeholder="Next visit, precautions..." value={summary.follow_up_instructions} onChange={e => setSummary(p => ({ ...p, follow_up_instructions: e.target.value }))} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="gap-2"><Save className="h-4 w-4" /> Save Draft</Button>
                  <Button variant="outline" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Finalize</Button>
                  <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a patient to create or view their discharge summary</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

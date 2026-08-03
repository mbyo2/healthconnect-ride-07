import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Printer, Save, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EMPTY = {
  admission_diagnosis: '',
  discharge_diagnosis: '',
  procedures_performed: '',
  course_in_hospital: '',
  investigations_summary: '',
  discharge_medications: '',
  diet_advice: '',
  follow_up_instructions: '',
};

export const DischargeSummary = ({ hospital, admissions }: { hospital: any; admissions: any[] }) => {
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const rows = (admissions || []).filter((a: any) => a.hospital_id ? a.hospital_id === hospital?.id : true);
  const { nameFor } = usePatientNames(rows.map((a: any) => a.patient_id));

  const filtered = rows.filter((a: any) =>
    nameFor(a.patient_id).toLowerCase().includes(search.toLowerCase()) ||
    (a.admission_number || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selected) return;
    let parsed = { ...EMPTY };
    try {
      if (selected.discharge_summary) parsed = { ...EMPTY, ...JSON.parse(selected.discharge_summary) };
    } catch {
      parsed = { ...EMPTY, course_in_hospital: selected.discharge_summary || '' };
    }
    setSummary(parsed);
  }, [selected]);

  const save = async (finalize: boolean) => {
    if (!selected) return;
    setSaving(true);
    try {
      const patch: any = { discharge_summary: JSON.stringify(summary) };
      if (finalize) {
        patch.status = 'discharged';
        patch.discharge_date = new Date().toISOString();
      }
      const { error } = await (supabase.from('hospital_admissions' as any) as any)
        .update(patch).eq('id', selected.id);
      if (error) throw error;
      toast.success(finalize ? 'Discharge summary finalized' : 'Draft saved');
      setSelected({ ...selected, ...patch });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save discharge summary');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof EMPTY, rows_ = 2) => (
    <div>
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Textarea
        rows={rows_}
        value={summary[key]}
        onChange={e => setSummary(p => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Discharge Summary</h3>
        <p className="text-sm text-muted-foreground">Structured discharge documentation for admitted patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 space-y-2 max-h-[500px] overflow-y-auto">
            <Input placeholder="Search admissions..." value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
            {filtered.length === 0 ? (
              <EmptyState icon={FileText} title="No admissions" description="Admitted patients appear here for discharge documentation." />
            ) : (
              filtered.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selected?.id === a.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{nameFor(a.patient_id)}</span>
                    <Badge variant={a.status === 'discharged' ? 'default' : 'secondary'} className="text-[10px] capitalize">{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.admission_number} • {a.admission_type || 'Admission'}</p>
                  <p className="text-xs text-muted-foreground">
                    Adm: {a.admission_date ? new Date(a.admission_date).toLocaleDateString() : '—'}
                    {a.discharge_date ? ` → Dis: ${new Date(a.discharge_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            {selected ? (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium text-sm text-foreground">{nameFor(selected.patient_id)} ({selected.admission_number})</p>
                  <p className="text-xs text-muted-foreground">
                    Diagnosis on admission: {selected.diagnosis || '—'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field('Admission Diagnosis', 'admission_diagnosis')}
                  {field('Discharge Diagnosis', 'discharge_diagnosis')}
                </div>
                {field('Procedures Performed', 'procedures_performed')}
                {field('Course in Hospital', 'course_in_hospital', 3)}
                {field('Investigations Summary', 'investigations_summary')}
                {field('Discharge Medications', 'discharge_medications', 3)}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field('Diet Advice', 'diet_advice')}
                  {field('Follow-up Instructions', 'follow_up_instructions')}
                </div>

                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button className="gap-2" disabled={saving} onClick={() => save(false)}>
                    <Save className="h-4 w-4" /> Save Draft
                  </Button>
                  <Button variant="outline" className="gap-2" disabled={saving} onClick={() => save(true)}>
                    <CheckCircle2 className="h-4 w-4" /> Finalize & Discharge
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState icon={FileText} title="Select an admission" description="Choose a patient on the left to create or view their discharge summary." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

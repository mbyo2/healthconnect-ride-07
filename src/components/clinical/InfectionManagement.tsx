import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Bug, Plus, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Props {
  hospital: any;
}

export const InfectionManagement = ({ hospital }: Props) => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', infection_type: '', infection_site: '', organism: '',
    source: '', risk_factors: '', preventive_measures: '', prophylactic_drugs: '',
    follow_up_notes: ''
  });

  const { data: records = [] } = useQuery({
    queryKey: ['infection-records', hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('infection_records' as any)
        .select('*')
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!hospital?.id,
  });

  const addRecord = async () => {
    if (!form.infection_type) { toast.error('Infection type required'); return; }
    const { error } = await supabase.from('infection_records' as any).insert({
      hospital_id: hospital.id,
      patient_id: hospital.admin_id, // placeholder
      infection_type: form.infection_type,
      infection_site: form.infection_site,
      organism: form.organism,
      source: form.source,
      risk_factors: form.risk_factors ? form.risk_factors.split(',').map((s: string) => s.trim()) : [],
      preventive_measures: form.preventive_measures ? form.preventive_measures.split(',').map((s: string) => s.trim()) : [],
      prophylactic_drugs: form.prophylactic_drugs ? form.prophylactic_drugs.split(',').map((s: string) => s.trim()) : [],
      follow_up_notes: form.follow_up_notes,
      reported_by: hospital.admin_id,
    });
    if (error) { toast.error('Failed to add record'); console.error(error); return; }
    toast.success('Infection record added');
    setShowAdd(false);
    setForm({ patient_id: '', infection_type: '', infection_site: '', organism: '', source: '', risk_factors: '', preventive_measures: '', prophylactic_drugs: '', follow_up_notes: '' });
    queryClient.invalidateQueries({ queryKey: ['infection-records'] });
  };

  const closeRecord = async (id: string) => {
    await supabase.from('infection_records' as any).update({ status: 'resolved', closed_at: new Date().toISOString() }).eq('id', id);
    toast.success('Infection record resolved');
    queryClient.invalidateQueries({ queryKey: ['infection-records'] });
  };

  const active = records.filter((r: any) => r.status === 'active');
  const resolved = records.filter((r: any) => r.status !== 'active');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bug className="h-5 w-5 text-destructive" /> Infection Management
          </h3>
          <p className="text-sm text-muted-foreground">Track & manage healthcare-associated infections</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Log Infection</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{resolved.length}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {records.map((r: any) => (
          <Card key={r.id} className={r.status === 'active' ? 'border-destructive/40' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{r.infection_type}</span>
                    <Badge variant={r.status === 'active' ? 'destructive' : 'default'} className="text-[10px]">{r.status}</Badge>
                    {r.organism && <Badge variant="outline" className="text-[10px]">{r.organism}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {r.infection_site && <p>Site: {r.infection_site}</p>}
                    {r.source && <p>Source: {r.source}</p>}
                    {r.risk_factors?.length > 0 && <p>Risk Factors: {r.risk_factors.join(', ')}</p>}
                    {r.preventive_measures?.length > 0 && <p>Preventive: {r.preventive_measures.join(', ')}</p>}
                    <p>Detected: {new Date(r.detection_date).toLocaleDateString()}</p>
                  </div>
                </div>
                {r.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => closeRecord(r.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No infection records logged</p>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Infection Record</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Infection Type *</Label>
                <Select value={form.infection_type} onValueChange={v => setForm(p => ({ ...p, infection_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['SSI', 'CAUTI', 'CLABSI', 'VAP', 'MRSA', 'C. diff', 'UTI', 'Pneumonia', 'Sepsis', 'Wound Infection', 'Other'].map(t =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Infection Site</Label>
                <Input value={form.infection_site} onChange={e => setForm(p => ({ ...p, infection_site: e.target.value }))} placeholder="e.g., Surgical wound" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Organism</Label>
                <Input value={form.organism} onChange={e => setForm(p => ({ ...p, organism: e.target.value }))} placeholder="e.g., Staph aureus" />
              </div>
              <div><Label className="text-xs">Source</Label>
                <Input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} placeholder="e.g., Central line" />
              </div>
            </div>
            <div><Label className="text-xs">Risk Factors (comma-separated)</Label>
              <Input value={form.risk_factors} onChange={e => setForm(p => ({ ...p, risk_factors: e.target.value }))} placeholder="e.g., Diabetes, Immunosuppressed" />
            </div>
            <div><Label className="text-xs">Preventive Measures (comma-separated)</Label>
              <Input value={form.preventive_measures} onChange={e => setForm(p => ({ ...p, preventive_measures: e.target.value }))} placeholder="e.g., Hand hygiene, Contact precautions" />
            </div>
            <div><Label className="text-xs">Prophylactic Drugs (comma-separated)</Label>
              <Input value={form.prophylactic_drugs} onChange={e => setForm(p => ({ ...p, prophylactic_drugs: e.target.value }))} placeholder="e.g., Cefazolin" />
            </div>
            <div><Label className="text-xs">Notes</Label>
              <Textarea value={form.follow_up_notes} onChange={e => setForm(p => ({ ...p, follow_up_notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addRecord}>Log Infection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, CheckCircle2, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/utils/friendly-error';

const RESOURCE_TYPES = [
  { id: 'Patient', label: 'Patient Demographics' },
  { id: 'Condition', label: 'Conditions & Diagnoses' },
  { id: 'MedicationRequest', label: 'Medications & Prescriptions' },
  { id: 'Observation', label: 'Health Observations' },
];

interface PatientOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const CrossSystemExchange: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(RESOURCE_TYPES.map(r => r.id));
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: adm } = await supabase
          .from('hospital_admissions' as any)
          .select('patient_id')
          .eq('hospital_id', institutionId)
          .limit(500);
        const ids = [...new Set((((adm as any[]) || []).map((a: any) => a.patient_id).filter(Boolean)))];
        if (!ids.length || cancelled) return;
        const { data: profs } = await supabase.from('profiles').select('id,first_name,last_name').in('id', ids);
        if (cancelled) return;
        const opts = ((profs as any[]) || []).map((p: any) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name }));
        setPatients(opts);
        if (opts.length && !selectedPatientId) setSelectedPatientId(opts[0].id);
      } catch (e: any) {
        console.error('Exchange roster failed:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!selectedPatientId) { toast.error('Select a patient'); return; }
    if (!targetUrl.trim()) { toast.error('Enter the target FHIR endpoint URL'); return; }
    if (selectedTypes.length === 0) { toast.error('Select at least one resource type'); return; }

    let url: URL;
    try {
      url = new URL(targetUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
    } catch {
      toast.error('Invalid URL — must be http(s)://…');
      return;
    }

    setSending(true);
    setLastResult(null);

    // Log the attempt first (status=pending)
    const { data: exchange } = await supabase.from('fhir_exchanges').insert({
      direction: 'outbound',
      target_system: targetName.trim() || url.host,
      patient_id: selectedPatientId,
      resources: selectedTypes,
      status: 'pending',
      initiated_by: user?.id,
      institution_id: institutionId || null,
    }).select('id').single();

    try {
      // 1. Build the FHIR bundle via the existing export function
      const { data: bundleData, error: exportError } = await supabase.functions.invoke('fhir-export', {
        body: { patientId: selectedPatientId, resourceTypes: selectedTypes },
      });
      if (exportError) throw new Error('Bundle build failed: ' + exportError.message);

      // 2. Convert to a transaction bundle for the target system
      const transactionBundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        timestamp: new Date().toISOString(),
        entry: (bundleData.entry || []).map((e: any) => ({
          resource: e.resource,
          request: {
            method: 'POST',
            url: e.resource.resourceType,
          },
        })),
      };

      // 3. POST to the external FHIR server
      const headers: Record<string, string> = { 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' };
      if (authToken.trim()) headers['Authorization'] = `Bearer ${authToken.trim()}`;

      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(transactionBundle),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Target server responded ${resp.status}: ${text.slice(0, 200)}`);
      }

      await resp.json().catch(() => null);

      // 4. Mark delivered + audit
      await supabase.from('fhir_exchanges').update({
        status: 'delivered',
        bundle: transactionBundle,
        updated_at: new Date().toISOString(),
      }).eq('id', exchange?.id);

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'fhir_outbound_sent',
        resource: 'fhir_exchanges',
        resource_id: exchange?.id,
        details: { target_system: targetName.trim() || url.host, target_url: url.toString(), patient_id: selectedPatientId, resources: selectedTypes },
        severity: 'info',
        category: 'data_access',
        outcome: 'success',
      });

      setLastResult({ ok: true, message: `Record sent to ${targetName.trim() || url.host}` });
      toast.success('Record sent successfully');
    } catch (err: any) {
      await supabase.from('fhir_exchanges').update({
        status: 'failed',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      }).eq('id', exchange?.id);

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'fhir_outbound_failed',
        resource: 'fhir_exchanges',
        resource_id: exchange?.id,
        details: { target_system: targetName.trim() || targetUrl, error: err.message },
        severity: 'warning',
        category: 'data_access',
        outcome: 'failure',
      });

      setLastResult({ ok: false, message: err.message });
      toast.error(friendlyErrorMessage(err, "Send failed. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Send Record to External System
            </CardTitle>
            <CardDescription>Transmit a patient's FHIR record to another healthcare system's FHIR endpoint</CardDescription>
          </div>
          <Badge variant="outline">FHIR R4</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target system name</Label>
            <Input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="e.g. Partner Hospital FHIR" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target FHIR endpoint URL</Label>
          <Input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://fhir.partner-hospital.com/fhir" />
          <p className="text-xs text-muted-foreground">The bundle is POSTed to this URL as a FHIR transaction Bundle.</p>
        </div>

        <div className="space-y-2">
          <Label>Bearer token (optional)</Label>
          <Input type="password" value={authToken} onChange={e => setAuthToken(e.target.value)} placeholder="Authorization token for the target system" />
        </div>

        <div className="space-y-2">
          <Label>Resources to include</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RESOURCE_TYPES.map(r => (
              <label key={r.id} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <Checkbox checked={selectedTypes.includes(r.id)} onCheckedChange={() => toggleType(r.id)} />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {lastResult && (
          <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${lastResult.ok ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
            {lastResult.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
            {lastResult.message}
          </div>
        )}

        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          {sending ? 'Sending…' : 'Send Record'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Every exchange is logged for audit. Only send records you are authorized to share.
        </p>
      </CardContent>
    </Card>
  );
};

export default CrossSystemExchange;

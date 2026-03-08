import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Microscope, FileText, Activity, ClipboardList, Plus, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { toast } from 'sonner';

interface LabReport {
  id: string;
  patient_name: string;
  test_name: string;
  result_value: string;
  reference_range: string;
  status: 'pending_review' | 'reviewed' | 'critical' | 'released';
  findings: string;
  reviewed_by: string | null;
  submitted_at: string;
}

export const PathologistWorkflow = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [findings, setFindings] = useState('');

  // Fetch from lab_test_results as proxy
  useEffect(() => {
    if (!institutionId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('lab_test_results')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(100);

      setReports((data || []).map((d: any) => ({
        id: d.id,
        patient_name: d.patient_name || 'Patient',
        test_name: d.test_name || d.test_type || 'Unknown',
        result_value: d.result_value || '--',
        reference_range: d.reference_range || '--',
        status: d.is_critical ? 'critical' : d.verified_by ? 'released' : 'pending_review',
        findings: d.pathologist_notes || '',
        reviewed_by: d.verified_by || null,
        submitted_at: d.created_at,
      })));
      setLoading(false);
    };
    fetch();
  }, [institutionId]);

  const pendingReview = reports.filter(r => r.status === 'pending_review');
  const critical = reports.filter(r => r.status === 'critical');
  const completedToday = reports.filter(r => r.status === 'released' && r.submitted_at?.startsWith(new Date().toISOString().split('T')[0]));

  const handleSignOff = (report: LabReport) => {
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'released', reviewed_by: user?.email || 'Pathologist', findings } : r));
    setSelectedReport(null);
    setFindings('');
    toast.success(`Report for ${report.patient_name} signed off`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pathologist Dashboard</h1>
        <p className="text-muted-foreground">Lab report review, sign-off & quality control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" /> Pending Review</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{pendingReview.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" /> Released Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{completedToday.length}</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Microscope className="h-5 w-5 text-destructive" /> Critical</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{critical.length}</p></CardContent></Card>
      </div>

      {selectedReport && (
        <Card className="border-primary">
          <CardHeader><CardTitle>Review: {selectedReport.patient_name} — {selectedReport.test_name}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Result</Label><p className="font-mono text-lg">{selectedReport.result_value}</p></div>
              <div><Label className="text-muted-foreground">Reference Range</Label><p className="font-mono text-lg">{selectedReport.reference_range}</p></div>
            </div>
            <div className="space-y-1">
              <Label>Pathologist Findings & Comments</Label>
              <Textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4} placeholder="Enter clinical interpretation, findings, and recommendations..." />
            </div>
            <div className="flex gap-2">
              <Button className="gap-1" onClick={() => handleSignOff(selectedReport)}><CheckCircle className="h-4 w-4" /> Sign Off & Release</Button>
              <Button variant="destructive" onClick={() => { setReports(prev => prev.map(r => r.id === selectedReport.id ? {...r, status: 'critical'} : r)); setSelectedReport(null); }}>Flag Critical</Button>
              <Button variant="ghost" onClick={() => setSelectedReport(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Reports Queue</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            reports.length === 0 ? <p className="text-muted-foreground text-center py-4">No reports in queue</p> : (
              <div className="space-y-2">
                {reports.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{r.patient_name} — {r.test_name}</p>
                      <p className="text-sm text-muted-foreground">Result: {r.result_value} (Ref: {r.reference_range})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === 'critical' ? 'destructive' : 'outline'}>{r.status.replace('_', ' ')}</Badge>
                      {(r.status === 'pending_review' || r.status === 'critical') && (
                        <Button size="sm" onClick={() => { setSelectedReport(r); setFindings(r.findings); }}>Review</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </CardContent>
      </Card>
    </div>
  );
};

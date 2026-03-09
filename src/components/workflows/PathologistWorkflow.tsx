import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Microscope, Activity, ClipboardList, CheckCircle, Loader2, Eye } from 'lucide-react';
import { usePathologistReviews } from '@/hooks/usePathologistReviews';
import { DigitalSlideViewer } from '@/components/pathology/DigitalSlideViewer';

export const PathologistWorkflow = () => {
  const { reviews, loading, pending, critical, released, signOff, flagCritical } = usePathologistReviews();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [findings, setFindings] = useState('');
  const [significance, setSignificance] = useState('normal');

  const selectedReport = reviews.find(r => r.id === selectedId);

  const releasedToday = released.filter(r => r.released_at?.startsWith(new Date().toISOString().split('T')[0]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pathologist Dashboard</h1>
        <p className="text-muted-foreground">Lab result oversight, clinical sign-off & quality control — distinct from lab tech execution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" /> Pending Review</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{pending.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" /> Released Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{releasedToday.length}</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Microscope className="h-5 w-5 text-destructive" /> Critical</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{critical.length}</p></CardContent></Card>
      </div>

      {selectedReport && (
        <Card className="border-primary">
          <CardHeader><CardTitle>Review: {selectedReport.patient_name} — {selectedReport.test_name}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-muted-foreground">Result</Label><p className="font-mono text-lg">{selectedReport.result_value || '--'}</p></div>
              <div><Label className="text-muted-foreground">Reference Range</Label><p className="font-mono text-lg">{selectedReport.reference_range || '--'}</p></div>
              <div><Label className="text-muted-foreground">Lab Tech</Label><p>{selectedReport.lab_tech_name || 'N/A'}</p></div>
            </div>
            <div className="space-y-1">
              <Label>Clinical Significance</Label>
              <Select value={significance} onValueChange={setSignificance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="abnormal">Abnormal</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Pathologist Findings</Label>
              <Textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4} placeholder="Clinical interpretation, findings, recommendations..." />
            </div>
            <div className="flex gap-2">
              <Button className="gap-1" onClick={() => { signOff(selectedReport.id, findings, significance); setSelectedId(null); setFindings(''); }}><CheckCircle className="h-4 w-4" /> Sign Off & Release</Button>
              <Button variant="destructive" onClick={() => { flagCritical(selectedReport.id); setSelectedId(null); }}>Flag Critical</Button>
              <Button variant="ghost" onClick={() => setSelectedId(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Review Queue</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            reviews.length === 0 ? <p className="text-muted-foreground text-center py-4">No reports in queue</p> : (
              <div className="space-y-2">
                {reviews.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{r.patient_name} — {r.test_name}</p>
                      <p className="text-sm text-muted-foreground">Result: {r.result_value || '--'} (Ref: {r.reference_range || '--'}) • Lab: {r.lab_tech_name || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === 'critical' ? 'destructive' : 'outline'}>{r.status.replace(/_/g, ' ')}</Badge>
                      {['pending_review', 'critical'].includes(r.status) && (
                        <Button size="sm" onClick={() => { setSelectedId(r.id); setFindings(r.findings || ''); }}>Review</Button>
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

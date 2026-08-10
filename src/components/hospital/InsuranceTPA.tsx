import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle2, FileText, DollarSign, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const InsuranceTPA = ({ hospital }: { hospital: any }) => {
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimForm, setClaimForm] = useState({
    patient_name: '',
    insurance_provider: '',
    policy_number: '',
    claim_amount: '',
    pre_auth_number: '',
    diagnosis: '',
    admission_date: '',
    discharge_date: '',
  });
  const { data: claims, loading, error, refresh } = useHospitalModule<any>(
    'insurance_claims', 'institution_id', hospital?.id, { orderBy: 'created_at', ascending: false }
  );

  const open = claims.filter(c => ['draft', 'submitted', 'processing', 'pending'].includes(c.status));
  const settled = claims.filter(c => ['paid', 'approved'].includes(c.status));
  const disputed = claims.filter(c => ['disputed', 'rejected'].includes(c.status));
  const receivable = claims
    .filter(c => !['paid'].includes(c.status))
    .reduce((s, c) => s + Number(c.claim_amount || 0), 0);

  const handleNewClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.patient_name || !claimForm.insurance_provider || !claimForm.claim_amount) {
      toast.error('Please fill required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from('insurance_claims' as any) as any).insert({
        institution_id: hospital.id,
        patient_name: claimForm.patient_name,
        insurance_provider: claimForm.insurance_provider,
        policy_number: claimForm.policy_number,
        claim_amount: Number(claimForm.claim_amount),
        pre_auth_number: claimForm.pre_auth_number || null,
        diagnosis_code: claimForm.diagnosis,
        admission_date: claimForm.admission_date || null,
        discharge_date: claimForm.discharge_date || null,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      if (err) throw err;
      toast.success('Insurance claim created as draft');
      setShowNewClaim(false);
      setClaimForm({ patient_name: '', insurance_provider: '', policy_number: '', claim_amount: '', pre_auth_number: '', diagnosis: '', admission_date: '', discharge_date: '' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (row: any, status: string) => {
    try {
      const patch: any = { status };
      if (status === 'submitted') patch.submitted_at = new Date().toISOString();
      if (['paid', 'approved', 'rejected'].includes(status)) patch.processed_at = new Date().toISOString();
      const { error: err } = await (supabase.from('insurance_claims' as any) as any).update(patch).eq('id', row.id);
      if (err) throw err;
      toast.success(`Claim ${status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update claim');
    }
  };

  const ClaimCard = ({ c }: { c: any }) => (
    <Card key={c.id}>
      <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{c.patient_name || 'Patient'}</span>
            <Badge
              variant={['paid', 'approved'].includes(c.status) ? 'default' : ['rejected', 'disputed'].includes(c.status) ? 'destructive' : 'secondary'}
              className="text-[10px] capitalize"
            >
              {c.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {c.insurance_provider || 'Insurer'}{c.policy_number ? ` (${c.policy_number})` : ''} • Claimed: K{Number(c.claim_amount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.submitted_at ? `Submitted ${new Date(c.submitted_at).toLocaleDateString()}` : 'Not submitted'}
            {Number(c.approved_amount || 0) > 0 ? ` • Approved: K${Number(c.approved_amount).toLocaleString()}` : ''}
            {c.rejection_reason ? ` • ${c.rejection_reason}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          {['draft', 'pending'].includes(c.status) && (
            <Button size="sm" className="text-xs" onClick={() => setStatus(c, 'submitted')}>Submit</Button>
          )}
          {['submitted', 'processing'].includes(c.status) && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setStatus(c, 'paid')}>Mark Paid</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Insurance & TPA Management</h3>
          <p className="text-sm text-muted-foreground">Claims processing and settlement tracking</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
          <Button size="sm" onClick={() => setShowNewClaim(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New Claim
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{open.length}</p>
          <p className="text-xs text-muted-foreground">Open Claims</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{settled.length}</p>
          <p className="text-xs text-muted-foreground">Settled</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <FileText className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-foreground">{disputed.length}</p>
          <p className="text-xs text-muted-foreground">Rejected/Disputed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">K{(receivable / 1000).toFixed(1)}k</p>
          <p className="text-xs text-muted-foreground">Receivable</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={FileText} title="Could not load claims" description={error} actionLabel="Retry" onAction={refresh} />
      ) : claims.length === 0 ? (
        <EmptyState icon={FileText} title="No insurance claims" description="Claims raised from billing appear here for submission and settlement." />
      ) : (
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
            <TabsTrigger value="settled" className="text-xs">Settled</TabsTrigger>
            <TabsTrigger value="disputed" className="text-xs">Disputed</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="space-y-3 pt-3">
            {open.length === 0 ? <EmptyState icon={FileText} title="No open claims" /> : open.map(c => <ClaimCard key={c.id} c={c} />)}
          </TabsContent>
          <TabsContent value="settled" className="space-y-3 pt-3">
            {settled.length === 0 ? <EmptyState icon={FileText} title="No settled claims" /> : settled.map(c => <ClaimCard key={c.id} c={c} />)}
          </TabsContent>
          <TabsContent value="disputed" className="space-y-3 pt-3">
            {disputed.length === 0 ? <EmptyState icon={FileText} title="No disputed claims" /> : disputed.map(c => <ClaimCard key={c.id} c={c} />)}
          </TabsContent>
        </Tabs>
      )}

      {/* New Insurance Claim Dialog */}
      <Dialog open={showNewClaim} onOpenChange={setShowNewClaim}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>New Insurance Claim</DialogTitle></DialogHeader>
          <form onSubmit={handleNewClaim} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Patient Name *</Label><Input value={claimForm.patient_name} onChange={e => setClaimForm({...claimForm, patient_name: e.target.value})} placeholder="Full name" required /></div>
              <div><Label>Insurance Provider *</Label><Input value={claimForm.insurance_provider} onChange={e => setClaimForm({...claimForm, insurance_provider: e.target.value})} placeholder="e.g. NHIMA, Zambia Life" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Policy Number</Label><Input value={claimForm.policy_number} onChange={e => setClaimForm({...claimForm, policy_number: e.target.value})} placeholder="Policy/Member No." /></div>
              <div><Label>Pre-Auth Number</Label><Input value={claimForm.pre_auth_number} onChange={e => setClaimForm({...claimForm, pre_auth_number: e.target.value})} placeholder="If applicable" /></div>
            </div>
            <div>
              <Label>Claim Amount (K) *</Label>
              <Input type="number" value={claimForm.claim_amount} onChange={e => setClaimForm({...claimForm, claim_amount: e.target.value})} placeholder="0.00" required />
            </div>
            <div>
              <Label>Diagnosis / ICD Code</Label>
              <Input value={claimForm.diagnosis} onChange={e => setClaimForm({...claimForm, diagnosis: e.target.value})} placeholder="e.g. J18.9 - Pneumonia" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Admission Date</Label><Input type="date" value={claimForm.admission_date} onChange={e => setClaimForm({...claimForm, admission_date: e.target.value})} /></div>
              <div><Label>Discharge Date</Label><Input type="date" value={claimForm.discharge_date} onChange={e => setClaimForm({...claimForm, discharge_date: e.target.value})} /></div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowNewClaim(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create Claim</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

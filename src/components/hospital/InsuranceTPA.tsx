import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const InsuranceTPA = ({ hospital }: { hospital: any }) => {
  const { user } = useAuth();
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [showInvoicePicker, setShowInvoicePicker] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);
  // Adjudication (approve/pay with insurer's settled amount)
  const [adjudicating, setAdjudicating] = useState<any>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [adjudicateStatus, setAdjudicateStatus] = useState<'approved' | 'paid'>('approved');

  const openAdjudicate = (claim: any, status: 'approved' | 'paid') => {
    setAdjudicating(claim);
    setAdjudicateStatus(status);
    setApprovedAmount(String(claim.claim_amount ?? ''));
  };

  const confirmAdjudicate = async () => {
    if (!adjudicating) return;
    const amt = Number(approvedAmount);
    if (!(amt >= 0)) {
      toast.error('Enter the insurer-approved amount');
      return;
    }
    try {
      const { error: err } = await (supabase.from('insurance_claims' as any) as any)
        .update({ approved_amount: amt, status: adjudicateStatus, processed_at: new Date().toISOString() })
        .eq('id', adjudicating.id);
      if (err) throw err;
      const updated = { ...adjudicating, approved_amount: amt, status: adjudicateStatus };
      setAdjudicating(null);
      // Reuse the settlement path so the linked bill is updated.
      await setStatus(updated, adjudicateStatus);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record adjudication');
    }
  };
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

  // Billing → insurance handoff: raise a claim straight from an unpaid
  // invoice so billers never retype patient, amount or admission context.
  const openInvoicePicker = async () => {
    setShowInvoicePicker(true);
    setLoadingInvoices(true);
    try {
      const { data } = await (supabase.from('hospital_billing' as any) as any)
        .select('id, invoice_number, total_amount, balance, payment_status, patient_id, patient:profiles!patient_id(first_name, last_name), admission:hospital_admissions!admission_id(admission_date, discharge_date, diagnosis)')
        .eq('hospital_id', hospital.id)
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100);
      setUnpaidInvoices(data || []);
    } catch (e) {
      console.error('Failed to load invoices for claims:', e);
      setUnpaidInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const raiseFromInvoice = (inv: any) => {
    const adm = Array.isArray(inv.admission) ? inv.admission[0] : inv.admission;
    setLinkedInvoiceId(inv.id);
    setLinkedPatientId(inv.patient_id || null);
    setClaimForm({
      patient_name: [inv.patient?.first_name, inv.patient?.last_name].filter(Boolean).join(' ') || '',
      insurance_provider: '',
      policy_number: '',
      claim_amount: String(inv.balance ?? inv.total_amount ?? ''),
      pre_auth_number: '',
      diagnosis: adm?.diagnosis || '',
      admission_date: (adm?.admission_date || '').split('T')[0],
      discharge_date: (adm?.discharge_date || '').split('T')[0],
    });
    setShowInvoicePicker(false);
    setShowNewClaim(true);
  };
  const { data: claims, loading, error, refresh } = useHospitalModule<any>(
    'insurance_claims', 'institution_id', hospital?.id, { orderBy: 'created_at', ascending: false }
  );

  // Claim adjudications settle bills — reflect them the moment they land.
  useEffect(() => {
    if (!hospital?.id) return;
    const channel = supabase
      .channel(`insurance-claims-live-${hospital.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'insurance_claims', filter: `institution_id=eq.${hospital.id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, refresh]);

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
        created_by: user?.id,
        patient_id: linkedPatientId,
        patient_name: claimForm.patient_name,
        insurance_provider: claimForm.insurance_provider,
        policy_number: claimForm.policy_number,
        claim_amount: Number(claimForm.claim_amount),
        pre_auth_number: claimForm.pre_auth_number || null,
        diagnosis_code: claimForm.diagnosis,
        admission_date: claimForm.admission_date || null,
        discharge_date: claimForm.discharge_date || null,
        invoice_id: linkedInvoiceId,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      if (err) throw err;
      toast.success(
        linkedInvoiceId ? 'Insurance claim created as draft and linked to the invoice' : 'Insurance claim created as draft'
      );
      setShowNewClaim(false);
      setLinkedInvoiceId(null);
      setLinkedPatientId(null);
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

      // Claim paid → settle it against the linked hospital bill so the
      // invoice balance stays truthful (settles in full when covered).
      if ((status === 'paid' || status === 'approved') && row.invoice_id && Number(row.approved_amount || 0) > 0) {
        try {
          const { data: bill } = await (supabase.from('hospital_billing' as any) as any)
            .select('id, balance, total_amount')
            .eq('id', row.invoice_id)
            .maybeSingle();
          if (bill) {
            const nextBalance = Math.max(Number(bill.balance ?? bill.total_amount ?? 0) - Number(row.approved_amount), 0);
            await (supabase.from('hospital_billing' as any) as any)
              .update({
                balance: nextBalance,
                paid_amount: Number(row.approved_amount),
                payment_status: nextBalance <= 0 ? 'paid' : 'partial',
              })
              .eq('id', row.invoice_id);
            toast.success(`Claim ${status} — K${Number(row.approved_amount).toLocaleString()} applied to the invoice`);
            refresh();
            return;
          }
        } catch (billErr) {
          console.error('Bill settlement failed (non-fatal):', billErr);
        }
      }

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
            <>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => openAdjudicate(c, 'approved')}>Approve</Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => openAdjudicate(c, 'paid')}>Mark Paid</Button>
            </>
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
          <Button size="sm" variant="outline" onClick={openInvoicePicker} className="gap-1">
            <FileText className="h-4 w-4" /> From Invoice
          </Button>
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

      {/* Raise-from-invoice picker (billing handoff) */}
      <Dialog open={showInvoicePicker} onOpenChange={setShowInvoicePicker}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Raise Claim from Unpaid Invoice</DialogTitle></DialogHeader>
          <div className="py-2 max-h-[50vh] overflow-y-auto space-y-2">
            {loadingInvoices ? (
              <ListSkeleton count={3} variant="row" />
            ) : unpaidInvoices.length === 0 ? (
              <EmptyState icon={FileText} title="No unpaid invoices" description="All billing is settled — nothing to claim right now." />
            ) : (
              unpaidInvoices.map((inv: any) => (
                <button
                  key={inv.id}
                  onClick={() => raiseFromInvoice(inv)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {[inv.patient?.first_name, inv.patient?.last_name].filter(Boolean).join(' ') || 'Patient'}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">{inv.invoice_number}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Balance K{Number(inv.balance ?? inv.total_amount ?? 0).toLocaleString()} • {inv.payment_status}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjudication dialog — record what the insurer actually settled */}
      <Dialog open={!!adjudicating} onOpenChange={(v) => { if (!v) setAdjudicating(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {adjudicateStatus === 'paid' ? 'Mark Claim Paid' : 'Approve Claim'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {adjudicating?.patient_name} · {adjudicating?.insurance_provider} ·
              claimed K{Number(adjudicating?.claim_amount || 0).toLocaleString()}
              {adjudicating?.invoice_id ? ' · linked invoice will be settled automatically' : ''}
            </p>
            <div>
              <Label>Approved / Paid Amount (K) *</Label>
              <Input
                type="number"
                min={0}
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjudicating(null)}>Cancel</Button>
            <Button onClick={confirmAdjudicate}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Insurance Claim Dialog */}
      <Dialog open={showNewClaim} onOpenChange={setShowNewClaim}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>New Insurance Claim</DialogTitle></DialogHeader>
          {linkedInvoiceId && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <span className="font-medium text-primary">Linked to hospital invoice — settlement will apply automatically</span>
              <button
                type="button"
                className="font-bold text-muted-foreground hover:text-foreground"
                onClick={() => { setLinkedInvoiceId(null); setLinkedPatientId(null); }}
              >
                Unlink
              </button>
            </div>
          )}
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

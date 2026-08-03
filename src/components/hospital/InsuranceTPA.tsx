import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, FileText, DollarSign } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const InsuranceTPA = ({ hospital }: { hospital: any }) => {
  const { data: claims, loading, error, refresh } = useHospitalModule<any>(
    'insurance_claims', 'institution_id', hospital?.id, { orderBy: 'created_at', ascending: false }
  );

  const open = claims.filter(c => ['draft', 'submitted', 'processing', 'pending'].includes(c.status));
  const settled = claims.filter(c => ['paid', 'approved'].includes(c.status));
  const disputed = claims.filter(c => ['disputed', 'rejected'].includes(c.status));
  const receivable = claims
    .filter(c => !['paid'].includes(c.status))
    .reduce((s, c) => s + Number(c.claim_amount || 0), 0);

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
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Insurance & TPA Management</h3>
          <p className="text-sm text-muted-foreground">Claims processing and settlement tracking</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
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
    </div>
  );
};

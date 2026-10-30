import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpRight, ArrowDownLeft, Loader2, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/utils/friendly-error';

interface Exchange {
  id: string;
  direction: 'outbound' | 'inbound';
  target_system: string;
  patient_id: string | null;
  resources: string[];
  status: string;
  bundle: any;
  error_message: string | null;
  created_at: string;
  patient_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700',
  sent: 'bg-blue-500/15 text-blue-700',
  delivered: 'bg-green-500/15 text-green-700',
  failed: 'bg-red-500/15 text-red-700',
  received: 'bg-blue-500/15 text-blue-700',
  processed: 'bg-green-500/15 text-green-700',
  rejected: 'bg-red-500/15 text-red-700',
};

export default function FHIRExchanges() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'outbound' | 'inbound'>('all');
  const [selected, setSelected] = useState<Exchange | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fhir_exchanges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const rows = (data || []) as Exchange[];
      const patientIds = [...new Set(rows.map(r => r.patient_id).filter(Boolean))] as string[];
      let names: Record<string, string> = {};
      if (patientIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id,first_name,last_name').in('id', patientIds);
        ((profs as any[]) || []).forEach((p: any) => { names[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim(); });
      }
      setExchanges(rows.map(r => ({ ...r, patient_name: r.patient_id ? names[r.patient_id] || r.patient_id.slice(0, 8) : '—' })));
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to load exchanges. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = exchanges.filter(e => filter === 'all' || e.direction === filter);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FHIR Exchange Log</h1>
          <p className="text-sm text-muted-foreground">Cross-system record sends and receipts, audited</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'outbound', 'inbound'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'outbound' ? 'Sent' : 'Received'}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exchanges ({filtered.length})</CardTitle>
          <CardDescription>Every cross-system FHIR bundle transfer is recorded here</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No exchanges yet.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                  <div className={`p-2 rounded-full ${e.direction === 'outbound' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                    {e.direction === 'outbound'
                      ? <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      : <ArrowDownLeft className="h-4 w-4 text-green-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{e.direction === 'outbound' ? 'To' : 'From'}: {e.target_system}</span>
                      <Badge className={STATUS_COLORS[e.status] || ''} variant="outline">{e.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Patient: {e.patient_name} · Resources: {(e.resources || []).join(', ')} · {new Date(e.created_at).toLocaleString()}
                    </p>
                    {e.error_message && <p className="text-xs text-red-600 truncate">{e.error_message}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(e)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Exchange bundle — {selected?.direction} · {selected?.target_system}</DialogTitle>
          </DialogHeader>
          {selected?.bundle ? (
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto">{JSON.stringify(selected.bundle, null, 2)}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">No bundle stored for this exchange.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

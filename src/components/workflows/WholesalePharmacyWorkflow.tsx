import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionContext } from '@/hooks/useInstitutionContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Package, Truck, Users, DollarSign, Plus, Loader2,
  Building2, Tag, CheckCircle2, XCircle, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface WholesaleOrder {
  id: string;
  order_number: string;
  buyer_institution_id: string;
  seller_pharmacy_id: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number }>;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface PriceTier {
  id: string;
  pharmacy_id: string;
  product_name: string;
  min_quantity: number;
  unit_price: number;
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-500',
  shipped: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-slate-500',
};

export const WholesalePharmacyWorkflow = () => {
  const { user } = useAuth();
  const { institution } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [tierForm, setTierForm] = useState({ product_name: '', min_quantity: '10', unit_price: '' });
  const [expandedOrder, setExpandedOrder] = useState<WholesaleOrder | null>(null);
  const [declineTarget, setDeclineTarget] = useState<WholesaleOrder | null>(null);
  const [tierDeleteTarget, setTierDeleteTarget] = useState<PriceTier | null>(null);

  const pharmacyId = institution?.id;

  // ── Bulk orders (both directions) ────────────────────────────
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['wholesale-orders', pharmacyId],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('wholesale_orders' as any) as any)
        .select('*')
        .or(`buyer_institution_id.eq.${pharmacyId},seller_pharmacy_id.eq.${pharmacyId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as WholesaleOrder[]) || [];
    },
  });

  const filteredOrders = useMemo(
    () => (orders || []).filter((o) => orderStatusFilter === 'all' || o.status === orderStatusFilter),
    [orders, orderStatusFilter]
  );

  const orderStats = useMemo(() => {
    const list = orders || [];
    return {
      total: list.length,
      pending: list.filter((o) => o.status === 'pending').length,
      revenue: list.filter((o) => o.seller_pharmacy_id === pharmacyId && o.status === 'delivered')
        .reduce((s, o) => s + Number(o.total_amount || 0), 0),
      asSeller: list.filter((o) => o.seller_pharmacy_id === pharmacyId).length,
    };
  }, [orders, pharmacyId]);

  // ── Price tiers ──────────────────────────────────────────────
  const { data: tiers } = useQuery({
    queryKey: ['wholesale-tiers', pharmacyId],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('wholesale_price_tiers' as any) as any)
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('product_name')
        .order('min_quantity');
      if (error) throw error;
      return (data as PriceTier[]) || [];
    },
  });

  // ── B2B clients (institutions we've traded with) ────────────
  const { data: clients } = useQuery({
    queryKey: ['wholesale-clients', pharmacyId],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const ids = new Set<string>();
      for (const o of orders || []) {
        if (o.buyer_institution_id !== pharmacyId) ids.add(o.buyer_institution_id);
        if (o.seller_pharmacy_id !== pharmacyId) ids.add(o.seller_pharmacy_id);
      }
      if (ids.size === 0) return [];
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select('id, name, type, city')
        .in('id', [...ids]);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // ── Mutations ────────────────────────────────────────────────
  const advanceOrder = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from('wholesale_orders' as any) as any)
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
      toast.success('Order updated.');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update order'),
  });

  const saveTier = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('wholesale_price_tiers' as any) as any).upsert({
        pharmacy_id: pharmacyId,
        product_name: tierForm.product_name.trim(),
        min_quantity: Number(tierForm.min_quantity),
        unit_price: Number(tierForm.unit_price),
      }, { onConflict: 'pharmacy_id,product_name,min_quantity' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-tiers'] });
      setShowTierDialog(false);
      setTierForm({ product_name: '', min_quantity: '10', unit_price: '' });
      toast.success('Price tier saved.');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save tier'),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('wholesale_price_tiers' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-tiers'] });
      toast.success('Price tier removed.');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete tier'),
  });

  const nextStatus = (status: string): string | null => {
    if (status === 'pending') return 'confirmed';
    if (status === 'confirmed') return 'shipped';
    if (status === 'shipped') return 'delivered';
    return null;
  };

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Truck className="h-6 w-6 text-primary-500" /> Wholesale Pharmacy — B2B
        </h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Bulk orders, volume pricing tiers, and institutional clients
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl mx-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Bulk Orders</TabsTrigger>
          <TabsTrigger value="tiers">Price Tiers</TabsTrigger>
          <TabsTrigger value="clients">B2B Clients</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><Package className="h-4 w-4" /> Bulk Orders</div>
              <p className="text-2xl font-bold mt-1">{orderStats.total}</p>
              <p className="text-xs text-muted-foreground">{orderStats.pending} pending action</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><Truck className="h-4 w-4" /> Orders as Seller</div>
              <p className="text-2xl font-bold mt-1">{orderStats.asSeller}</p>
              <p className="text-xs text-muted-foreground">fulfilled by you</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><DollarSign className="h-4 w-4" /> B2B Revenue</div>
              <p className="text-2xl font-bold mt-1">{formatPrice(orderStats.revenue)}</p>
              <p className="text-xs text-muted-foreground">delivered orders</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><Users className="h-4 w-4" /> B2B Clients</div>
              <p className="text-2xl font-bold mt-1">{clients?.length || 0}</p>
              <p className="text-xs text-muted-foreground">trading partners</p>
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* ── Bulk Orders ── */}
        <TabsContent value="orders" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setOrderStatusFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  orderStatusFilter === s
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 opacity-70">
                  {s === 'all' ? orders?.length || 0 : orders?.filter((o) => o.status === s).length || 0}
                </span>
              </button>
            ))}
          </div>
          {ordersLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}</div>
          ) : filteredOrders.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No bulk orders yet. Buyer institutions place orders through your price tiers.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((o) => {
                const selling = o.seller_pharmacy_id === pharmacyId;
                const next = nextStatus(o.status);
                return (
                  <Card key={o.id}>
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedOrder(o)}>
                          <p className="text-sm font-semibold">{o.order_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {selling ? 'Selling to buyer' : 'Buying from seller'} · {o.items.length} line items · {format(new Date(o.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{formatPrice(Number(o.total_amount))}</span>
                        <Badge className={`${ORDER_STATUS_COLORS[o.status]} text-white text-[10px]`}>{o.status}</Badge>
                      </div>
                      {selling && next && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => advanceOrder.mutate({ id: o.id, status: next })}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark {next}
                          </Button>
                          {o.status === 'pending' && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeclineTarget(o)}>
                              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Decline
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Order detail */}
          <Dialog open={!!expandedOrder} onOpenChange={() => setExpandedOrder(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{expandedOrder?.order_number}</DialogTitle></DialogHeader>
              <div className="space-y-1.5">
                {expandedOrder?.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border/50">
                    <span>{item.product_name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                    <span className="font-medium">{formatPrice(Number(item.unit_price) * Number(item.quantity))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold pt-2">
                  <span>Total</span>
                  <span>{formatPrice(Number(expandedOrder?.total_amount || 0))}</span>
                </div>
                {expandedOrder?.notes && <p className="text-xs text-muted-foreground mt-2">Note: {expandedOrder.notes}</p>}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Price Tiers ── */}
        <TabsContent value="tiers" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Volume discounts buyers see before ordering.</p>
            <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Tier</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Wholesale Price Tier</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Product name</Label>
                    <Input value={tierForm.product_name} onChange={(e) => setTierForm({ ...tierForm, product_name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Min. quantity</Label>
                      <Input type="number" min={1} value={tierForm.min_quantity} onChange={(e) => setTierForm({ ...tierForm, min_quantity: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unit price (K)</Label>
                      <Input type="number" min={0} step="0.01" value={tierForm.unit_price} onChange={(e) => setTierForm({ ...tierForm, unit_price: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => saveTier.mutate()}
                    disabled={!tierForm.product_name.trim() || !tierForm.unit_price || saveTier.isPending}
                  >
                    {saveTier.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Tier'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {(tiers || []).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No price tiers yet. Add your first volume discount tier.
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {tiers!.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{t.product_name}</p>
                      <p className="text-xs text-muted-foreground">{t.min_quantity}+ units · {formatPrice(Number(t.unit_price))}/unit</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setTierDeleteTarget(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── B2B Clients ── */}
        <TabsContent value="clients" className="mt-4">
          {(clients || []).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No trading partners yet. Clients appear here after the first bulk order.
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {clients!.map((c: any) => {
                const orderCount = (orders || []).filter(
                  (o) => o.buyer_institution_id === c.id || o.seller_pharmacy_id === c.id
                ).length;
                return (
                  <Card key={c.id}>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary-500" /> {c.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-muted-foreground capitalize">{String(c.type || '').replace(/_/g, ' ')}{c.city ? ` · ${c.city}` : ''}</p>
                      <p className="text-xs font-medium mt-1">{orderCount} order{orderCount === 1 ? '' : 's'}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Decline (cancel) a B2B order — financial impact, requires confirmation */}
      <AlertDialog open={declineTarget !== null} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline order {declineTarget?.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel a bulk order worth{' '}
              {declineTarget ? formatPrice(Number(declineTarget.total_amount)) : '—'} (
              {declineTarget?.items.length ?? 0} line items). The buyer will not be able to proceed
              with this order, and you will need to create a new order to trade again.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={advanceOrder.isPending}
              onClick={() => {
                if (declineTarget) advanceOrder.mutate({ id: declineTarget.id, status: 'cancelled' });
                setDeclineTarget(null);
              }}
            >
              Decline Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove a volume price tier — buyers lose the discount, requires confirmation */}
      <AlertDialog open={tierDeleteTarget !== null} onOpenChange={(open) => !open && setTierDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove price tier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the volume discount for{' '}
              {tierDeleteTarget?.product_name ?? 'this product'} (
              {tierDeleteTarget?.min_quantity}+ units at{' '}
              {tierDeleteTarget ? formatPrice(Number(tierDeleteTarget.unit_price)) : '—'}/unit).
              Buyers will no longer see this tier when placing bulk orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTier.isPending}
              onClick={() => {
                if (tierDeleteTarget) deleteTier.mutate(tierDeleteTarget.id);
                setTierDeleteTarget(null);
              }}
            >
              Remove Tier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

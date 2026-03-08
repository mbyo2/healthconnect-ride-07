import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, CreditCard, Banknote,
  Smartphone, Shield, User, Printer, X, Package
} from 'lucide-react';

interface CartItem {
  medication_inventory_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  batch_number?: string;
  stock_available?: number;
}

interface InventoryItem {
  id: string;
  medication_name: string;
  generic_name: string | null;
  dosage: string;
  unit_price: number | null;
  quantity_available: number;
  batch_number: string | null;
  medication_type: string;
}

export const PharmacyPOS = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [showCustomItem, setShowCustomItem] = useState(false);

  // Get pharmacy institution
  const { data: pharmacyId } = useQuery({
    queryKey: ['pharmacy-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('institution_staff')
        .select('institution_id')
        .eq('provider_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      return data?.institution_id || null;
    },
    enabled: !!user,
  });

  // Fetch inventory
  const { data: inventory } = useQuery({
    queryKey: ['pos-inventory', pharmacyId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('medication_inventory')
        .select('*')
        .eq('institution_id', pharmacyId!)
        .gt('quantity_available', 0)
        .order('medication_name');

      if (searchQuery.length >= 2) {
        query = query.or(`medication_name.ilike.%${searchQuery}%,generic_name.ilike.%${searchQuery}%`);
      }

      const { data } = await query.limit(20);
      return (data || []) as InventoryItem[];
    },
    enabled: !!pharmacyId,
  });

  // Check active register session
  const { data: activeSession } = useQuery({
    queryKey: ['pos-session', pharmacyId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('pos_register_sessions')
        .select('*')
        .eq('pharmacy_id', pharmacyId!)
        .eq('cashier_id', user!.id)
        .eq('status', 'open')
        .maybeSingle();
      return data;
    },
    enabled: !!pharmacyId && !!user,
  });

  // Add to cart
  const addToCart = useCallback((item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.medication_inventory_id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity_available) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map(c =>
          c.medication_inventory_id === item.id
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price - c.discount }
            : c
        );
      }
      return [...prev, {
        medication_inventory_id: item.id,
        item_name: `${item.medication_name} ${item.dosage}`,
        quantity: 1,
        unit_price: item.unit_price || 0,
        discount: 0,
        total: item.unit_price || 0,
        batch_number: item.batch_number || undefined,
        stock_available: item.quantity_available,
      }];
    });
  }, []);

  const addCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    const price = parseFloat(customItemPrice);
    setCart(prev => [...prev, {
      medication_inventory_id: null,
      item_name: customItemName,
      quantity: 1,
      unit_price: price,
      discount: 0,
      total: price,
    }]);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItem(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      if (item.stock_available && newQty > item.stock_available) {
        toast.error('Not enough stock');
        return item;
      }
      return { ...item, quantity: newQty, total: newQty * item.unit_price - item.discount };
    }));
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = 0; // Zambia: most medicines are zero-rated VAT
  const totalAmount = subtotal - discountAmount + taxAmount;

  // Process sale
  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!pharmacyId || !user) throw new Error('Not authorized');
      if (cart.length === 0) throw new Error('Cart is empty');

      // Generate receipt number
      const { data: receiptData } = await (supabase as any).rpc('generate_receipt_number', { p_pharmacy_id: pharmacyId });
      const receiptNumber = receiptData || `RCP-${Date.now()}`;

      // Create sale
      const { data: sale, error: saleError } = await (supabase as any)
        .from('pos_sales')
        .insert({
          pharmacy_id: pharmacyId,
          cashier_id: user.id,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          sale_type: 'walk_in',
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_reference: paymentRef || null,
          receipt_number: receiptNumber,
          status: 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const items = cart.map(item => ({
        sale_id: sale.id,
        medication_inventory_id: item.medication_inventory_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
        batch_number: item.batch_number || null,
      }));

      const { error: itemsError } = await (supabase as any)
        .from('pos_sale_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update customer record if phone provided
      if (customerPhone) {
        await (supabase as any)
          .from('pharmacy_customers')
          .upsert({
            pharmacy_id: pharmacyId,
            name: customerName || 'Walk-in',
            phone: customerPhone,
            total_purchases: totalAmount,
            visit_count: 1,
            last_visit_at: new Date().toISOString(),
          }, { onConflict: 'pharmacy_id,phone', ignoreDuplicates: false })
          .select();
      }

      return { ...sale, items: cart };
    },
    onSuccess: (data) => {
      setLastSale(data);
      setShowReceipt(true);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentRef('');
      setDiscountPercent(0);
      queryClient.invalidateQueries({ queryKey: ['pos-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['pos-session'] });
      toast.success('Sale completed!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Sale failed');
    },
  });

  // Open register
  const openRegister = useMutation({
    mutationFn: async (openingBalance: number) => {
      const { error } = await (supabase as any)
        .from('pos_register_sessions')
        .insert({
          pharmacy_id: pharmacyId,
          cashier_id: user!.id,
          opening_balance: openingBalance,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-session'] });
      toast.success('Register opened');
    },
  });

  // Close register
  const closeRegister = useMutation({
    mutationFn: async (closingBalance: number) => {
      const { error } = await (supabase as any)
        .from('pos_register_sessions')
        .update({
          closing_balance: closingBalance,
          expected_balance: (activeSession?.opening_balance || 0) + (activeSession?.cash_sales || 0) - (activeSession?.total_refunds || 0),
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-session'] });
      toast.success('Register closed');
    },
  });

  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');
  const [closingBalanceInput, setClosingBalanceInput] = useState('0');
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // If no active session, show open register
  if (!activeSession && pharmacyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Package className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle>Open Register</CardTitle>
            <CardDescription>Start your shift by opening the cash register</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Opening Cash Balance (ZMW)</Label>
              <Input type="number" value={openingBalanceInput} onChange={e => setOpeningBalanceInput(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => openRegister.mutate(parseFloat(openingBalanceInput) || 0)}>
              Open Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
      {/* Left: Product Search & Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search medication..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCustomItem(true)}>
            <Plus className="h-4 w-4 mr-1" /> Custom
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCloseDialog(true)}>
            Close Register
          </Button>
        </div>

        {/* Session info bar */}
        {activeSession && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 px-1">
            <span>Sales: {formatPrice(activeSession.total_sales || 0)}</span>
            <span>•</span>
            <span>Txns: {activeSession.transaction_count || 0}</span>
            <span>•</span>
            <span>Cash: {formatPrice(activeSession.cash_sales || 0)}</span>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {inventory?.map(item => (
              <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => addToCart(item)}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{item.medication_name}</p>
                  <p className="text-xs text-muted-foreground">{item.dosage} · {item.medication_type}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-bold text-primary">{formatPrice(item.unit_price || 0)}</span>
                    <Badge variant={item.quantity_available <= 5 ? 'destructive' : 'secondary'} className="text-xs">
                      {item.quantity_available}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!inventory || inventory.length === 0) && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {searchQuery ? 'No results found' : 'Type to search medications'}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-full lg:w-96 flex flex-col border rounded-lg bg-card">
        <div className="p-3 border-b flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">Cart ({cart.length})</span>
        </div>

        {/* Customer info */}
        <div className="p-3 border-b space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="text-sm" />
            <Input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="text-sm w-32" />
          </div>
        </div>

        {/* Cart items */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(index, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(index, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-medium w-16 text-right">{formatPrice(item.total)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Click items to add to cart
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Totals & Payment */}
        <div className="border-t p-3 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({discountPercent}%)</span><span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span><span>{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {/* Discount */}
          <div className="flex gap-1">
            {[0, 5, 10, 15].map(d => (
              <Button key={d} variant={discountPercent === d ? 'default' : 'outline'} size="sm" className="flex-1 text-xs"
                onClick={() => setDiscountPercent(d)}>
                {d === 0 ? 'No disc.' : `${d}%`}
              </Button>
            ))}
          </div>

          {/* Payment method */}
          <div className="flex gap-1">
            {[
              { value: 'cash', icon: <Banknote className="h-3.5 w-3.5" />, label: 'Cash' },
              { value: 'mobile_money', icon: <Smartphone className="h-3.5 w-3.5" />, label: 'MoMo' },
              { value: 'card', icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Card' },
              { value: 'insurance', icon: <Shield className="h-3.5 w-3.5" />, label: 'Insurance' },
            ].map(pm => (
              <Button key={pm.value} variant={paymentMethod === pm.value ? 'default' : 'outline'}
                size="sm" className="flex-1 text-xs gap-1" onClick={() => setPaymentMethod(pm.value)}>
                {pm.icon}{pm.label}
              </Button>
            ))}
          </div>

          {paymentMethod !== 'cash' && (
            <Input placeholder="Reference / Txn ID" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="text-sm" />
          )}

          <Button className="w-full" size="lg" disabled={cart.length === 0 || saleMutation.isPending}
            onClick={() => saleMutation.mutate()}>
            <Receipt className="h-4 w-4 mr-2" />
            {saleMutation.isPending ? 'Processing...' : `Complete Sale — ${formatPrice(totalAmount)}`}
          </Button>
        </div>
      </div>

      {/* Custom Item Dialog */}
      <Dialog open={showCustomItem} onOpenChange={setShowCustomItem}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Custom Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Name</Label><Input value={customItemName} onChange={e => setCustomItemName(e.target.value)} /></div>
            <div><Label>Price (ZMW)</Label><Input type="number" value={customItemPrice} onChange={e => setCustomItemPrice(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={addCustomItem} disabled={!customItemName || !customItemPrice}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Close Register</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {activeSession && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Opening Balance:</span><span>{formatPrice(activeSession.opening_balance)}</span></div>
                <div className="flex justify-between"><span>Total Sales:</span><span>{formatPrice(activeSession.total_sales)}</span></div>
                <div className="flex justify-between"><span>Cash Sales:</span><span>{formatPrice(activeSession.cash_sales)}</span></div>
                <div className="flex justify-between"><span>Transactions:</span><span>{activeSession.transaction_count}</span></div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Expected Cash:</span>
                  <span>{formatPrice(activeSession.opening_balance + activeSession.cash_sales)}</span>
                </div>
              </div>
            )}
            <div><Label>Actual Closing Balance (ZMW)</Label><Input type="number" value={closingBalanceInput} onChange={e => setClosingBalanceInput(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => { closeRegister.mutate(parseFloat(closingBalanceInput) || 0); setShowCloseDialog(false); }}>
              Close Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Sale Receipt</DialogTitle></DialogHeader>
          {lastSale && (
            <div className="space-y-3 text-sm font-mono">
              <div className="text-center">
                <p className="font-bold">Doc' O Clock Pharmacy</p>
                <p className="text-xs text-muted-foreground">{lastSale.receipt_number}</p>
                <p className="text-xs text-muted-foreground">{new Date(lastSale.created_at).toLocaleString()}</p>
              </div>
              <Separator />
              {lastSale.customer_name && <p>Customer: {lastSale.customer_name}</p>}
              <Separator />
              {lastSale.items?.map((item: CartItem, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{item.quantity}x {item.item_name}</span>
                  <span>{formatPrice(item.total)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatPrice(lastSale.subtotal)}</span></div>
              {lastSale.discount_amount > 0 && (
                <div className="flex justify-between"><span>Discount:</span><span>-{formatPrice(lastSale.discount_amount)}</span></div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>TOTAL:</span><span>{formatPrice(lastSale.total_amount)}</span>
              </div>
              <p className="text-xs capitalize">Paid by: {lastSale.payment_method?.replace('_', ' ')}</p>
              <Separator />
              <p className="text-xs text-center text-muted-foreground">Thank you for your purchase!</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button onClick={() => setShowReceipt(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

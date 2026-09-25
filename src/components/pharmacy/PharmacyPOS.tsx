import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, CreditCard, Banknote,
  Smartphone, Shield, Printer, X, Package
} from "lucide-react";

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
  const { institutionId: pharmacyId } = useInstitutionContext();
  const { formatPrice, getSymbol } = useCurrency();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("0");
  const [closingBalanceInput, setClosingBalanceInput] = useState("0");
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const { data: inventory } = useQuery({
    queryKey: ["pos-inventory", pharmacyId, searchQuery],
    queryFn: async () => {
      let query = supabase.from("medication_inventory").select("*").eq("institution_id", pharmacyId!).gt("quantity_available", 0).order("medication_name");
      if (searchQuery.length >= 2) query = query.or(`medication_name.ilike.%${searchQuery}%,generic_name.ilike.%${searchQuery}%`);
      const { data } = await query.limit(20);
      return (data || []) as InventoryItem[];
    },
    enabled: !!pharmacyId,
  });

  const { data: activeSession } = useQuery({
    queryKey: ["pos-session", pharmacyId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("pos_register_sessions").select("*").eq("pharmacy_id", pharmacyId!).eq("cashier_id", user!.id).eq("status", "open").maybeSingle();
      return data;
    },
    enabled: !!pharmacyId && !!user,
  });

  const addToCart = useCallback((item: InventoryItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.medication_inventory_id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity_available) { toast.error("Not enough stock"); return prev; }
        return prev.map((c) => c.medication_inventory_id === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price - c.discount } : c);
      }
      return [...prev, { medication_inventory_id: item.id, item_name: `${item.medication_name} ${item.dosage}`, quantity: 1, unit_price: item.unit_price || 0, discount: 0, total: item.unit_price || 0, batch_number: item.batch_number || undefined, stock_available: item.quantity_available }];
    });
  }, []);

  const addCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    const price = parseFloat(customItemPrice);
    setCart((prev) => [...prev, { medication_inventory_id: null, item_name: customItemName, quantity: 1, unit_price: price, discount: 0, total: price }]);
    setCustomItemName(""); setCustomItemPrice(""); setShowCustomItem(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      if (item.stock_available && newQty > item.stock_available) { toast.error("Not enough stock"); return item; }
      return { ...item, quantity: newQty, total: newQty * item.unit_price - item.discount };
    }));
  };

  const removeItem = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index));

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const totalAmount = subtotal - discountAmount;

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!pharmacyId || !user) throw new Error("Not authorized");
      if (cart.length === 0) throw new Error("Cart is empty");
      const { data: receiptData } = await (supabase as any).rpc("generate_receipt_number", { p_pharmacy_id: pharmacyId });
      const receiptNumber = receiptData || `RCP-${Date.now()}`;
      const { data: sale, error: saleError } = await (supabase as any).from("pos_sales").insert({ pharmacy_id: pharmacyId, cashier_id: user.id, customer_name: customerName || null, customer_phone: customerPhone || null, sale_type: "walk_in", subtotal, tax_amount: 0, discount_amount: discountAmount, total_amount: totalAmount, payment_method: paymentMethod, payment_reference: paymentRef || null, receipt_number: receiptNumber, status: "completed" }).select().single();
      if (saleError) throw saleError;
      const items = cart.map((item) => ({ sale_id: sale.id, medication_inventory_id: item.medication_inventory_id, item_name: item.item_name, quantity: item.quantity, unit_price: item.unit_price, discount: item.discount, total: item.total, batch_number: item.batch_number || null }));
      const { error: itemsError } = await (supabase as any).from("pos_sale_items").insert(items);
      if (itemsError) throw itemsError;
      if (customerPhone) await (supabase as any).from("pharmacy_customers").upsert({ pharmacy_id: pharmacyId, name: customerName || "Walk-in", phone: customerPhone, total_purchases: totalAmount, visit_count: 1, last_visit_at: new Date().toISOString() }, { onConflict: "pharmacy_id,phone", ignoreDuplicates: false }).select();
      return { ...sale, items: cart };
    },
    onSuccess: (data) => {
      setLastSale(data); setShowReceipt(true); setCart([]); setCustomerName(""); setCustomerPhone(""); setPaymentRef(""); setDiscountPercent(0);
      queryClient.invalidateQueries({ queryKey: ["pos-inventory"] }); queryClient.invalidateQueries({ queryKey: ["pos-session"] });
      toast.success("Sale completed!");
    },
    onError: (err: any) => toast.error(err.message || "Sale failed"),
  });

  const openRegister = useMutation({
    mutationFn: async (openingBalance: number) => {
      const { error } = await (supabase as any).from("pos_register_sessions").insert({ pharmacy_id: pharmacyId, cashier_id: user!.id, opening_balance: openingBalance });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pos-session"] }); toast.success("Register opened"); },
  });

  const closeRegister = useMutation({
    mutationFn: async (closingBalance: number) => {
      // NUMERIC columns arrive as strings from PostgREST — coerce, otherwise
      // "500" + "1200" would store a garbage "5001200" expected balance.
      const expected = Number(activeSession?.opening_balance || 0)
        + Number(activeSession?.cash_sales || 0)
        - Number(activeSession?.total_refunds || 0);
      const { error } = await (supabase as any).from("pos_register_sessions").update({ closing_balance: closingBalance, expected_balance: expected, status: "closed", closed_at: new Date().toISOString() }).eq("id", activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pos-session"] }); toast.success("Register closed"); },
  });

  if (!activeSession && pharmacyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-canvas-silk shadow-md text-center font-sans">
          <Package className="h-12 w-12 text-primary-500 mx-auto mb-3" />
          <h2 className="text-xl font-extrabold text-slate-900">Open Cash Register</h2>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium mt-1 mb-4">Start your cashier shift by entering the opening float</p>
          <div className="text-left mb-4">
            <label className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Opening Cash Balance ({getSymbol()})</label>
            <input type="number" value={openingBalanceInput} onChange={(e) => setOpeningBalanceInput(e.target.value)} className="w-full mt-1 p-2.5 rounded-md border border-graphite-300 dark:border-slate-700 text-sm font-bold" />
          </div>
          <button onClick={() => openRegister.mutate(parseFloat(openingBalanceInput) || 0)} className="w-full py-2.5 rounded-md bg-primary-500 text-white font-extrabold text-sm">
            Open Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)] font-sans">
      {/* ─── Left Panel: Product Search ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-canvas-silk overflow-hidden">
        {/* Search Bar + Actions */}
        <div className="flex items-center gap-2 p-3 border-b border-canvas-silk bg-canvas dark:bg-slate-950">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-graphite-500 dark:text-slate-400" />
            <input
              placeholder="Search medication by name or generic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-medium"
            />
          </div>
          <button onClick={() => setShowCustomItem(true)} className="px-3 py-2 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-extrabold flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Custom Item
          </button>
          <button onClick={() => setShowCloseDialog(true)} className="px-3 py-2 rounded-md bg-error-500 text-white text-xs font-extrabold">
            Close Register
          </button>
        </div>

        {/* Session Info Bar */}
        {activeSession && (
          <div className="flex items-center gap-4 px-4 py-2 bg-primary-50 border-b border-primary-200 text-xs font-extrabold text-primary-500">
            <span>Session Sales: {formatPrice(activeSession.total_sales || 0)}</span>
            <span className="text-primary-200">|</span>
            <span>Transactions: {activeSession.transaction_count || 0}</span>
            <span className="text-primary-200">|</span>
            <span>Cash: {formatPrice(activeSession.cash_sales || 0)}</span>
          </div>
        )}

        {/* Medication Product Grid */}
        <ScrollArea className="flex-1 p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {inventory?.map((item) => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-3 rounded-xl border border-canvas-silk cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <p className="font-extrabold text-xs text-slate-900 truncate">{item.medication_name}</p>
                <p className="text-[10px] text-graphite-500 dark:text-slate-400 font-medium">{item.dosage} · {item.medication_type}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-black text-primary-500">{formatPrice(item.unit_price || 0)}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${item.quantity_available <= 5 ? "bg-error-500" : "bg-success-500"}`}>
                    {item.quantity_available}
                  </span>
                </div>
              </div>
            ))}
            {(!inventory || inventory.length === 0) && (
              <div className="col-span-full text-center py-10 text-graphite-500 dark:text-slate-400 text-xs font-bold">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                {searchQuery ? "No results found" : "Type to search medications..."}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Right Panel: Cart & Checkout ─── */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-canvas-silk overflow-hidden">
        {/* Cart Header */}
        <div className="p-3 border-b border-canvas-silk bg-canvas flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary-500" />
          <span className="font-extrabold text-sm text-slate-900">Cart</span>
          {cart.length > 0 && <span className="ml-auto inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-primary-500">{cart.length}</span>}
        </div>

        {/* Customer Info */}
        <div className="p-3 border-b border-canvas-silk space-y-2">
          <div className="flex gap-2">
            <input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="flex-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-medium" />
            <input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-28 p-2 rounded-md border border-graphite-300 dark:border-slate-700 text-xs" />
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-canvas text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{item.item_name}</p>
                  <p className="text-graphite-500 dark:text-slate-400">{formatPrice(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button aria-label={`Decrease quantity of ${item.item_name}`} onClick={() => updateQuantity(index, -1)} className="h-6 w-6 rounded flex items-center justify-center bg-white dark:bg-slate-800 border border-canvas-silk dark:border-slate-700 hover:bg-canvas-mist dark:hover:bg-slate-700">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-7 text-center font-extrabold">{item.quantity}</span>
                  <button aria-label={`Increase quantity of ${item.item_name}`} onClick={() => updateQuantity(index, 1)} className="h-6 w-6 rounded flex items-center justify-center bg-white dark:bg-slate-800 border border-canvas-silk dark:border-slate-700 hover:bg-canvas-mist dark:hover:bg-slate-700">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-extrabold w-16 text-right text-primary-500">{formatPrice(item.total)}</span>
                <button aria-label={`Remove ${item.item_name} from cart`} onClick={() => removeItem(index)} className="h-6 w-6 rounded flex items-center justify-center text-error-500 hover:bg-error-50">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-8 text-graphite-500 dark:text-slate-400">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">Click items to add to cart</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Totals + Payment */}
        <div className="border-t border-canvas-silk p-3 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-medium"><span className="text-graphite-500 dark:text-slate-400">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {discountPercent > 0 && (
              <div className="flex justify-between font-medium text-success-500"><span>Discount ({discountPercent}%)</span><span>-{formatPrice(discountAmount)}</span></div>
            )}
            <div className="flex justify-between font-black text-base pt-1 border-t border-canvas-silk dark:border-slate-800">
              <span>Total</span><span className="text-primary-500">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {/* Discount Selector */}
          <div className="flex gap-1">
            {[0, 5, 10, 15].map((d) => (
              <button key={d} aria-pressed={discountPercent === d} aria-label={d === 0 ? "No discount" : `${d} percent discount`} onClick={() => setDiscountPercent(d)} className={`flex-1 py-1 rounded text-[10px] font-extrabold transition-all ${discountPercent === d ? "bg-primary-500 text-white" : "bg-canvas-mist dark:bg-slate-800 text-graphite-500 dark:text-slate-400 hover:bg-canvas-silk"}`}>
                {d === 0 ? "No Disc" : `${d}%`}
              </button>
            ))}
          </div>

          {/* Payment Method */}
          <div className="flex gap-1">
            {[
              { value: "cash", icon: <Banknote className="h-3.5 w-3.5" />, label: "Cash" },
              { value: "mobile_money", icon: <Smartphone className="h-3.5 w-3.5" />, label: "MoMo" },
              { value: "card", icon: <CreditCard className="h-3.5 w-3.5" />, label: "Card" },
              { value: "insurance", icon: <Shield className="h-3.5 w-3.5" />, label: "Insurance" },
            ].map((pm) => (
              <button key={pm.value} aria-pressed={paymentMethod === pm.value} aria-label={`Pay with ${pm.label}`} onClick={() => setPaymentMethod(pm.value)} className={`flex-1 py-1.5 rounded text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all ${paymentMethod === pm.value ? "bg-primary-500 text-white" : "bg-canvas-mist dark:bg-slate-800 text-graphite-500 dark:text-slate-400"}`}>
                {pm.icon}{pm.label}
              </button>
            ))}
          </div>

          {paymentMethod !== "cash" && (
            <input placeholder="Reference / Transaction ID" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="w-full p-2 rounded-md border border-graphite-300 dark:border-slate-700 text-xs" />
          )}

          <button
            onClick={() => saleMutation.mutate()}
            disabled={cart.length === 0 || saleMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Receipt className="h-4 w-4" />
            {saleMutation.isPending ? "Processing..." : `Complete Sale — ${formatPrice(totalAmount)}`}
          </button>
        </div>
      </div>

      {/* Custom Item Dialog */}
      <Dialog open={showCustomItem} onOpenChange={setShowCustomItem}>
        <DialogContent className="max-w-sm bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader><DialogTitle className="font-extrabold text-base">Add Custom Item</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Item Name</label>
              <input value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
            </div>
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Price ({getSymbol()})</label>
              <input type="number" value={customItemPrice} onChange={(e) => setCustomItemPrice(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCustomItem(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            <button onClick={addCustomItem} disabled={!customItemName || !customItemPrice} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold">Add to Cart</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-sm bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader><DialogTitle className="font-extrabold text-base">Close Register</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs py-2">
            {activeSession && (
              <div className="p-3 rounded-xl bg-canvas space-y-1">
                <div className="flex justify-between"><span className="text-graphite-500 dark:text-slate-400 font-bold">Opening Balance:</span><span className="font-extrabold">{formatPrice(activeSession.opening_balance)}</span></div>
                <div className="flex justify-between"><span className="text-graphite-500 dark:text-slate-400 font-bold">Total Sales:</span><span className="font-extrabold text-success-500">{formatPrice(activeSession.total_sales)}</span></div>
                <div className="flex justify-between"><span className="text-graphite-500 dark:text-slate-400 font-bold">Transactions:</span><span className="font-extrabold">{activeSession.transaction_count}</span></div>
                <div className="flex justify-between border-t border-canvas-silk pt-1"><span className="font-extrabold">Expected Cash:</span><span className="font-black text-primary-500">{formatPrice(Number(activeSession.opening_balance || 0) + Number(activeSession.cash_sales || 0))}</span></div>
              </div>
            )}
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Actual Closing Balance ({getSymbol()})</label>
              <input type="number" value={closingBalanceInput} onChange={(e) => setClosingBalanceInput(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCloseDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            <button onClick={() => { closeRegister.mutate(parseFloat(closingBalanceInput) || 0); setShowCloseDialog(false); }} className="px-4 py-1.5 rounded-md bg-error-500 text-white text-xs font-bold">Close Register</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-success-500" /> Sale Receipt
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-2 text-xs font-mono py-2">
              <div className="text-center pb-2 border-b border-dashed border-graphite-300 dark:border-slate-700">
                <p className="font-extrabold text-sm">Doc'O Clock Pharmacy</p>
                <p className="text-graphite-500 dark:text-slate-400">{lastSale.receipt_number}</p>
                <p className="text-graphite-500 dark:text-slate-400">{new Date(lastSale.created_at).toLocaleString()}</p>
              </div>
              {lastSale.customer_name && <p className="font-bold">Customer: {lastSale.customer_name}</p>}
              <div className="space-y-1 border-b border-dashed border-graphite-300 dark:border-slate-700 pb-2">
                {lastSale.items?.map((item: CartItem, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity}x {item.item_name}</span>
                    <span className="font-bold">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between"><span className="text-graphite-500 dark:text-slate-400">Subtotal:</span><span>{formatPrice(lastSale.subtotal)}</span></div>
              {lastSale.discount_amount > 0 && <div className="flex justify-between text-success-500"><span>Discount:</span><span>-{formatPrice(lastSale.discount_amount)}</span></div>}
              <div className="flex justify-between font-black text-sm border-t border-canvas-silk pt-1"><span>TOTAL:</span><span className="text-primary-500">{formatPrice(lastSale.total_amount)}</span></div>
              <p className="capitalize text-graphite-500 dark:text-slate-400">Paid by: {lastSale.payment_method?.replace("_", " ")}</p>
              <p className="text-center text-graphite-500 dark:text-slate-400 pt-1 border-t border-dashed border-graphite-300 dark:border-slate-700">Thank you for your purchase!</p>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-bold border border-graphite-300 dark:border-slate-700 rounded-md flex items-center gap-1">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button onClick={() => setShowReceipt(false)} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold">Done</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PharmacyPOS;

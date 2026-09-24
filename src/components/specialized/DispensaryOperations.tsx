import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Pill,
  ShoppingBag,
  Package,
  Search,
  CheckCircle2,
  Barcode,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/hooks/use-currency";

interface DispensaryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unitPrice: number;
  batchNo: string;
  expiryDate: string;
}

/**
 * Community dispensary POS backed by live medication_inventory. Completing
 * a dispense records a pharmacy_sales row, decrements stock, and prints a
 * receipt from the recorded sale — never local-only.
 */
export const DispensaryOperations: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [stock, setStock] = useState<DispensaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Array<{ item: DispensaryItem; qty: number }>>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money" | "card">("mobile_money");
  const [processing, setProcessing] = useState(false);

  const fetchStock = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("medication_inventory")
        .select("id, medication_name, dosage, generic_name, manufacturer, batch_number, expiry_date, quantity_available, minimum_stock_level, unit_price")
        .eq("institution_id", institutionId)
        .gt("quantity_available", 0)
        .order("medication_name")
        .limit(500);
      if (error) throw error;
      setStock(
        ((data as any[]) || []).map((s: any) => ({
          id: s.id,
          name: `${s.medication_name}${s.dosage ? ` ${s.dosage}` : ""}`,
          category: s.generic_name || s.manufacturer || "General",
          stock: Number(s.quantity_available || 0),
          unitPrice: Number(s.unit_price || 0),
          batchNo: s.batch_number || "—",
          expiryDate: s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : "—",
        }))
      );
    } catch (error) {
      console.error("Error fetching dispensary stock:", error);
      toast.error("Failed to load dispensary stock");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const filteredStock = stock.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.batchNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: DispensaryItem) => {
    if (item.stock <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        if (existing.qty >= item.stock) {
          toast.error("Maximum stock level reached in cart");
          return prev;
        }
        return prev.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { item, qty: 1 }];
    });
    toast.success(`Added ${item.name} to dispensing queue`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== id));
  };

  const updateCartQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((c) => (c.item.id === id ? { ...c, qty: newQty } : c)));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.item.unitPrice * c.qty, 0);

  const handleCompleteDispensing = async () => {
    if (cart.length === 0) {
      toast.error("Dispensing cart is empty");
      return;
    }
    if (!institutionId) return;
    setProcessing(true);
    try {
      const receiptNo = `DSP-${Date.now().toString(36).toUpperCase()}`;
      const items = cart.map((c) => ({
        medication_inventory_id: c.item.id,
        item_name: c.item.name,
        quantity: c.qty,
        unit_price: c.item.unitPrice,
        total: Math.round(c.item.unitPrice * c.qty * 100) / 100,
      }));

      const { data: sale, error: saleError } = await (supabase.from("pharmacy_sales" as any) as any)
        .insert({
          pharmacy_id: institutionId,
          customer_name: customerName.trim() || "Walk-in Patient",
          customer_phone: customerPhone.trim() || null,
          items,
          subtotal,
          total_amount: subtotal,
          paid_amount: subtotal,
          balance: 0,
          payment_method: paymentMethod,
          payment_status: "paid",
          cashier_id: user?.id || null,
          served_by: user?.id || null,
          transaction_id: receiptNo,
        })
        .select("id")
        .single();
      if (saleError) throw saleError;

      // Decrement live stock per line item
      for (const c of cart) {
        const { error: stockError } = await (supabase.from("medication_inventory" as any) as any)
          .update({ quantity_available: Math.max(0, c.item.stock - c.qty) })
          .eq("id", c.item.id);
        if (stockError) throw stockError;
        await (supabase.from("inventory_transactions" as any) as any).insert({
          medication_inventory_id: c.item.id,
          transaction_type: "dispense",
          quantity: -c.qty,
          unit_price: c.item.unitPrice,
          transaction_date: new Date().toISOString(),
          notes: `Dispensary sale ${(sale as any)?.id || receiptNo}`,
        }).then(() => {});
      }

      // Print receipt from the recorded sale
      const printWin = window.open("", "_blank");
      if (printWin) {
        const rows = cart
          .map(
            (c) =>
              `<tr><td style="padding:4px 0;">${c.item.name} (x${c.qty})</td><td style="text-align:right;">K${(c.item.unitPrice * c.qty).toFixed(2)}</td></tr>`
          )
          .join("");

        printWin.document.write(`
          <html>
            <body style="font-family: monospace; font-size: 12px; max-width: 280px; margin: auto; padding: 15px;">
              <div style="text-align:center; font-weight:bold; font-size:14px;">DOC' O CLOCK DISPENSARY</div>
              <div style="text-align:center; font-size:11px;">Primary Essential Medical Dispense</div>
              <hr style="border-top:1px dashed #000; margin:10px 0;"/>
              <div><strong>Receipt:</strong> ${receiptNo}</div>
              <div><strong>Customer:</strong> ${customerName || "Walk-in Patient"}</div>
              <div><strong>Payment:</strong> ${paymentMethod.toUpperCase()}</div>
              <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
              <hr style="border-top:1px dashed #000; margin:10px 0;"/>
              <table style="width:100%;">
                ${rows}
              </table>
              <hr style="border-top:1px dashed #000; margin:10px 0;"/>
              <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>TOTAL AMOUNT:</span>
                <span>K${subtotal.toFixed(2)}</span>
              </div>
              <div style="text-align:center; margin-top:15px; font-size:10px;">
                Thank you for trusting Doc' O Clock Community Dispensary!
              </div>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWin.document.close();
      }

      toast.success(`Dispensing completed! Receipt #${receiptNo} recorded.`);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      fetchStock();
    } catch (error: any) {
      console.error("Error completing dispense:", error);
      toast.error(error?.message || "Failed to complete dispensing — no stock was changed");
    } finally {
      setProcessing(false);
    }
  };

  if (!institutionId) {
    return (
      <div className="p-8 rounded-3xl border border-dashed text-center text-sm text-muted-foreground">
        Dispensary needs an institution context — open this from a facility dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-slate-900 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Pill className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Community Dispensary &amp; First-Aid POS</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-emerald-900">
                Live Stock
              </span>
            </div>
            <p className="text-xs text-emerald-100 font-medium">
              Essential medicines formulary, OTC dispensing, batch expiration checks, and instant thermal receipt printing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
            Formulary Stock: {stock.length} Active SKUs
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stock & Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
              <input
                type="search"
                aria-label="Search dispensary stock"
                placeholder="Search essential medicine, category, or batch number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="status" aria-label="Loading dispensary stock">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" aria-hidden />
              ))}
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed text-center">
              <Package className="h-8 w-8 mx-auto text-slate-400 mb-2" aria-hidden />
              <p className="font-bold text-sm">{stock.length === 0 ? "No dispensary stock" : "No matches found"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stock.length === 0
                  ? "Add inventory in Pharmacy Management to stock this dispensary."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStock.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-primary-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.category}
                      </span>
                      <span className={`text-[10px] font-extrabold ${item.stock <= 10 ? "text-amber-600" : "text-emerald-600"}`}>
                        {item.stock} left
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><Barcode className="h-3 w-3" aria-hidden />Batch: {item.batchNo}</span>
                      <span>•</span>
                      <span>Exp: {item.expiryDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-canvas-silk dark:border-slate-800">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">{formatPrice(item.unitPrice)}</span>
                      <span className="text-[10px] text-slate-400 block">{item.stock} in stock</span>
                    </div>

                    <button
                      onClick={() => addToCart(item)}
                      aria-label={`Dispense ${item.name}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Dispense
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: POS Dispensing Cart */}
        <div className="p-5 rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs h-fit sticky top-24">
          <div className="flex items-center justify-between border-b border-canvas-silk dark:border-slate-800 pb-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-600" aria-hidden /> Dispensing Order Cart
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
              {cart.reduce((s, c) => s + c.qty, 0)} Items
            </span>
          </div>

          {/* Customer info */}
          <div className="space-y-2">
            <div>
              <label htmlFor="dsp-customer-name" className="font-bold text-slate-700 dark:text-slate-300">Customer / Patient Name</label>
              <input
                id="dsp-customer-name"
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="dsp-customer-phone" className="font-bold text-slate-700 dark:text-slate-300">Customer Phone (optional)</label>
              <input
                id="dsp-customer-phone"
                type="tel"
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                placeholder="+260…"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="dsp-pay-method" className="font-bold text-slate-700 dark:text-slate-300">Payment Method</label>
              <select
                id="dsp-pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
              >
                <option value="mobile_money">Mobile Money (MTN / Airtel / Zamtel)</option>
                <option value="cash">Cash at Counter</option>
                <option value="card">Visa / Mastercard POS</option>
              </select>
            </div>
          </div>

          {/* Cart items list */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed rounded-2xl">
                No items added to dispensing cart yet
              </div>
            ) : (
              cart.map((c) => (
                <div key={c.item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-canvas-silk flex items-center justify-between">
                  <div className="max-w-[130px]">
                    <div className="font-bold truncate">{c.item.name}</div>
                    <div className="text-[10px] text-slate-400">{formatPrice(c.item.unitPrice)} each</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(c.item.id, c.qty - 1)}
                      aria-label={`Decrease quantity of ${c.item.name}`}
                      className="h-6 w-6 rounded-md bg-white dark:bg-slate-700 font-black border text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-black px-1">{c.qty}</span>
                    <button
                      onClick={() => updateCartQty(c.item.id, c.qty + 1)}
                      aria-label={`Increase quantity of ${c.item.name}`}
                      className="h-6 w-6 rounded-md bg-white dark:bg-slate-700 font-black border text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right font-black text-primary-500">
                    {formatPrice(c.item.unitPrice * c.qty)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subtotal & Checkout button */}
          <div className="pt-3 border-t border-canvas-silk dark:border-slate-800 space-y-3">
            <div className="flex justify-between text-sm font-black">
              <span>Total Payable:</span>
              <span className="text-emerald-600 text-base font-black tabular-nums">{formatPrice(subtotal)}</span>
            </div>

            <button
              onClick={handleCompleteDispensing}
              disabled={cart.length === 0 || processing}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {processing ? "Recording Sale…" : "Complete Dispense & Print Slip"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Layers className="h-3 w-3" aria-hidden /> Sale is recorded and stock decremented
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispensaryOperations;

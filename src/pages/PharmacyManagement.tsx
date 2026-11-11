import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle,
  Plus, Search, DollarSign, Users, CheckCircle,
  CreditCard, Smartphone, ShieldCheck, RefreshCw,
  Trash2, ShieldAlert, Sparkles, Loader2
} from "lucide-react";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";
import { InventoryControlTabs } from "@/components/pharmacy/InventoryControlTabs";
import { buildPharmacySaleItemsPayload, PHARMACY_SALE_TAX_RATE } from "@/lib/pharmacySale";
import { friendlyErrorMessage } from "@/utils/friendly-error";

// Cart-preview only: the charged tax is computed server-side by
// create_pharmacy_sale at the same 16% rate (a server constant there).
const TAX_RATE = PHARMACY_SALE_TAX_RATE;

export const PharmacyManagement = () => {
  const { institution: pharmacy, institutionId: pharmacyId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_money" | "insurance">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  const [mainTab, setMainTab] = useState("pos");

  const { data: inventory = [], refetch: refetchInventory } = useQuery({
    queryKey: ["pharmacy-inventory", pharmacy?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacy_inventory" as any)
        .select("*")
        .eq("pharmacy_id", pharmacy?.id)
        .order("product_name")
        .limit(500);
      return (data as any[]) || [];
    },
    enabled: !!pharmacy,
  });

  const { data: todaySales = [] } = useQuery({
    queryKey: ["pharmacy-sales-today", pharmacy?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("pharmacy_sales" as any)
        .select("*")
        .eq("pharmacy_id", pharmacy?.id)
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data as any[]) || [];
    },
    enabled: !!pharmacy,
  });

  // Till guard (pharmacy universe): a sale can be recorded against
  // the pharmacy_prescriptions record it fulfils; the RPC refuses a
  // second completed sale for the same prescription at this pharmacy.
  const { data: pendingPharmacyPrescriptions } = useQuery({
    queryKey: ["pharmacy-prescriptions-pending", pharmacy?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("pharmacy_prescriptions")
        .select("id, prescription_number, medications")
        .eq("pharmacy_id", pharmacy!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
    enabled: !!pharmacy,
  });

  const lowStockItems = inventory.filter((item) => (item.quantity ?? 0) <= (item.reorder_level ?? 10));
  const totalRetailValue = inventory.reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        if (existing.cartQuantity >= item.quantity) {
          toast.error(`Cannot add more. Only ${item.quantity} in stock.`);
          return prev;
        }
        return prev.map((i) => (i.id === item.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i));
      }
      return [...prev, { ...item, cartQuantity: 1 }];
    });
    toast.success(`Added ${item.product_name} to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unit_price * item.cartQuantity, 0);
  const cartTax = cartSubtotal * TAX_RATE;
  const cartTotal = cartSubtotal + cartTax;

  const completeSale = async () => {
    if (cart.length === 0 || !pharmacy) return;
    setIsProcessing(true);
    try {
      // Server-priced sale: create_pharmacy_sale prices every line from
      // this pharmacy's pharmacy_inventory catalogue, computes subtotal,
      // the 16% tax and the total server-side, writes the pharmacy_sales
      // row born 'completed' and FEFO-dispenses against the batch ledger
      // — all in one transaction. The client sends item ids + quantities
      // only; the cart figures above are a preview, never the charge, and
      // there is no client rollback: a failure aborts the RPC's
      // transaction before anything is written.
      const { data, error: saleError } = await (supabase as any).rpc("create_pharmacy_sale", {
        p_pharmacy_id: pharmacy.id,
        p_items: buildPharmacySaleItemsPayload(
          cart.map((item) => ({ pharmacy_inventory_id: item.id, quantity: item.cartQuantity }))
        ),
        p_payment_method: paymentMethod,
        p_customer_id: selectedPatientId || null,
        p_prescription_id: selectedPrescriptionId || null,
      });

      if (saleError) throw saleError;

      const sale = (data as any)?.sale;
      toast.success(
        `Sale completed! Receipt ${sale?.transaction_id} — ${formatPrice(Number(sale?.total_amount || 0))}`
      );
      setCart([]);
      setSelectedPatientId("");
      setSelectedPrescriptionId("");
      refetchInventory();
      queryClient.invalidateQueries({ queryKey: ["pharmacy-sales-today", pharmacy?.id] });
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Failed to complete sale"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!pharmacy) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border text-center space-y-3">
          <Package className="h-12 w-12 mx-auto text-primary-500" />
          <h3 className="text-lg font-semibold">Pharmacy POS Board</h3>
          <p className="text-xs text-muted-foreground">
            Link your pharmacy account to activate the Doc' O Clock inventory & POS system.
          </p>
        </div>
      </div>
    );
  }

  const categories = ["All", ...Array.from(new Set(inventory.map((i) => i.category || "General").filter(Boolean)))];

  return (
    <div className="pb-16">
      {/* Identity header — STATIC, in flow. This tall card (title +
          subtitle + action) must never stick: as a sticky bar it docked
          over the stat row and hid its top half no matter how the page
          was scrolled (CEO phone screenshot 2026-11-11). Same treatment
          as InstitutionDashboard's inner header ([position:static]). */}
      <div className="doc-page-header [position:static] px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-semibold text-sm">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                {pharmacy.name} — Pharmacy Management & POS
                <span className="w-2 h-2 rounded-full bg-success-500" />
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Inventory Tracking • Prescription Dispatches • Automated Sales Accounting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchInventory()}
              className="px-3.5 py-1.5 rounded-full bg-pill text-pill-foreground hover:bg-pill/80 font-semibold text-xs flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Inventory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial summary — PayPal anatomy (rollout pattern, cf.
          InstitutionDashboard KPIs): on mobile ONE hairline list (label +
          muted subline left, bold ink value right); at sm+ a hairline
          card grid. Numerals are ink — green ONLY on revenue (money-in).
          The old rainbow numerals (blue/amber/purple) + uppercase labels
          + mono figures were the pre-rollout dialect the CEO flagged
          2026-11-11. Both renderings show the same figures. */}
      <div className="px-4 sm:px-6 pt-6">
        <div className="sm:hidden rounded-2xl border border-border bg-card px-4 divide-y divide-border">
          {[
            { label: "Stock retail value", sub: `${inventory.length} total items`, value: formatPrice(totalRetailValue), moneyIn: false },
            { label: "Today's sales revenue", sub: `${todaySales.length} transactions`, value: formatPrice(todaySales.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)), moneyIn: true },
            { label: "Low stock warnings", sub: "Reorder required", value: lowStockItems.length.toString(), moneyIn: false },
            { label: "Active cart items", sub: `Subtotal: ${formatPrice(cartSubtotal)}`, value: cart.length.toString(), moneyIn: false },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-3.5 min-h-16">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                <p className="text-[13px] text-muted-foreground">{row.sub}</p>
              </div>
              <span className={`text-lg font-extrabold tabular-nums ${row.moneyIn ? "text-success-600" : "text-foreground"}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="text-[13px] font-medium text-muted-foreground">Stock retail value</div>
            <div className="text-statnum text-foreground tabular-nums mt-1">{formatPrice(totalRetailValue)}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">{inventory.length} total items</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="text-[13px] font-medium text-muted-foreground">Today's sales revenue</div>
            <div className="text-statnum text-success-600 tabular-nums mt-1">
              {formatPrice(todaySales.reduce((s, i) => s + (Number(i.total_amount) || 0), 0))}
            </div>
            <div className="text-[13px] text-muted-foreground mt-0.5">{todaySales.length} transactions</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="text-[13px] font-medium text-muted-foreground">Low stock warnings</div>
            <div className="text-statnum text-foreground tabular-nums mt-1">{lowStockItems.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Reorder required</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="text-[13px] font-medium text-muted-foreground">Active cart items</div>
            <div className="text-statnum text-foreground tabular-nums mt-1">{cart.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">Subtotal: {formatPrice(cartSubtotal)}</div>
          </div>
        </div>
      </div>

      {/* Main Board Tabs: POS vs Inventory Control */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="px-4 sm:px-6 pt-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pos" className="flex-1 sm:flex-none">POS Board</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 sm:flex-none">Inventory Control</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pos">
      {/* Main Board Content */}
      <div className="px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inventory Product Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-500" />
              Pharmacy Inventory Catalog
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search medication name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {inventory
              .filter((i) => (i.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()))
              .map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.quantity > 0 && addToCart(item)}
                  className="p-3.5 rounded-xl border border-border bg-background hover:bg-muted/80 transition-colors cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary-500 transition-colors">
                      {item.product_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Code: {item.product_code || "—"} • Stock: <strong className="text-foreground">{item.quantity}</strong>
                    </div>
                    <div className="font-semibold text-sm text-foreground tabular-nums mt-1">
                      {formatPrice(item.unit_price)}
                    </div>
                  </div>

                  <button
                    aria-label={`Add ${item.product_name || "item"} to dispense list`}
                    disabled={item.quantity <= 0}
                    className="p-2 rounded-full bg-gold text-gold-ink hover:bg-gold-deep disabled:opacity-30 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Right: Cart & POS Checkout */}
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary-500" />
                Active Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs font-semibold text-error-500 hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">Cart is empty. Click inventory items to add.</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg border border-border bg-canvas text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">{formatPrice(item.unit_price)} × {item.cartQuantity}</div>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold">
                      <button onClick={() => removeFromCart(item.id)} className="text-error-500 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Footer */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(cartSubtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax (est., final per item at checkout)</span><span>{formatPrice(cartTax)}</span></div>
              <div className="flex justify-between text-base font-semibold text-foreground pt-1 border-t">
                <span>Total Due</span><span className="text-foreground tabular-nums">{formatPrice(cartTotal)}</span>
              </div>
              <p className="text-muted-foreground dark:text-slate-500 pt-1">Preview from catalogue prices — final figures are confirmed by the server on the receipt.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pm-prescription" className="text-xs font-semibold">Prescription (optional)</Label>
              <select
                id="pm-prescription"
                value={selectedPrescriptionId}
                onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                className="w-full p-2 rounded-md border border-border text-xs font-medium bg-card"
              >
                <option value="">Walk-in sale — no prescription</option>
                {(pendingPharmacyPrescriptions || []).map((rx: any) => (
                  <option key={rx.id} value={rx.id}>
                    {rx.prescription_number || "Rx"} — {Array.isArray(rx.medications) ? rx.medications.map((m: any) => m?.name).filter(Boolean).join(", ") : "prescription"}
                  </option>
                ))}
              </select>
              {selectedPrescriptionId && (
                <p className="text-[11px] text-muted-foreground">
                  This payment is recorded against the prescription, so it cannot be charged for twice.
                </p>
              )}
            </div>

            <button
              onClick={completeSale}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-3 rounded-full bg-gold text-gold-ink hover:bg-gold-deep font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Complete Sale ({formatPrice(cartTotal)})</span>
            </button>
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="px-4 sm:px-6 pt-6">
            <InventoryControlTabs />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PharmacyManagement;

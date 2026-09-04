import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle,
  Plus, Search, DollarSign, Users, CheckCircle,
  CreditCard, Smartphone, ShieldCheck, RefreshCw,
  Trash2, ShieldAlert, Sparkles, Loader2
} from "lucide-react";
import { InstitutionInsuranceVerification } from "@/components/institution/InstitutionInsuranceVerification";

const TAX_RATE = 0.16;

export const PharmacyManagement = () => {
  const { user } = useAuth();
  const { institution: pharmacy, institutionId: pharmacyId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_money" | "insurance">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
  const [writeOffForm, setWriteOffForm] = useState({
    item_id: "",
    quantity: 1,
    reason: "expired",
    notes: "",
  });

  const { data: inventory = [], refetch: refetchInventory } = useQuery({
    queryKey: ["pharmacy-inventory", pharmacy?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacy_inventory" as any)
        .select("*")
        .eq("pharmacy_id", pharmacy?.id)
        .order("product_name");
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
        .order("created_at", { ascending: false });
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
      const transactionId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const total = cartTotal;

      const { error: saleError } = await supabase.from("pharmacy_sales" as any).insert({
        pharmacy_id: pharmacy.id,
        transaction_id: transactionId,
        customer_id: selectedPatientId || null,
        items: cart,
        subtotal: cartSubtotal,
        tax: cartTax,
        total_amount: total,
        payment_method: paymentMethod,
        payment_status: "completed",
        created_at: new Date().toISOString(),
      });

      if (saleError) throw saleError;

      for (const item of cart) {
        const newQty = Math.max(0, item.quantity - item.cartQuantity);
        await supabase.from("pharmacy_inventory" as any).update({ quantity: newQty }).eq("id", item.id);
      }

      toast.success(`Sale completed! Receipt ${transactionId}`);
      setCart([]);
      setSelectedPatientId("");
      refetchInventory();
    } catch (error: any) {
      toast.error(error?.message || "Failed to complete sale");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-center space-y-3">
          <Package className="h-12 w-12 mx-auto text-[#0073ea]" />
          <h3 className="text-lg font-extrabold">Pharmacy POS Board</h3>
          <p className="text-xs text-[#676879] dark:text-slate-400">
            Link your pharmacy account to activate the Doc' O Clock inventory & POS system.
          </p>
        </div>
      </div>
    );
  }

  const categories = ["All", ...Array.from(new Set(inventory.map((i) => i.category || "General").filter(Boolean)))];

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                {pharmacy.name} — Pharmacy WorkOS & POS
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Inventory Tracking • Prescription Dispatches • Automated Sales Accounting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchInventory()}
              className="px-3 py-1.5 rounded-md bg-[#f0f2f7] dark:bg-slate-800 hover:bg-[#e5f0ff] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Inventory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Banners */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800">
          <div className="text-xs font-bold text-[#676879] uppercase">Stock Retail Value</div>
          <div className="text-2xl font-black font-mono text-[#0073ea] mt-1">{formatPrice(totalRetailValue)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{inventory.length} total items</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800">
          <div className="text-xs font-bold text-[#676879] uppercase">Today's Sales Revenue</div>
          <div className="text-2xl font-black font-mono text-[#00c875] mt-1">
            {formatPrice(todaySales.reduce((s, i) => s + (Number(i.total_amount) || 0), 0))}
          </div>
          <div className="text-[10px] text-emerald-500 font-bold mt-0.5">{todaySales.length} transactions</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800">
          <div className="text-xs font-bold text-[#676879] uppercase">Low Stock Warnings</div>
          <div className="text-2xl font-black font-mono text-[#fdab3d] mt-1">{lowStockItems.length}</div>
          <div className="text-[10px] text-amber-500 font-bold mt-0.5">Reorder required</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800">
          <div className="text-xs font-bold text-[#676879] uppercase">Active Cart Items</div>
          <div className="text-2xl font-black font-mono text-purple-600 mt-1">{cart.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Subtotal: {formatPrice(cartSubtotal)}</div>
        </div>
      </div>

      {/* Main Board Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inventory Product Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#e6e9ef] dark:border-slate-800">
            <h2 className="font-extrabold text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-[#0073ea]" />
              Pharmacy Inventory Catalog
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search medication name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#c3c6d4] dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
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
                  className="p-3.5 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:bg-[#e5f0ff] dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#0073ea] transition-colors">
                      {item.product_name}
                    </div>
                    <div className="text-xs text-[#676879] dark:text-slate-400">
                      Code: {item.product_code || "—"} • Stock: <strong className="text-slate-900 dark:text-slate-100">{item.quantity}</strong>
                    </div>
                    <div className="font-mono font-extrabold text-sm text-[#0073ea] mt-1">
                      {formatPrice(item.unit_price)}
                    </div>
                  </div>

                  <button
                    disabled={item.quantity <= 0}
                    className="p-2 rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c4] disabled:opacity-30 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Right: Cart & POS Checkout */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e9ef] dark:border-slate-800">
              <h2 className="font-extrabold text-base flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#0073ea]" />
                Active Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs font-bold text-[#e2445c] hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#676879]">Cart is empty. Click inventory items to add.</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg border border-[#e6e9ef] bg-[#f5f6f8] text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-[#676879]">{formatPrice(item.unit_price)} × {item.cartQuantity}</div>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold">
                      <button onClick={() => removeFromCart(item.id)} className="text-[#e2445c] p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Footer */}
          <div className="pt-3 border-t border-[#e6e9ef] space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#676879]"><span>Subtotal</span><span>{formatPrice(cartSubtotal)}</span></div>
              <div className="flex justify-between text-[#676879]"><span>Tax (16%)</span><span>{formatPrice(cartTax)}</span></div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t">
                <span>Total Due</span><span className="text-[#0073ea] font-mono">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <button
              onClick={completeSale}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-3 rounded-md bg-[#00c875] hover:bg-[#00b368] text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Complete Sale ({formatPrice(cartTotal)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyManagement;

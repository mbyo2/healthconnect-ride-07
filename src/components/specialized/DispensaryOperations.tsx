import React, { useState } from "react";
import { toast } from "sonner";
import {
  Pill,
  ShoppingBag,
  Package,
  AlertTriangle,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  Barcode,
  Layers,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface DispensaryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unitPrice: number;
  batchNo: string;
  expiryDate: string;
  requiresRx: boolean;
}

const DEFAULT_DISPENSARY_STOCK: DispensaryItem[] = [
  { id: "dsp-1", name: "Oral Rehydration Salts (ORS)", category: "Essential Hydration", stock: 120, unitPrice: 5.0, batchNo: "ORS-2026-04", expiryDate: "2027-12-31", requiresRx: false },
  { id: "dsp-2", name: "Paracetamol 500mg Tablets", category: "Analgesic / Antipyretic", stock: 240, unitPrice: 2.5, batchNo: "PCM-2026-08", expiryDate: "2028-06-30", requiresRx: false },
  { id: "dsp-3", name: "Amoxicillin 500mg Caps", category: "Antibiotic", stock: 85, unitPrice: 15.0, batchNo: "AMX-2026-02", expiryDate: "2027-04-15", requiresRx: true },
  { id: "dsp-4", name: "Zinc Sulfate 20mg Dispersible", category: "Pediatric Essential", stock: 95, unitPrice: 4.0, batchNo: "ZNC-2026-09", expiryDate: "2027-10-31", requiresRx: false },
  { id: "dsp-5", name: "Povidone Iodine 10% Solution (100ml)", category: "Antiseptic", stock: 35, unitPrice: 25.0, batchNo: "PVD-2026-01", expiryDate: "2028-01-20", requiresRx: false },
  { id: "dsp-6", name: "Sterile Gauze Bandages (Pack of 10)", category: "First Aid Supplies", stock: 50, unitPrice: 12.0, batchNo: "GAU-2026-05", expiryDate: "2029-12-31", requiresRx: false },
  { id: "dsp-7", name: "Artemether-Lumefantrine (Coartem)", category: "Antimalarial", stock: 60, unitPrice: 30.0, batchNo: "AL-2026-11", expiryDate: "2027-08-30", requiresRx: true },
];

export const DispensaryOperations: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [stock, setStock] = useState<DispensaryItem[]>(DEFAULT_DISPENSARY_STOCK);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Array<{ item: DispensaryItem; qty: number }>>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money" | "card">("mobile_money");

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

  const handleCompleteDispensing = () => {
    if (cart.length === 0) {
      toast.error("Dispensing cart is empty");
      return;
    }
    // Deduct stock
    setStock((prev) =>
      prev.map((s) => {
        const inCart = cart.find((c) => c.item.id === s.id);
        if (inCart) {
          return { ...s, stock: Math.max(0, s.stock - inCart.qty) };
        }
        return s;
      })
    );

    const receiptNo = `DSP-${Date.now().toString(36).toUpperCase()}`;

    // Print Receipt simulation
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

    toast.success(`Dispensing completed! Receipt #${receiptNo} generated.`);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-[#0f172a] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Pill className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Community Dispensary &amp; First-Aid POS</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-emerald-900">
                Fast-Track Dispense
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search essential medicine, category, or batch number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:border-[#0073ea]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredStock.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-[#0073ea] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {item.category}
                    </span>
                    {item.requiresRx ? (
                      <span className="text-[10px] font-extrabold text-amber-600">Rx Required</span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-emerald-600">OTC</span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span>Batch: {item.batchNo}</span>
                    <span>•</span>
                    <span>Exp: {item.expiryDate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e6e9ef] dark:border-slate-800">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">K{item.unitPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block">{item.stock} in stock</span>
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" /> Dispense
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: POS Dispensing Cart */}
        <div className="p-5 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs h-fit sticky top-24">
          <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-600" /> Dispensing Order Cart
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
              {cart.reduce((s, c) => s + c.qty, 0)} Items
            </span>
          </div>

          {/* Customer info */}
          <div className="space-y-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Customer / Patient Name</label>
              <input
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[#c3c6d4] font-medium"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
              >
                <option value="mobile_money">📱 Mobile Money (MTN / Airtel / Zamtel)</option>
                <option value="cash">💵 Cash at Counter</option>
                <option value="card">💳 Visa / Mastercard POS</option>
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
                <div key={c.item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#e6e9ef] flex items-center justify-between">
                  <div className="max-w-[130px]">
                    <div className="font-bold truncate">{c.item.name}</div>
                    <div className="text-[10px] text-slate-400">K{c.item.unitPrice.toFixed(2)} each</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(c.item.id, c.qty - 1)}
                      className="h-6 w-6 rounded-md bg-white dark:bg-slate-700 font-black border text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-black px-1">{c.qty}</span>
                    <button
                      onClick={() => updateCartQty(c.item.id, c.qty + 1)}
                      className="h-6 w-6 rounded-md bg-white dark:bg-slate-700 font-black border text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right font-black text-[#0073ea]">
                    K{(c.item.unitPrice * c.qty).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subtotal & Checkout button */}
          <div className="pt-3 border-t border-[#e6e9ef] dark:border-slate-800 space-y-3">
            <div className="flex justify-between text-sm font-black">
              <span>Total Payable:</span>
              <span className="text-emerald-600 text-base font-black">K{subtotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCompleteDispensing}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" /> Complete Dispense &amp; Print Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispensaryOperations;

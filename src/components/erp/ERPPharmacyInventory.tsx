import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Package,
  Boxes,
  Truck,
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Layers,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";

interface StockRow {
  id: string;
  itemName: string;
  itemCode: string;
  category: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  costPrice: number;
  warehouse: string;
}

interface PurchaseOrderRow {
  id: string;
  poNumber: string;
  supplier: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  expectedDelivery: string;
}

interface MovementRow {
  id: string;
  item: string;
  quantity: number;
  transaction_type: string;
  date: string;
  reference?: string | null;
}

const SUPPLIERS = [
  "PharmaMed Zambia Ltd",
  "Universal Diagnostics Supply",
  "Crown Healthcare Equipments",
  "Mediland Africa Wholesalers",
];

/**
 * ERP stock & buying backed by live inventory data — medication batches
 * from medication_inventory, purchase orders from purchase_orders, and the
 * movement log from inventory_transactions. Empty states when empty; new
 * purchase orders insert for real.
 */
export const ERPPharmacyInventory: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<"stock" | "po" | "transfers" | "reorder">("stock");
  const [batches, setBatches] = useState<StockRow[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New PO Modal state
  const [showPOModal, setShowPOModal] = useState(false);
  const [newPOSupplier, setNewPOSupplier] = useState(SUPPLIERS[0]);
  const [newPOAmount, setNewPOAmount] = useState(15000);
  const [newPOExpected, setNewPOExpected] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
  const [creatingPO, setCreatingPO] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [stockRes, poRes] = await Promise.all([
        supabase
          .from("medication_inventory")
          .select("id, medication_name, dosage, batch_number, expiry_date, quantity_available, minimum_stock_level, unit_price, cost_price, supplier_name, manufacturer")
          .eq("institution_id", institutionId)
          .order("medication_name")
          .limit(1000),
        supabase
          .from("purchase_orders")
          .select("id, order_number, total_amount, status, expected_delivery_date, order_date, notes")
          .eq("institution_id", institutionId)
          .order("order_date", { ascending: false })
          .limit(200),
      ]);
      if (stockRes.error) throw stockRes.error;
      if (poRes.error) throw poRes.error;

      const stock = ((stockRes.data as any[]) || []).map((s: any, i: number) => ({
        id: s.id,
        itemName: `${s.medication_name}${s.dosage ? ` ${s.dosage}` : ""}`,
        itemCode: `MED-${String(i + 1).padStart(3, "0")}`,
        category: s.manufacturer || "General",
        batchNo: s.batch_number || "—",
        expiryDate: s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : "—",
        quantity: Number(s.quantity_available || 0),
        reorderLevel: Number(s.minimum_stock_level || 0),
        unitPrice: Number(s.unit_price || 0),
        costPrice: Number(s.cost_price || 0),
        warehouse: s.supplier_name || "Main Store",
      }));
      setBatches(stock);

      setPurchaseOrders(
        ((poRes.data as any[]) || []).map((p: any) => ({
          id: p.id,
          poNumber: p.order_number || p.id.slice(0, 8),
          supplier: p.notes || "Supplier",
          orderDate: p.order_date ? new Date(p.order_date).toLocaleDateString() : "—",
          totalAmount: Number(p.total_amount || 0),
          status: p.status || "draft",
          expectedDelivery: p.expected_delivery_date
            ? new Date(p.expected_delivery_date).toLocaleDateString()
            : "—",
        }))
      );

      // Movement log from real inventory transactions on this stock
      const itemIds = stock.map((s) => s.id);
      if (itemIds.length > 0) {
        const { data: txns } = await supabase
          .from("inventory_transactions")
          .select("id, medication_inventory_id, transaction_type, quantity, unit_price, transaction_date, invoice_number")
          .in("medication_inventory_id", itemIds.slice(0, 200))
          .order("transaction_date", { ascending: false })
          .limit(200);
        const nameById = new Map(stock.map((s) => [s.id, s.itemName]));
        setMovements(
          ((txns as any[]) || []).map((t: any) => ({
            id: t.id,
            item: nameById.get(t.medication_inventory_id) || "Item",
            quantity: Number(t.quantity || 0),
            transaction_type: t.transaction_type || "movement",
            date: t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : "—",
            reference: t.invoice_number,
          }))
        );
      } else {
        setMovements([]);
      }
    } catch (error) {
      console.error("Error loading pharmacy inventory:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filtered Stock
  const filteredBatches = batches.filter((b) =>
    b.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.warehouse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Items needing reorder
  const lowStockItems = batches.filter((b) => b.quantity <= b.reorderLevel);

  const handleCreatePO = async () => {
    if (!institutionId || !(newPOAmount > 0)) {
      toast.error("Enter a valid order total");
      return;
    }
    setCreatingPO(true);
    try {
      const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error } = await (supabase.from("purchase_orders" as any) as any).insert({
        institution_id: institutionId,
        order_number: poNumber,
        total_amount: newPOAmount,
        status: "submitted",
        expected_delivery_date: newPOExpected || null,
        notes: newPOSupplier,
      });
      if (error) throw error;
      toast.success(`Purchase Order ${poNumber} submitted for approval`);
      setShowPOModal(false);
      fetchAll();
    } catch (error: any) {
      console.error("Error creating PO:", error);
      toast.error(error?.message || "Failed to create purchase order");
    } finally {
      setCreatingPO(false);
    }
  };

  const handleExportValuation = () => {
    if (batches.length === 0) {
      toast.info("Nothing to export — no stock on record");
      return;
    }
    const header = "Item,Batch,Expiry,Quantity,Unit Price,Cost Price,Value\n";
    const lines = batches.map((b) =>
      [`"${b.itemName}"`, b.batchNo, b.expiryDate, b.quantity, b.unitPrice, b.costPrice, (b.quantity * (b.costPrice || b.unitPrice)).toFixed(2)].join(",")
    );
    const blob = new Blob([header + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-valuation-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Stock valuation exported (${batches.length} lines)`);
  };

  if (!institutionId) {
    return (
      <div className="p-8 rounded-3xl border border-dashed text-center text-sm text-muted-foreground">
        Inventory needs an institution context — open this from a facility dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">ERP Stock &amp; Buying Procurement Hub</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                Live Stock
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Medicine batch management, expiration monitoring, reordering, movements &amp; purchase workflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lowStockItems.length > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs animate-pulse">
              <AlertTriangle className="h-4 w-4" /> {lowStockItems.length} Low Stock Alerts
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto" role="tablist" aria-label="Inventory views">
        {[
          { id: "stock", label: "Medicine Batches & Stock Ledger", icon: Package },
          { id: "po", label: "Purchase Orders & Procurement", icon: Truck },
          { id: "transfers", label: "Stock Movements Log", icon: ArrowLeftRight },
          { id: "reorder", label: "Reorder Queue", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-canvas-mist dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Stock Batches & Ledger */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
              <input
                type="search"
                aria-label="Search stock by drug name, batch, warehouse, or category"
                placeholder="Search by drug name, batch #, warehouse, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleExportValuation}
              className="px-4 py-2 rounded-xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-canvas-mist dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Valuation (CSV)
            </button>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Item &amp; Code</th>
                  <th className="py-3 px-3">Batch Number</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Warehouse / Store</th>
                  <th className="py-3 px-3 text-right">Available Stock</th>
                  <th className="py-3 px-3 text-right">Unit / Cost Price</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading stock">Loading stock…</td></tr>
                ) : filteredBatches.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center">
                    <p className="font-bold text-sm">{batches.length === 0 ? "No stock registered" : "No matches found"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {batches.length === 0 ? "Add inventory in Pharmacy Management to stock this ledger." : "Try a different search term."}
                    </p>
                  </td></tr>
                ) : (
                  filteredBatches.map((b) => {
                    const isLow = b.quantity <= b.reorderLevel;
                    return (
                      <tr key={b.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">{b.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.itemCode} • {b.category}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-primary-500">{b.batchNo}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">{b.expiryDate}</td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{b.warehouse}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                          {b.quantity} units
                          <div className="text-[10px] text-slate-400 font-normal">Reorder at: {b.reorderLevel}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(b.unitPrice)}</div>
                          <div className="text-[10px] text-slate-400">Cost: {formatPrice(b.costPrice)}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isLow ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Purchase Orders */}
      {activeTab === "po" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Purchase Orders &amp; Procurement Pipeline</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">{purchaseOrders.length} order{purchaseOrders.length === 1 ? "" : "s"} on record</p>
            </div>

            <Dialog open={showPOModal} onOpenChange={setShowPOModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Raise Purchase Order
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Raise Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label htmlFor="erp-po-supplier" className="font-bold">Supplier *</label>
                    <select
                      id="erp-po-supplier"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                      value={newPOSupplier}
                      onChange={(e) => setNewPOSupplier(e.target.value)}
                    >
                      {SUPPLIERS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="erp-po-amount" className="font-bold">Estimated Order Total (ZMW) *</label>
                    <input
                      id="erp-po-amount"
                      type="number"
                      min={0}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold"
                      value={newPOAmount}
                      onChange={(e) => setNewPOAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label htmlFor="erp-po-expected" className="font-bold">Expected Delivery</label>
                    <input
                      id="erp-po-expected"
                      type="date"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold"
                      value={newPOExpected}
                      onChange={(e) => setNewPOExpected(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowPOModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleCreatePO} disabled={creatingPO} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold disabled:opacity-50">
                    {creatingPO ? "Raising…" : "Submit Order"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3">Expected</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading purchase orders">Loading orders…</td></tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center">
                    <p className="font-bold text-sm">No purchase orders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Raise the first order to start procurement.</p>
                  </td></tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-mono font-bold text-primary-500">{po.poNumber}</td>
                      <td className="py-3 px-3 font-semibold">{po.supplier}</td>
                      <td className="py-3 px-3 text-right font-black tabular-nums">{formatPrice(po.totalAmount)}</td>
                      <td className="py-3 px-3 text-slate-500">{po.expectedDelivery}</td>
                      <td className="py-3 px-3 text-center capitalize">{po.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Stock Movements (real transaction log) */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Stock Movement Log</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              Every recorded stock movement — dispenses, receipts and adjustments.
            </p>
          </div>
          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-3">Movement</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading movements">Loading movements…</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center">
                    <p className="font-bold text-sm">No movements recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">Dispenses and receipts will appear here automatically.</p>
                  </td></tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-bold">{m.item}</td>
                      <td className="py-3 px-3 capitalize">{m.transaction_type.replace(/_/g, " ")}</td>
                      <td className="py-3 px-3 text-right font-black tabular-nums">{m.quantity}</td>
                      <td className="py-3 px-3 text-slate-500">{m.date}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{m.reference || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Reorder Queue (computed from live levels) */}
      {activeTab === "reorder" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Reorder Queue</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              Items at or below their minimum stock level, computed live.
            </p>
          </div>
          {loading ? (
            <div className="space-y-2" role="status" aria-label="Loading reorder queue">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" aria-hidden />
              ))}
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" aria-hidden />
              <p className="font-bold text-sm">Stock levels healthy</p>
              <p className="text-xs text-muted-foreground mt-1">Nothing is at or below reorder level right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-sm">{b.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.quantity} left · reorder at {b.reorderLevel} · {b.batchNo}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 w-fit">
                    Reorder needed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trust strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" aria-hidden /> Batches tracked</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> Expiry monitored</span>
        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden /> POs on record</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Movements logged</span>
        <Sparkles className="h-3.5 w-3.5 text-primary-500" aria-hidden />
      </div>
    </div>
  );
};

export default ERPPharmacyInventory;

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pill, AlertTriangle, Plus, Loader2, RefreshCw, ArrowDownUp, PackageSearch } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "IV Infusion", "Drops", "Cream", "Ointment", "Suppository", "Inhaler", "Powder"];
const MOVEMENT_TYPES = ["received", "issued", "adjusted", "expired", "damaged"] as const;

const getStockPill = (quantity: number, reorderLevel: number, expiryDate: string | null) => {
  const now = new Date();
  const expiry = expiryDate ? new Date(expiryDate) : null;
  if (expiry && expiry < now) return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-error-500">Expired</span>;
  if (quantity <= 0) return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-error-500">Out of Stock</span>;
  if (expiry && expiry.getTime() - now.getTime() < 90 * 24 * 3600 * 1000) return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-warning-500">Expiring Soon</span>;
  if (quantity <= reorderLevel) return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-warning-500">Low Stock</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-success-500">Adequate</span>;
};

const getMovementPill = (type: string) => {
  const colors: Record<string, string> = {
    received: "bg-success-500",
    issued: "bg-primary-400",
    adjusted: "bg-warning-500",
    expired: "bg-error-500",
    damaged: "bg-error-500",
  };
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${colors[type] || "bg-graphite-400"}`}>{type}</span>;
};

export const DrugStock = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "movements">("inventory");
  const [showAddStock, setShowAddStock] = useState(false);
  const [showMoveStock, setShowMoveStock] = useState(false);
  const [moveItem, setMoveItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expiring" | "expired">("all");

  const [stockForm, setStockForm] = useState({
    drug_name: "", generic_name: "", strength: "", dosage_form: "Tablet",
    batch_number: "", quantity: 0, unit: "units", expiry_date: "",
    reorder_level: 10, supplier: "", unit_cost: "",
  });
  const [moveForm, setMoveForm] = useState({ movement_type: "issued" as string, quantity: 1, reason: "" });

  const { data: items, loading, error, refresh } = useHospitalModule<any>("drug_stock_items", "institution_id", hospital?.id, { orderBy: "drug_name", ascending: true });
  const { data: movements, loading: movLoading, refresh: refreshMovements } = useHospitalModule<any>("drug_stock_movements", "institution_id", hospital?.id, { orderBy: "created_at", ascending: false, limit: 300 });

  const itemNames = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => map.set(i.id, `${i.drug_name}${i.strength ? ` ${i.strength}` : ""}${i.batch_number ? ` (${i.batch_number})` : ""}`));
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date().getTime();
    return items.filter((i) => {
      if (q && !`${i.drug_name} ${i.generic_name || ""} ${i.batch_number || ""}`.toLowerCase().includes(q)) return false;
      const qty = Number(i.quantity) || 0;
      const reorder = Number(i.reorder_level) || 0;
      const expiry = i.expiry_date ? new Date(i.expiry_date).getTime() : null;
      if (filter === "low" && !(qty <= reorder && qty > 0)) return false;
      if (filter === "expired" && !(expiry && expiry < now)) return false;
      if (filter === "expiring" && !(expiry && expiry >= now && expiry - now < 90 * 24 * 3600 * 1000)) return false;
      return true;
    });
  }, [items, search, filter]);

  const alertCounts = useMemo(() => {
    const now = new Date().getTime();
    let low = 0, expiring = 0, expired = 0;
    items.forEach((i) => {
      const qty = Number(i.quantity) || 0;
      const reorder = Number(i.reorder_level) || 0;
      const expiry = i.expiry_date ? new Date(i.expiry_date).getTime() : null;
      if (expiry && expiry < now) expired++;
      else if (expiry && expiry - now < 90 * 24 * 3600 * 1000) expiring++;
      if (qty <= reorder) low++;
    });
    return { low, expiring, expired };
  }, [items]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.drug_name.trim()) { toast.error("Drug name is required"); return; }
    if (Number(stockForm.quantity) < 0) { toast.error("Quantity cannot be negative"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("drug_stock_items" as any) as any).insert({
        institution_id: hospital.id,
        drug_name: stockForm.drug_name.trim(),
        generic_name: stockForm.generic_name.trim() || null,
        strength: stockForm.strength.trim() || null,
        dosage_form: stockForm.dosage_form,
        batch_number: stockForm.batch_number.trim() || null,
        quantity: Number(stockForm.quantity) || 0,
        unit: stockForm.unit.trim() || "units",
        expiry_date: stockForm.expiry_date || null,
        reorder_level: Number(stockForm.reorder_level) || 0,
        supplier: stockForm.supplier.trim() || null,
        unit_cost: stockForm.unit_cost ? Number(stockForm.unit_cost) : null,
      });
      if (err) throw err;
      toast.success(`${stockForm.drug_name} added to drug stock`);
      setShowAddStock(false);
      setStockForm({ drug_name: "", generic_name: "", strength: "", dosage_form: "Tablet", batch_number: "", quantity: 0, unit: "units", expiry_date: "", reorder_level: 10, supplier: "", unit_cost: "" });
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to add stock"); }
    finally { setIsSubmitting(false); }
  };

  const openMoveDialog = (item: any, type: string) => {
    setMoveItem(item);
    setMoveForm({ movement_type: type, quantity: 1, reason: "" });
    setShowMoveStock(true);
  };

  const handleMoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveItem) return;
    if (!moveForm.quantity || Number(moveForm.quantity) <= 0) { toast.error("Quantity must be positive"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.rpc as any)("apply_drug_stock_movement", {
        p_item_id: moveItem.id,
        p_movement_type: moveForm.movement_type,
        p_quantity: Number(moveForm.quantity),
        p_reason: moveForm.reason.trim() || null,
      });
      if (err) throw err;
      toast.success(`Stock ${moveForm.movement_type}: ${moveItem.drug_name}`);
      setShowMoveStock(false);
      setMoveItem(null);
      refresh();
      refreshMovements();
    } catch (e: any) { toast.error(e?.message || "Failed to record movement"); }
    finally { setIsSubmitting(false); }
  };

  const tabs = [
    { key: "inventory", label: `Inventory (${items.length})` },
    { key: "movements", label: `Movements (${movements.length})` },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-extrabold">Drug Stock Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { refresh(); refreshMovements(); }} className="p-2 rounded-xl border border-canvas-silk hover:bg-canvas-mist" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowAddStock(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600">
            <Plus className="h-4 w-4" /> Add Stock
          </button>
        </div>
      </div>

      {(alertCounts.low > 0 || alertCounts.expired > 0) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/30 text-xs font-semibold text-warning-700 dark:text-warning-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {alertCounts.low > 0 && <span>{alertCounts.low} item{alertCounts.low > 1 ? "s" : ""} at/below reorder level.</span>}
          {alertCounts.expiring > 0 && <span>{alertCounts.expiring} expiring within 90 days.</span>}
          {alertCounts.expired > 0 && <span>{alertCounts.expired} expired.</span>}
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeTab === t.key ? "bg-primary-500 text-white" : "bg-canvas-mist dark:bg-slate-800 text-graphite-600 dark:text-slate-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-graphite-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drug name, generic, batch…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            {(["all", "low", "expiring", "expired"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize ${filter === f ? "bg-graphite-800 text-white dark:bg-slate-700" : "bg-canvas-mist dark:bg-slate-800 text-graphite-600 dark:text-slate-300"}`}
              >
                {f === "all" ? "All" : f}
                {f === "low" && alertCounts.low > 0 && ` (${alertCounts.low})`}
                {f === "expiring" && alertCounts.expiring > 0 && ` (${alertCounts.expiring})`}
                {f === "expired" && alertCounts.expired > 0 && ` (${alertCounts.expired})`}
              </button>
            ))}
          </div>

          {loading ? <ListSkeleton /> : error ? (
            <div className="p-4 rounded-xl bg-error-500/10 text-error-600 text-sm font-semibold">{error} <button onClick={refresh} className="underline">Retry</button></div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No drug stock items" description={items.length === 0 ? "Add your first batch to start tracking institutional drug stock." : "No items match the current search/filter."} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-canvas-silk dark:border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas-mist dark:bg-slate-800 text-left text-[11px] uppercase tracking-wide text-graphite-500 dark:text-slate-400">
                    <th className="px-3 py-2">Drug</th>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Expiry</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} className="border-t border-canvas-silk dark:border-slate-800">
                      <td className="px-3 py-2">
                        <div className="font-bold">{i.drug_name}{i.strength ? ` ${i.strength}` : ""}</div>
                        <div className="text-[11px] text-graphite-500">{[i.generic_name, i.dosage_form].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">{i.batch_number || "—"}</td>
                      <td className="px-3 py-2 text-right font-bold">{Number(i.quantity)}{i.unit ? ` ${i.unit}` : ""}</td>
                      <td className="px-3 py-2 text-xs">{i.expiry_date || "—"}</td>
                      <td className="px-3 py-2">{getStockPill(Number(i.quantity), Number(i.reorder_level), i.expiry_date)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openMoveDialog(i, "received")} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-success-500/15 text-success-600 hover:bg-success-500/25">Receive</button>
                          <button onClick={() => openMoveDialog(i, "issued")} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-primary-500/15 text-primary-600 hover:bg-primary-500/25">Issue</button>
                          <button onClick={() => openMoveDialog(i, "adjusted")} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-warning-500/15 text-warning-600 hover:bg-warning-500/25">Adjust</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "movements" && (
        movLoading ? <ListSkeleton /> : movements.length === 0 ? (
          <EmptyState title="No stock movements" description="Every receive, issue, adjustment, expiry and damage is recorded here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-canvas-silk dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas-mist dark:bg-slate-800 text-left text-[11px] uppercase tracking-wide text-graphite-500 dark:text-slate-400">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Before → After</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-canvas-silk dark:border-slate-800">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-semibold text-xs">{itemNames.get(m.drug_stock_item_id) || m.drug_stock_item_id?.slice(0, 8)}</td>
                    <td className="px-3 py-2">{getMovementPill(m.movement_type)}</td>
                    <td className="px-3 py-2 text-right font-bold">{Number(m.quantity)}</td>
                    <td className="px-3 py-2 text-right text-xs text-graphite-500">{Number(m.quantity_before)} → {Number(m.quantity_after)}</td>
                    <td className="px-3 py-2 text-xs">{m.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Add stock dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Drug Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStock} className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Drug name *
              <input value={stockForm.drug_name} onChange={(e) => setStockForm({ ...stockForm, drug_name: e.target.value })} required className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="Paracetamol" />
            </label>
            <label className="text-xs font-bold">Generic name
              <input value={stockForm.generic_name} onChange={(e) => setStockForm({ ...stockForm, generic_name: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="Acetaminophen" />
            </label>
            <label className="text-xs font-bold">Strength
              <input value={stockForm.strength} onChange={(e) => setStockForm({ ...stockForm, strength: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="500mg" />
            </label>
            <label className="text-xs font-bold">Dosage form
              <select value={stockForm.dosage_form} onChange={(e) => setStockForm({ ...stockForm, dosage_form: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal">
                {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold">Batch number
              <input value={stockForm.batch_number} onChange={(e) => setStockForm({ ...stockForm, batch_number: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="B-2026-001" />
            </label>
            <label className="text-xs font-bold">Expiry date
              <input type="date" value={stockForm.expiry_date} onChange={(e) => setStockForm({ ...stockForm, expiry_date: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" />
            </label>
            <label className="text-xs font-bold">Quantity
              <input type="number" min={0} step="any" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" />
            </label>
            <label className="text-xs font-bold">Unit
              <input value={stockForm.unit} onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="tablets" />
            </label>
            <label className="text-xs font-bold">Reorder level
              <input type="number" min={0} step="any" value={stockForm.reorder_level} onChange={(e) => setStockForm({ ...stockForm, reorder_level: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" />
            </label>
            <label className="text-xs font-bold">Unit cost (K)
              <input type="number" min={0} step="any" value={stockForm.unit_cost} onChange={(e) => setStockForm({ ...stockForm, unit_cost: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="0.50" />
            </label>
            <label className="text-xs font-bold col-span-2">Supplier
              <input value={stockForm.supplier} onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="Medical Stores Ltd" />
            </label>
            <DialogFooter className="col-span-2">
              <button type="button" onClick={() => setShowAddStock(false)} className="px-4 py-2 rounded-xl border text-sm font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Stock"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock movement dialog */}
      <Dialog open={showMoveStock} onOpenChange={setShowMoveStock}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowDownUp className="h-4 w-4" /> Record Stock Movement</DialogTitle>
          </DialogHeader>
          {moveItem && (
            <form onSubmit={handleMoveStock} className="space-y-3">
              <p className="text-sm font-bold">{moveItem.drug_name}{moveItem.strength ? ` ${moveItem.strength}` : ""} <span className="font-normal text-graphite-500">— current: {Number(moveItem.quantity)}{moveItem.unit ? ` ${moveItem.unit}` : ""}</span></p>
              <label className="text-xs font-bold block">Movement type
                <select value={moveForm.movement_type} onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal">
                  {MOVEMENT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold block">Quantity
                <input type="number" min={0.01} step="any" value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" />
              </label>
              <label className="text-xs font-bold block">Reason / reference
                <input value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-normal" placeholder="Ward requisition #123, GRN-456…" />
              </label>
              <DialogFooter>
                <button type="button" onClick={() => setShowMoveStock(false)} className="px-4 py-2 rounded-xl border text-sm font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

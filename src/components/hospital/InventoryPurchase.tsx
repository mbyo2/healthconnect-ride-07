import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Search, TrendingDown, Plus, Loader2, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export const InventoryPurchase = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"stock" | "reorder">("stock");

  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "Medical Supplies",
    quantity_available: 0,
    unit: "boxes",
    supplier: "",
    reorder_level: 10,
    expiry_date: "",
  });

  const { data: supplies, loading, error, refresh } = useHospitalModule<any>(
    "hospital_inventory", "institution_id", hospital?.id, { orderBy: "item_name", ascending: true }
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.item_name) {
      toast.error("Item name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: err } = await supabase.from("hospital_inventory" as any).insert({
        institution_id: hospital?.id,
        ...newItem,
        quantity_available: Number(newItem.quantity_available),
        reorder_level: Number(newItem.reorder_level),
      });
      if (err) throw err;

      toast.success("Inventory item added successfully");
      setIsAddDialogOpen(false);
      setNewItem({
        item_name: "",
        category: "Medical Supplies",
        quantity_available: 0,
        unit: "boxes",
        supplier: "",
        reorder_level: 10,
        expiry_date: "",
      });
      refresh();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to add inventory item"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSupplies = supplies.filter((s) =>
    (s.item_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const lowStock = supplies.filter((s) => (s.quantity_available ?? 0) <= (s.reorder_level ?? 0));
  const expiringSoon = supplies.filter(
    (s) => s.expiry_date && new Date(s.expiry_date).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000
  );

  const getStatusPill = (qty: number, reorder: number) => {
    if (qty <= reorder) {
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Reorder Required</span>;
    }
    return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">In Stock</span>;
  };

  return (
    <div className="space-y-4 font-sans text-foreground">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-500" />
            Hospital Inventory & Stock Purchase Board
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Medical supply registers, reorder alerts, and batch expiry monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted font-bold text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-gold hover:bg-gold-deep text-gold-ink font-semibold text-xs transition-all flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Stock Item
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs text-center">
          <Package className="h-5 w-5 mx-auto text-primary-500 mb-1" />
          <div className="text-2xl font-bold text-foreground tabular-nums">{supplies.length}</div>
          <div className="text-xs text-muted-foreground font-bold uppercase">Total Stock Items</div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs text-center">
          <TrendingDown className="h-5 w-5 mx-auto text-warning-500 mb-1" />
          <div className="text-2xl font-bold text-foreground tabular-nums">{lowStock.length}</div>
          <div className="text-xs text-muted-foreground font-bold uppercase">Need Reorder</div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs text-center">
          <Package className="h-5 w-5 mx-auto text-error-500 mb-1" />
          <div className="text-2xl font-bold text-foreground tabular-nums">{expiringSoon.length}</div>
          <div className="text-xs text-muted-foreground font-bold uppercase">Expiring ≤ 90d</div>
        </div>
      </div>

      {/* Views Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-pill rounded-full">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "stock" ? "bg-card text-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Stock Register ({supplies.length})
        </button>
        <button
          onClick={() => setActiveTab("reorder")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "reorder" ? "bg-card text-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Reorder Alert Queue ({lowStock.length})
        </button>
      </div>

      {activeTab === "stock" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search hospital inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-canvas text-xs font-semibold uppercase text-muted-foreground">
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Expiry</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSupplies.map((s) => (
                  <tr key={s.id} className="hover:bg-muted transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{s.item_name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{s.category || "General"}</td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">{s.quantity_available ?? 0}</td>
                    <td className="py-3 px-3 text-slate-500">{s.unit || "boxes"}</td>
                    <td className="py-3 px-3 text-slate-600">{s.supplier || "—"}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{s.expiry_date || "—"}</td>
                    <td className="py-3 px-3 text-center">
                      {getStatusPill(s.quantity_available ?? 0, s.reorder_level ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-semibold text-base">Add Hospital Inventory Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground uppercase">Item Name *</label>
              <input
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                placeholder="e.g. Paracetamol 500mg / Surgical Gloves"
                className="w-full mt-1 p-2 rounded-md border border-border bg-card font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground uppercase">Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity_available}
                  onChange={(e) => setNewItem({ ...newItem, quantity_available: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-border bg-card font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground uppercase">Reorder Level</label>
                <input
                  type="number"
                  value={newItem.reorder_level}
                  onChange={(e) => setNewItem({ ...newItem, reorder_level: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-border bg-card font-bold"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <button type="button" onClick={() => setIsAddDialogOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold shadow-xs">
                {isSubmitting ? "Saving..." : "Add Stock Item"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPurchase;

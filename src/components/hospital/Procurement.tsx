import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShoppingCart, Truck, Plus, Loader2, RefreshCw, Trash2, Pencil } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PO_STATUSES = ["draft", "sent", "partially_received", "received", "cancelled"] as const;
type POStatus = (typeof PO_STATUSES)[number];

const getStatusPill = (status: string) => {
  const base = "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white";
  if (status === "draft") return <span className={`${base} bg-graphite-400`}>Draft</span>;
  if (status === "sent") return <span className={`${base} bg-primary-400`}>Sent</span>;
  if (status === "partially_received") return <span className={`${base} bg-warning-500`}>Partially Received</span>;
  if (status === "received") return <span className={`${base} bg-success-500`}>Received</span>;
  return <span className={`${base} bg-error-500`}>Cancelled</span>;
};

const NEXT_STATUS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

const fmtMoney = (n: number) =>
  `K${Number(n || 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const Procurement = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers">("orders");
  const [showNewPO, setShowNewPO] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [viewingPO, setViewingPO] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [poForm, setPOForm] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    notes: "",
    items: [{ item_name: "", quantity: 1, unit: "units", unit_price: 0 }] as Array<{ item_name: string; quantity: number; unit: string; unit_price: number }>,
  });
  const [supplierForm, setSupplierForm] = useState({
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    payment_terms: "",
    is_active: true,
  });

  const { data: orders, loading: ordersLoading, refresh: refreshOrders } = useHospitalModule<any>(
    "purchase_orders", "institution_id", hospital?.id, { orderBy: "order_date", ascending: false }
  );
  const { data: suppliers, loading: suppliersLoading, refresh: refreshSuppliers } = useHospitalModule<any>(
    "procurement_suppliers", "institution_id", hospital?.id, { orderBy: "supplier_name", ascending: true }
  );
  const { data: poItems, loading: itemsLoading, refresh: refreshItems } = useHospitalModule<any>(
    "purchase_order_items", null, null, { orderBy: "created_at", ascending: true, enabled: !!viewingPO }
  );

  const supplierName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.supplier_name || "—";

  const filteredOrders =
    statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const poTotal = poForm.items.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0
  );

  const resetPOForm = () =>
    setPOForm({
      supplier_id: "",
      expected_delivery_date: "",
      notes: "",
      items: [{ item_name: "", quantity: 1, unit: "units", unit_price: 0 }],
    });

  const resetSupplierForm = () =>
    setSupplierForm({
      supplier_name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      payment_terms: "",
      is_active: true,
    });

  // ── Purchase orders ──────────────────────────────────────
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = poForm.items.filter((i) => i.item_name.trim());
    if (validItems.length === 0) { toast.error("Add at least one line item"); return; }
    if (!poForm.supplier_id) { toast.error("Select a supplier"); return; }
    setIsSubmitting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      const poNumber = `PO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const total = validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
      const { data: po, error: poErr } = await (supabase.from("purchase_orders" as any) as any)
        .insert({
          institution_id: hospital?.id,
          order_number: poNumber,
          supplier_id: poForm.supplier_id,
          expected_delivery_date: poForm.expected_delivery_date || null,
          notes: poForm.notes || null,
          status: "draft",
          total_amount: total,
          created_by: userId,
        })
        .select("id")
        .single();
      if (poErr) throw poErr;
      const { error: itemsErr } = await (supabase.from("purchase_order_items" as any) as any).insert(
        validItems.map((i) => ({
          purchase_order_id: po.id,
          item_name: i.item_name.trim(),
          quantity_ordered: Number(i.quantity),
          unit: i.unit || "units",
          unit_price: Number(i.unit_price),
          total_price: Number(i.quantity) * Number(i.unit_price),
        }))
      );
      if (itemsErr) throw itemsErr;
      toast.success(`Purchase order ${poNumber} created`);
      setShowNewPO(false);
      resetPOForm();
      refreshOrders();
    } catch (e: any) { toast.error(e?.message || "Failed to create purchase order"); }
    finally { setIsSubmitting(false); }
  };

  const updatePOStatus = async (po: any, status: string) => {
    try {
      const { error: err } = await (supabase.from("purchase_orders" as any) as any)
        .update({ status })
        .eq("id", po.id);
      if (err) throw err;
      toast.success(`PO ${po.order_number} → ${status.replace(/_/g, " ")}`);
      refreshOrders();
      if (viewingPO?.id === po.id) setViewingPO({ ...viewingPO, status });
    } catch (e: any) { toast.error(e?.message || "Failed to update status"); }
  };

  const deletePO = async (po: any) => {
    if (po.status !== "draft") { toast.error("Only draft orders can be deleted"); return; }
    if (!window.confirm(`Delete PO ${po.order_number}?`)) return;
    try {
      const { error: err } = await (supabase.from("purchase_orders" as any) as any)
        .delete()
        .eq("id", po.id);
      if (err) throw err;
      toast.success(`PO ${po.order_number} deleted`);
      refreshOrders();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  // ── Suppliers ────────────────────────────────────────────
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.supplier_name.trim()) { toast.error("Supplier name is required"); return; }
    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        const { error: err } = await (supabase.from("procurement_suppliers" as any) as any)
          .update({ ...supplierForm, supplier_name: supplierForm.supplier_name.trim() })
          .eq("id", editingSupplier.id);
        if (err) throw err;
        toast.success("Supplier updated");
      } else {
        const { error: err } = await (supabase.from("procurement_suppliers" as any) as any).insert({
          institution_id: hospital?.id,
          ...supplierForm,
          supplier_name: supplierForm.supplier_name.trim(),
        });
        if (err) throw err;
        toast.success("Supplier added");
      }
      setShowNewSupplier(false);
      setEditingSupplier(null);
      resetSupplierForm();
      refreshSuppliers();
    } catch (e: any) { toast.error(e?.message || "Failed to save supplier"); }
    finally { setIsSubmitting(false); }
  };

  const openEditSupplier = (s: any) => {
    setEditingSupplier(s);
    setSupplierForm({
      supplier_name: s.supplier_name || "",
      contact_person: s.contact_person || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      payment_terms: s.payment_terms || "",
      is_active: s.is_active !== false,
    });
    setShowNewSupplier(true);
  };

  const toggleSupplierActive = async (s: any) => {
    try {
      const { error: err } = await (supabase.from("procurement_suppliers" as any) as any)
        .update({ is_active: !s.is_active })
        .eq("id", s.id);
      if (err) throw err;
      toast.success(`Supplier ${s.is_active ? "deactivated" : "activated"}`);
      refreshSuppliers();
    } catch (e: any) { toast.error(e?.message || "Failed to update supplier"); }
  };

  const viewingItems = viewingPO ? poItems.filter((i) => i.purchase_order_id === viewingPO.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-600">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">Procurement</h2>
            <p className="text-xs text-graphite-500">
              {orders.length} purchase orders · {suppliers.filter((s) => s.is_active).length} active suppliers
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {(["orders", "suppliers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-4 py-2 rounded-xl text-xs font-extrabold"
          >
            {t === "orders" ? `Purchase Orders (${orders.length})` : `Suppliers (${suppliers.length})`}
          </button>
        ))}
      </div>
      <p className="text-xs">Tabs render OK. Active: {activeTab}</p>
{/* ── Purchase Orders tab ── */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {["all", ...PO_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${
                  statusFilter === s ? "bg-slate-800 text-white" : "bg-canvas-mist text-graphite-500 hover:bg-canvas-silk"
                }`}
              >
                {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <ListSkeleton rows={5} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-8 w-8" />}
              title="No purchase orders"
              description={statusFilter === "all" ? "Create your first purchase order." : `No orders with status "${statusFilter}".`}
            />
          ) : (
            <div className="rounded-2xl border border-canvas-silk overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas-mist text-left text-[11px] uppercase text-graphite-500">
                    <th className="px-4 py-2.5">PO Number</th>
                    <th className="px-4 py-2.5">Supplier</th>
                    <th className="px-4 py-2.5">Order Date</th>
                    <th className="px-4 py-2.5">Expected</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-t border-canvas-silk hover:bg-canvas-mist/50">
                      <td className="px-4 py-2.5 font-bold">{o.order_number}</td>
                      <td className="px-4 py-2.5">{supplierName(o.supplier_id)}</td>
                      <td className="px-4 py-2.5 text-xs">{o.order_date}</td>
                      <td className="px-4 py-2.5 text-xs">{o.expected_delivery_date || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{fmtMoney(o.total_amount)}</td>
                      <td className="px-4 py-2.5">{getStatusPill(o.status)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <button
                            onClick={() => { setViewingPO(o); refreshItems(); }}
                            className="px-2 py-1 rounded-lg bg-canvas-mist text-[11px] font-bold hover:bg-canvas-silk"
                          >
                            View
                          </button>
                          {NEXT_STATUS[o.status]?.map((ns) => (
                            <button
                              key={ns}
                              onClick={() => updatePOStatus(o, ns)}
                              className="px-2 py-1 rounded-lg bg-primary-500/10 text-primary-600 text-[11px] font-bold hover:bg-primary-500/20"
                            >
                              {ns.replace(/_/g, " ")}
                            </button>
                          ))}
                          {o.status === "draft" && (
                            <button
                              onClick={() => deletePO(o)}
                              className="p-1.5 rounded-lg text-error-500 hover:bg-error-500/10"
                              title="Delete draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

          </div>
  );
};

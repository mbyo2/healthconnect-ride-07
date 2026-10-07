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
      <h2 className="text-lg font-extrabold">Procurement Test</h2>
      <p>Orders: {orders.length}, Suppliers: {suppliers.length}</p>
    </div>
  );
};

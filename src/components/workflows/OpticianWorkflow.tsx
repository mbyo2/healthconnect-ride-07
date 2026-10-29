import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Glasses, FileText, Package, CheckCircle2, Loader2, Plus,
  Building2, Clock, Eye, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { useAuth } from "@/context/AuthContext";
import { useHospitalPatients } from "@/hooks/useHospitalPatients";
import { HospitalPatientSelect } from "@/components/hospital/HospitalPatientSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { ApplicationStatusBanner, ProfileCompleteBanner } from "@/components/dashboard/StatusBanners";
import { toast } from "sonner";
import { format } from "date-fns";

interface ActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface ActionGroup {
  title: string;
  primary: ActionItem;
  secondary: ActionItem[];
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning-500",
  ordered: "bg-primary-500",
  ready: "bg-success-500",
  dispensed: "bg-muted",
  cancelled: "bg-destructive",
};

const LENS_TYPES = [
  { value: "single_vision", label: "Single Vision" },
  { value: "bifocal", label: "Bifocal" },
  { value: "progressive", label: "Progressive" },
  { value: "contact_lenses", label: "Contact Lenses" },
  { value: "sunglasses", label: "Sunglasses" },
];

const emptyRx = {
  od_sphere: "", od_cylinder: "", od_axis: "",
  os_sphere: "", os_cylinder: "", os_axis: "",
  pd: "", notes: "",
};

export const OpticianWorkflow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { institutionId, loading: affilLoading } = useInstitutionAffiliation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { patients, loading: patientsLoading } = useHospitalPatients(institutionId);

  // ── Prescription dialog state ─────────────────────────────
  const [rxDialogOpen, setRxDialogOpen] = useState(false);
  const [rxPatientId, setRxPatientId] = useState("");
  const [rxForm, setRxForm] = useState(emptyRx);
  const [savingRx, setSavingRx] = useState(false);

  // ── Order dialog state ────────────────────────────────────
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderRxId, setOrderRxId] = useState("");
  const [orderForm, setOrderForm] = useState({ frame: "", lens_type: "single_vision", notes: "" });
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");

  // ── Queries ───────────────────────────────────────────────
  const { data: prescriptions = [], isLoading: rxLoading } = useQuery({
    queryKey: ["optical-prescriptions", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optical_prescriptions" as any)
        .select("*")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["lens-orders", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lens_orders" as any)
        .select("*")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const rxToday = prescriptions.filter((p: any) => p.created_at?.startsWith(today)).length;
  const ordersPending = orders.filter((o: any) => ["pending", "ordered"].includes(o.status)).length;
  const ordersReady = orders.filter((o: any) => o.status === "ready").length;
  const dispensedTotal = orders.filter((o: any) => o.status === "dispensed").length;

  const filteredOrders = orders.filter(
    (o: any) => orderFilter === "all" || o.status === orderFilter
  );
  // Dispensing tab: only ready orders
  const readyOrders = orders.filter((o: any) => o.status === "ready");

  // ── Mutations ─────────────────────────────────────────────
  const patientName = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? p.name : id.slice(0, 8);
  };

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const savePrescription = async () => {
    if (!rxPatientId) {
      toast.error("Select a patient first.");
      return;
    }
    setSavingRx(true);
    try {
      const { error } = await supabase.from("optical_prescriptions" as any).insert({
        institution_id: institutionId,
        patient_id: rxPatientId,
        prescribed_by: user?.id || null,
        od_sphere: numOrNull(rxForm.od_sphere),
        od_cylinder: numOrNull(rxForm.od_cylinder),
        od_axis: rxForm.od_axis.trim() === "" ? null : Number(rxForm.od_axis),
        os_sphere: numOrNull(rxForm.os_sphere),
        os_cylinder: numOrNull(rxForm.os_cylinder),
        os_axis: rxForm.os_axis.trim() === "" ? null : Number(rxForm.os_axis),
        pd: numOrNull(rxForm.pd),
        notes: rxForm.notes.trim() || null,
        status: "active",
      });
      if (error) throw error;
      toast.success("Optical prescription saved.");
      queryClient.invalidateQueries({ queryKey: ["optical-prescriptions", institutionId] });
      setRxDialogOpen(false);
      setRxPatientId("");
      setRxForm(emptyRx);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save prescription.");
    } finally {
      setSavingRx(false);
    }
  };

  const saveOrder = async () => {
    const rx = prescriptions.find((p: any) => p.id === orderRxId);
    if (!rx) {
      toast.error("Select a prescription first.");
      return;
    }
    setSavingOrder(true);
    try {
      const { error } = await supabase.from("lens_orders" as any).insert({
        institution_id: institutionId,
        prescription_id: rx.id,
        patient_id: rx.patient_id,
        patient_name: patientName(rx.patient_id),
        frame: orderForm.frame.trim() || null,
        lens_type: orderForm.lens_type,
        status: "pending",
        notes: orderForm.notes.trim() || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast.success("Lens order created.");
      queryClient.invalidateQueries({ queryKey: ["lens-orders", institutionId] });
      setOrderDialogOpen(false);
      setOrderRxId("");
      setOrderForm({ frame: "", lens_type: "single_vision", notes: "" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const advanceOrder = async (order: any, status: string) => {
    try {
      const patch: any = { status };
      if (status === "ordered") patch.ordered_at = new Date().toISOString();
      if (status === "ready") patch.ready_at = new Date().toISOString();
      if (status === "dispensed") patch.dispensed_at = new Date().toISOString();
      const { error } = await supabase
        .from("lens_orders" as any)
        .update(patch)
        .eq("id", order.id);
      if (error) throw error;
      toast.success(`Order marked ${status}.`);
      queryClient.invalidateQueries({ queryKey: ["lens-orders", institutionId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update order.");
    }
  };

  // ── No institution state ──────────────────────────────────
  if (affilLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!institutionId) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> No institution linked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your optician account isn't linked to an institution yet. Ask your
            institution admin to add you to the staff roster, then refresh.
          </p>
        </CardContent>
      </Card>
    );
  }

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;
  const goToTab = (tab: string, title: string) => {
    setActiveTab(tab);
    showSuccess({ message: `Opening ${title}...` });
    document.getElementById('optician-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  const groups: ActionGroup[] = [
    {
      title: 'Prescriptions',
      primary: { title: 'Optical Prescriptions', description: 'Write & manage patient prescriptions', icon: icon(Eye), action: () => goToTab('prescriptions', 'Prescriptions') },
      secondary: [
        { title: 'New Prescription', description: 'Record a new optical prescription', icon: icon(Plus), action: () => setRxDialogOpen(true) },
      ],
    },
    {
      title: 'Orders',
      primary: { title: 'Lens Orders', description: 'Track orders from pending to ready', icon: icon(Package), action: () => goToTab('orders', 'Lens Orders') },
      secondary: [],
    },
    {
      title: 'Fulfillment',
      primary: { title: 'Dispensing', description: 'Hand ready orders to patients', icon: icon(CheckCircle2), action: () => goToTab('dispensing', 'Dispensing') },
      secondary: [],
    },
  ];

  const rxField = (
    label: string,
    key: keyof typeof emptyRx,
    placeholder = "0.00"
  ) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={rxForm[key]}
        onChange={(e) => setRxForm({ ...rxForm, [key]: e.target.value })}
        placeholder={placeholder}
        className="h-11 text-xs"
        inputMode="decimal"
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Glasses className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Optical Services</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Optician Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => goToTab('dispensing', 'Dispensing')}
            className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 opacity-80" />
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{ordersReady}</p>
            <p className="mt-1 text-[15px] font-medium">Ready to dispense</p>
            <p className="text-[13px] opacity-80">Orders awaiting pickup</p>
          </button>

          <button
            onClick={() => goToTab('orders', 'Lens Orders')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{ordersPending}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Orders pending</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">In production queue</p>
          </button>

          <button
            onClick={() => goToTab('prescriptions', 'Prescriptions')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-blue-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{rxToday}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Prescriptions today</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{dispensedTotal} dispensed total</p>
          </button>
        </div>
      </section>

      {/* Grouped Actions */}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">{group.title}</h2>
          <div className="rounded-2xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={group.primary.action}
              className="flex w-full items-center gap-4 border-b border-canvas-silk p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                {group.primary.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-slate-900 dark:text-white">{group.primary.title}</p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{group.primary.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            {group.secondary.length > 0 && (
              <div className="divide-y divide-canvas-silk dark:divide-slate-800">
                {group.secondary.map((item) => (
                  <button
                    key={item.title}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-slate-900 dark:text-white">{item.title}</p>
                      <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {/* Workspace */}
      <section id="optician-workspace" className="scroll-mt-6">
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Workspace</h2>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prescriptions" className="gap-1.5 min-h-[44px]">
              <Eye className="h-4 w-4" /> Prescriptions
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 min-h-[44px]">
              <Package className="h-4 w-4" /> Lens Orders
            </TabsTrigger>
            <TabsTrigger value="dispensing" className="gap-1.5 min-h-[44px]">
              <CheckCircle2 className="h-4 w-4" /> Dispensing
            </TabsTrigger>
          </TabsList>

        {/* ── Prescriptions ── */}
        <TabsContent value="prescriptions" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="touch" onClick={() => setRxDialogOpen(true)} className="gap-1.5 min-h-[44px]">
              <Plus className="h-4 w-4" /> New Prescription
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {rxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No optical prescriptions yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Patient</th>
                        <th className="text-left px-4 py-2.5 font-medium">OD (Sph/Cyl/Axis)</th>
                        <th className="text-left px-4 py-2.5 font-medium">OS (Sph/Cyl/Axis)</th>
                        <th className="text-left px-4 py-2.5 font-medium">PD</th>
                        <th className="text-center px-4 py-2.5 font-medium">Status</th>
                        <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {prescriptions.map((rx: any) => (
                        <tr key={rx.id} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-xs font-medium">{patientName(rx.patient_id)}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rx.od_sphere ?? "—"} / {rx.od_cylinder ?? "—"} / {rx.od_axis ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rx.os_sphere ?? "—"} / {rx.os_cylinder ?? "—"} / {rx.os_axis ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs">{rx.pd ?? "—"}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="secondary" className="text-xs">{rx.status}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              size="touch"
                              variant="outline" className="min-h-[44px] text-xs"
                              onClick={() => { setOrderRxId(rx.id); setOrderDialogOpen(true); }}
                            >
                              <Package className="h-3.5 w-3.5 mr-1" /> Order lenses
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lens orders ── */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "pending", "ordered", "ready", "dispensed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setOrderFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  orderFilter === s
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 opacity-70">
                  {s === "all" ? orders.length : orders.filter((o: any) => o.status === s).length}
                </span>
              </button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No lens orders match.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Patient</th>
                        <th className="text-left px-4 py-2.5 font-medium">Frame</th>
                        <th className="text-left px-4 py-2.5 font-medium">Lens type</th>
                        <th className="text-center px-4 py-2.5 font-medium">Status</th>
                        <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredOrders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-xs font-medium">{o.patient_name || patientName(o.patient_id)}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.frame || "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {LENS_TYPES.find((t) => t.value === o.lens_type)?.label || o.lens_type}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white ${ORDER_STATUS_COLOR[o.status] || "bg-muted"}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              {o.status === "pending" && (
                                <Button size="touch" variant="outline" className="min-h-[44px] text-xs" onClick={() => advanceOrder(o, "ordered")}>
                                  Mark ordered
                                </Button>
                              )}
                              {o.status === "ordered" && (
                                <Button size="touch" variant="outline" className="min-h-[44px] text-xs" onClick={() => advanceOrder(o, "ready")}>
                                  Mark ready
                                </Button>
                              )}
                              {o.status === "ready" && (
                                <Button size="touch" className="min-h-[44px] text-xs" onClick={() => advanceOrder(o, "dispensed")}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Dispense
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dispensing ── */}
        <TabsContent value="dispensing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success-500" /> Ready for pickup
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {readyOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12 px-4">
                  Nothing ready to dispense. Orders marked "ready" appear here.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {readyOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{o.patient_name || patientName(o.patient_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.frame || "No frame"} · {LENS_TYPES.find((t) => t.value === o.lens_type)?.label || o.lens_type}
                        </p>
                      </div>
                      <Button size="touch" onClick={() => advanceOrder(o, "dispensed")} className="gap-1.5 min-h-[44px]">
                        <CheckCircle2 className="h-4 w-4" /> Dispense
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </section>

      {/* ── New prescription dialog ── */}
      <Dialog open={rxDialogOpen} onOpenChange={setRxDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Optical Prescription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <HospitalPatientSelect
              institutionId={institutionId}
              patients={patients}
              loading={patientsLoading}
              value={rxPatientId}
              onChange={setRxPatientId}
            />
            <div>
              <p className="text-xs font-semibold mb-2">Right Eye (OD)</p>
              <div className="grid grid-cols-3 gap-2">
                {rxField("Sphere", "od_sphere")}
                {rxField("Cylinder", "od_cylinder")}
                {rxField("Axis (0–180)", "od_axis", "90")}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2">Left Eye (OS)</p>
              <div className="grid grid-cols-3 gap-2">
                {rxField("Sphere", "os_sphere")}
                {rxField("Cylinder", "os_cylinder")}
                {rxField("Axis (0–180)", "os_axis", "90")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Pupillary Distance (mm)</Label>
                <Input
                  value={rxForm.pd}
                  onChange={(e) => setRxForm({ ...rxForm, pd: e.target.value })}
                  placeholder="63"
                  className="h-11 text-xs"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={rxForm.notes}
                onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })}
                placeholder="e.g. first-time wearer, anti-reflective coating recommended…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRxDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePrescription} disabled={savingRx}>
              {savingRx ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FileText className="h-4 w-4 mr-1.5" />}
              Save Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New lens order dialog ── */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Lens Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Prescription</Label>
              <Select value={orderRxId} onValueChange={setOrderRxId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select prescription" />
                </SelectTrigger>
                <SelectContent>
                  {prescriptions.map((rx: any) => (
                    <SelectItem key={rx.id} value={rx.id} className="text-xs">
                      {patientName(rx.patient_id)} — {rx.created_at ? format(new Date(rx.created_at), "dd MMM yyyy") : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frame</Label>
              <Input
                value={orderForm.frame}
                onChange={(e) => setOrderForm({ ...orderForm, frame: e.target.value })}
                placeholder="e.g. Ray-Ban RB5154, black"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lens type</Label>
              <Select value={orderForm.lens_type} onValueChange={(v) => setOrderForm({ ...orderForm, lens_type: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="Supplier, ETA, special instructions…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOrder} disabled={savingOrder}>
              {savingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Clock className="h-4 w-4 mr-1.5" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

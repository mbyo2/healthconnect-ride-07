import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image as ImageIcon, Plus, Loader2, RefreshCw, FileText, ScanLine } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MODALITIES = ["xray", "ct", "mri", "ultrasound", "mammography"] as const;
const MODALITY_LABELS: Record<string, string> = {
  xray: "X-Ray",
  ct: "CT Scan",
  mri: "MRI",
  ultrasound: "Ultrasound",
  mammography: "Mammography",
};

const PRIORITIES = ["routine", "urgent", "emergency"] as const;
const ORDER_STATUSES = ["ordered", "in_progress", "completed", "cancelled"] as const;

const getStatusPill = (status: string) => {
  switch (status) {
    case "completed": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Completed</span>;
    case "in_progress": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">In Progress</span>;
    case "cancelled": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Cancelled</span>;
    default: return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-primary-400">Ordered</span>;
  }
};

const getPriorityPill = (priority: string) => {
  if (priority === "emergency") return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Emergency</span>;
  if (priority === "urgent") return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Urgent</span>;
  return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-graphite-500 dark:bg-slate-600">Routine</span>;
};

export const Imaging = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"orders" | "results">("orders");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportingOrder, setReportingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ patient_id: "", modality: "xray", body_part: "", clinical_indication: "", priority: "routine" });
  const [resultForm, setResultForm] = useState({ findings: "", impression: "", image_url: "" });
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders, loading, error, refresh } = useHospitalModule<any>("imaging_orders", "institution_id", hospital?.id, { orderBy: "ordered_at", ascending: false });
  const { nameFor } = usePatientNames(orders.map((o) => o.patient_id));

  // Results are scoped to this institution's orders
  const [resultsAll, setResultsAll] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const loadResults = React.useCallback(async () => {
    if (!hospital?.id) { setResultsAll([]); return; }
    setLoadingResults(true);
    try {
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length === 0) { setResultsAll([]); return; }
      const { data, error: err } = await (supabase.from("imaging_results" as any) as any)
        .select("*").in("order_id", orderIds).order("created_at", { ascending: false });
      if (err) throw err;
      setResultsAll(data || []);
    } catch { /* non-fatal */ }
    finally { setLoadingResults(false); }
  }, [hospital?.id, orders]);
  React.useEffect(() => { loadResults(); }, [loadResults]);

  const resultFor = (orderId: string) => resultsAll.find((r) => r.order_id === orderId);

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);
  const pendingCount = orders.filter((o) => ["ordered", "in_progress"].includes(o.status)).length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  const handleNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.patient_id) { toast.error("Select a patient for this imaging order"); return; }
    if (!orderForm.body_part.trim()) { toast.error("Enter the body part to image"); return; }
    setIsSubmitting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const orderNum = `IMG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { error: err } = await (supabase.from("imaging_orders" as any) as any).insert({
        institution_id: hospital.id,
        patient_id: orderForm.patient_id,
        ordered_by: user?.id || null,
        modality: orderForm.modality,
        body_part: orderForm.body_part.trim(),
        clinical_indication: orderForm.clinical_indication.trim(),
        priority: orderForm.priority,
        status: "ordered",
        order_number: orderNum,
      });
      if (err) throw err;
      toast.success(`Imaging order ${orderNum} created`);
      setShowNewOrder(false);
      setOrderForm({ patient_id: "", modality: "xray", body_part: "", clinical_indication: "", priority: "routine" });
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to create imaging order"); }
    finally { setIsSubmitting(false); }
  };

  const updateOrderStatus = async (order: any, status: string) => {
    try {
      const { error: err } = await (supabase.from("imaging_orders" as any) as any).update({ status }).eq("id", order.id);
      if (err) throw err;
      toast.success(`Order ${order.order_number || ""} → ${status.replace("_", " ")}`);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to update order"); }
  };

  const openReport = (order: any) => {
    setReportingOrder(order);
    const existing = resultFor(order.id);
    setResultForm({ findings: existing?.findings || "", impression: existing?.impression || "", image_url: existing?.image_url || "" });
    setShowReport(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingOrder) return;
    if (!resultForm.findings.trim()) { toast.error("Enter the findings"); return; }
    if (!resultForm.impression.trim()) { toast.error("Enter the impression"); return; }
    setIsSubmitting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const existing = resultFor(reportingOrder.id);
      const payload = {
        order_id: reportingOrder.id,
        patient_id: reportingOrder.patient_id,
        radiologist_id: user?.id || null,
        findings: resultForm.findings.trim(),
        impression: resultForm.impression.trim(),
        image_url: resultForm.image_url.trim() || null,
        reported_at: new Date().toISOString(),
      };
      if (existing) {
        const { error: err } = await (supabase.from("imaging_results" as any) as any).update(payload).eq("id", existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await (supabase.from("imaging_results" as any) as any).insert(payload);
        if (err) throw err;
      }
      // Mark order completed once a report exists
      await (supabase.from("imaging_orders" as any) as any).update({ status: "completed" }).eq("id", reportingOrder.id);
      toast.success("Radiology report saved");
      setShowReport(false);
      setReportingOrder(null);
      loadResults();
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to save report"); }
    finally { setIsSubmitting(false); }
  };

  const tabs = [
    { id: "orders", label: "Orders", icon: ScanLine },
    { id: "results", label: "Results", icon: FileText },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-500" /> Imaging / Radiology
          </h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refresh(); loadResults(); }} className="btn-outline text-sm px-3 py-2 rounded-lg flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setShowNewOrder(true)} className="btn-primary text-sm px-4 py-2 rounded-lg flex items-center gap-1">
            <Plus className="h-4 w-4" /> New Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === t.id ? "border-primary-500 text-primary-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "orders" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {["all", ...ORDER_STATUSES].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${statusFilter === s ? "bg-primary-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {s === "all" ? "All" : s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>

          {loading ? <ListSkeleton rows={5} /> : error ? (
            <EmptyState title="Couldn't load imaging orders" description={error} action={{ label: "Retry", onClick: refresh }} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No imaging orders" description="Create an imaging order to get started." action={{ label: "New Order", onClick: () => setShowNewOrder(true) }} />
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((o: any) => {
                const res = resultFor(o.id);
                return (
                  <div key={o.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{MODALITY_LABELS[o.modality] || o.modality}</span>
                        <span className="text-sm text-muted-foreground">{o.body_part}</span>
                        {getStatusPill(o.status)}
                        {getPriorityPill(o.priority)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Patient: {nameFor(o.patient_id)} · {o.order_number || ""}
                        {o.clinical_indication && <span className="block italic">“{o.clinical_indication}”</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {o.status === "ordered" && (
                        <button onClick={() => updateOrderStatus(o, "in_progress")} className="btn-outline text-xs px-3 py-1.5 rounded-lg">Start</button>
                      )}
                      {o.status === "in_progress" && (
                        <button onClick={() => openReport(o)} className="btn-primary text-xs px-3 py-1.5 rounded-lg">Enter Report</button>
                      )}
                      {res && (
                        <button onClick={() => openReport(o)} className="btn-outline text-xs px-3 py-1.5 rounded-lg">View Report</button>
                      )}
                      {!["completed", "cancelled"].includes(o.status) && (
                        <button onClick={() => updateOrderStatus(o, "cancelled")} className="btn-ghost text-xs px-3 py-1.5 rounded-lg text-error-500">Cancel</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "results" && (
        <div className="space-y-3">
          {loadingResults ? <ListSkeleton rows={4} /> : resultsAll.length === 0 ? (
            <EmptyState title="No reports yet" description="Radiology reports appear here once entered against an order." />
          ) : (
            <div className="space-y-2">
              {resultsAll.map((r: any) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-primary-500" />
                    <span className="font-bold">Patient: {nameFor(r.patient_id)}</span>
                    <span className="text-xs text-muted-foreground">
                      reported {r.reported_at ? new Date(r.reported_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p className="font-semibold">Findings</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{r.findings}</p>
                    <p className="font-semibold mt-2">Impression</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{r.impression}</p>
                    {r.image_url && (
                      <a href={r.image_url} target="_blank" rel="noreferrer" className="text-primary-500 underline text-sm mt-1 inline-block">
                        View image
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New order dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Imaging Order</DialogTitle></DialogHeader>
          <form onSubmit={handleNewOrder} className="space-y-3">
            <div>
              <label className="text-sm font-semibold">Patient</label>
              <HospitalPatientSelectLink hospitalId={hospital?.id} value={orderForm.patient_id} onChange={(v: string) => setOrderForm({ ...orderForm, patient_id: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">Modality</label>
                <select className="input w-full" value={orderForm.modality} onChange={(e) => setOrderForm({ ...orderForm, modality: e.target.value })}>
                  {MODALITIES.map((m) => <option key={m} value={m}>{MODALITY_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">Priority</label>
                <select className="input w-full" value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Body part</label>
              <input className="input w-full" value={orderForm.body_part} onChange={(e) => setOrderForm({ ...orderForm, body_part: e.target.value })} placeholder="e.g. Chest, Left knee, Abdomen" />
            </div>
            <div>
              <label className="text-sm font-semibold">Clinical indication</label>
              <textarea className="input w-full" rows={2} value={orderForm.clinical_indication} onChange={(e) => setOrderForm({ ...orderForm, clinical_indication: e.target.value })} placeholder="Why is this scan needed?" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowNewOrder(false)} className="btn-outline px-4 py-2 rounded-lg">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-1">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Create Order
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Radiology Report {reportingOrder ? `— ${MODALITY_LABELS[reportingOrder.modality] || reportingOrder.modality} (${reportingOrder.body_part})` : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveReport} className="space-y-3">
            <div>
              <label className="text-sm font-semibold">Findings</label>
              <textarea className="input w-full" rows={4} value={resultForm.findings} onChange={(e) => setResultForm({ ...resultForm, findings: e.target.value })} placeholder="Describe what the images show…" />
            </div>
            <div>
              <label className="text-sm font-semibold">Impression</label>
              <textarea className="input w-full" rows={3} value={resultForm.impression} onChange={(e) => setResultForm({ ...resultForm, impression: e.target.value })} placeholder="Clinical impression / diagnosis…" />
            </div>
            <div>
              <label className="text-sm font-semibold">Image URL (optional)</label>
              <input className="input w-full" value={resultForm.image_url} onChange={(e) => setResultForm({ ...resultForm, image_url: e.target.value })} placeholder="https://…" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowReport(false)} className="btn-outline px-4 py-2 rounded-lg">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-1">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Save Report
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * Lightweight patient picker that reuses the hospital patient list endpoint.
 * HospitalPatientSelect is a full component; this inline fallback loads the
 * institution's patient registry so the order form works in any institution.
 */
function HospitalPatientSelectLink({ hospitalId, value, onChange }: { hospitalId?: string; value: string; onChange: (v: string) => void }) {
  const [patients, setPatients] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => {
      if (!hospitalId) return;
      try {
        const { data } = await (supabase.from("institution_patient_registry" as any) as any)
          .select("linked_patient_id").eq("institution_id", hospitalId).limit(200);
        const ids = [...new Set((data || []).map((r: any) => r.linked_patient_id).filter(Boolean))];
        if (ids.length === 0) { setPatients([]); return; }
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
        setPatients(profs || []);
      } catch { /* non-fatal */ }
    })();
  }, [hospitalId]);
  return (
    <select className="input w-full" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select patient…</option>
      {patients.map((p: any) => (
        <option key={p.id} value={p.id}>{`${p.first_name || ""} ${p.last_name || ""}`.trim() || p.id.slice(0, 8)}</option>
      ))}
    </select>
  );
}

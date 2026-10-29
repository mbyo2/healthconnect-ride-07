import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TestTube, Clock, CheckCircle2, AlertCircle, Printer, Timer, RefreshCw, Plus, Loader2 } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { HospitalPatientSelect } from "@/components/hospital/HospitalPatientSelect";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchInstitutionTariffs, resolveTariffPrice } from "@/components/pricing/TariffAndPriceManager";
import { dispatchNotification } from "@/hooks/useNotifications";

const getStatusPill = (status: string, order?: any) => {
  // A completed result with no verifier is NOT a released report — it is
  // sitting in the pathologist queue. Label it honestly.
  if ((status === "completed" || status === "report_ready") && order && !order.verified_by) {
    return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Awaiting Verification</span>;
  }
  switch (status) {
    case "completed":
    case "report_ready":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Report Ready</span>;
    case "processing":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Processing</span>;
    case "sample_collected":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-primary-400">Sample Collected</span>;
    case "cancelled":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Cancelled</span>;
    default:
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-purple-500">Pending Collection</span>;
  }
};

export const HospitalLab = ({ hospital }: { hospital: any }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState<any>(null);
  const [resultInput, setResultInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderForm, setOrderForm] = useState({
    patient_id: "",
    patient_name: "",
    test_type: "Complete Blood Count (CBC)",
    test_category: "Hematology",
    priority: "routine",
    sample_type: "Blood",
    order_source: "electronic",
    external_referrer_name: "",
    external_referrer_facility: "",
  });

  const { data: labOrders, loading, error, refresh } = useHospitalModule<any>(
    "lab_tests", "lab_id", hospital?.id, { orderBy: "created_at", ascending: false }
  );
  const { names, nameFor } = usePatientNames([
    ...labOrders.map((o) => o.patient_id),
    ...labOrders.map((o) => o.entered_by),
    ...labOrders.map((o) => o.ordered_by),
  ]);
  const filtered = filter === "all" ? labOrders : labOrders.filter((o) => o.status === filter);

  const stats = {
    pending: labOrders.filter((o) => ["pending", "ordered"].includes(o.status)).length,
    processing: labOrders.filter((o) => ["sample_collected", "processing"].includes(o.status)).length,
    completed: labOrders.filter((o) => ["completed", "report_ready"].includes(o.status)).length,
    urgent: labOrders.filter((o) => o.priority && o.priority !== "routine").length,
  };

  const handleOrderLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.test_type) return;
    if (!orderForm.patient_id) {
      toast.error("Please select a patient for this lab order");
      return;
    }
    if (orderForm.order_source === "external_referral" && !orderForm.external_referrer_name.trim()) {
      toast.error("Enter the referring clinician's name for an external referral");
      return;
    }
    setIsSubmitting(true);
    try {
      const testNum = `LAB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      // Resolve price from the institution's tariff book (never hardcode).
      // Falls back to 200 only when the institution has no lab tariffs at all.
      let price = 200;
      try {
        const tariffs = await fetchInstitutionTariffs(hospital.id);
        price = resolveTariffPrice(tariffs, 'lab', orderForm.test_type, 200);
      } catch { /* tariff lookup is best-effort */ }
      const isExternal = orderForm.order_source === "external_referral";
      const { error: err } = await (supabase.from("lab_tests" as any) as any).insert({
        lab_id: hospital.id,
        institution_id: hospital.id,
        patient_id: orderForm.patient_id,
        // Attribution is split: ordered_by is the ordering clinician (NULL
        // for an outside referral, whose name is recorded as text instead);
        // entered_by is the person typing — also forced server-side.
        ordered_by: isExternal ? null : user?.id,
        entered_by: user?.id,
        order_source: orderForm.order_source,
        external_referrer_name: orderForm.order_source !== "electronic"
          ? (orderForm.external_referrer_name.trim() || null) : null,
        external_referrer_facility: orderForm.order_source !== "electronic"
          ? (orderForm.external_referrer_facility.trim() || null) : null,
        test_number: testNum,
        test_type: orderForm.test_type,
        test_category: orderForm.test_category,
        priority: orderForm.priority,
        sample_type: orderForm.sample_type,
        status: "pending",
        payment_status: "pending",
        price,
      });
      if (err) throw err;
      toast.success(`Lab Test ${testNum} ordered`);
      setShowOrderDialog(false);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to order lab test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitResult = async () => {
    if (!showResultDialog || !resultInput.trim()) return;
    setIsSubmitting(true);
    try {
      const order = showResultDialog;
      // Results are saved UNVERIFIED (mirrors LabManagement.submitResult):
      // lab_tests is the source of truth; the patient only sees values after
      // a pathologist verifies. Nothing is "released" from this dialog.
      const { error: err } = await (supabase.from("lab_tests" as any) as any)
        .update({
          status: "completed",
          result_summary: resultInput,
          results_date: new Date().toISOString(),
          performed_by: user?.id ?? null,
        })
        .eq("id", order.id);
      if (err) throw err;

      const patientName = nameFor(order.patient_id) || "Unknown Patient";
      const testName = order.test_type || "Lab Test";
      const isUrgent = ["stat", "critical", "urgent"].includes((order.priority || "").toLowerCase());

      // Mirror row for the patient-facing results list (unverified).
      try {
        await (supabase.from("lab_results" as any) as any).insert({
          request_id: order.id,
          test_id: order.id,
          patient_id: order.patient_id,
          technician_id: user?.id ?? null,
          test_name: testName,
          test_date: new Date().toISOString().split("T")[0],
          result_value: resultInput,
          is_abnormal: false,
          notes: "Pending pathologist review",
        });
      } catch (e) { console.error("lab_results push failed", e); }

      // Pathologist verification queue row.
      try {
        await (supabase.from("pathologist_reviews" as any) as any).insert({
          institution_id: hospital.id,
          patient_name: patientName,
          test_name: testName,
          result_value: resultInput,
          lab_tech_id: user?.id ?? null,
          lab_tech_name: user?.email ?? null,
          status: isUrgent ? "urgent_review" : "pending_review",
        });
      } catch (e) { console.error("pathologist queue push failed", e); }

      // Notify the ordering doctor that a result was entered (in-app).
      if (order.ordered_by && order.ordered_by !== user?.id) {
        dispatchNotification({
          userId: order.ordered_by,
          title: "Lab result entered",
          message: `${testName} result entered for ${patientName} — awaiting pathologist verification.`,
          category: "lab",
          link: "/lab-management",
          channels: [],
        });
      }

      toast.success("Result submitted for verification — a pathologist will sign it off before the patient sees it");
      setShowResultDialog(null);
      setResultInput("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit result");
    } finally {
      setIsSubmitting(false);
    }
  };

  const advance = async (order: any, status: string) => {
    try {
      const patch: any = { status };
      if (status === "sample_collected") patch.sample_collected_at = new Date().toISOString();
      if (status === "completed") patch.results_date = new Date().toISOString();
      const { error: err } = await (supabase.from("lab_tests" as any) as any).update(patch).eq("id", order.id);
      if (err) throw err;
      toast.success(`${order.test_number} status updated`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update lab order");
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-canvas-silk pb-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary-500" />
            Laboratory Information Management System (LIMS)
          </h3>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
            Sample lifecycle tracking, reflex test rules, and result dispatch
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-md bg-canvas-mist dark:bg-slate-800 font-bold text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowOrderDialog(true)}
            className="px-3.5 py-1.5 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Order Lab Test
          </button>
        </div>
      </div>

      {/* Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Awaiting Sample", value: stats.pending, color: "#a25ddc", icon: <Clock className="h-5 w-5" /> },
          { label: "In Processing", value: stats.processing, color: "#fdab3d", icon: <TestTube className="h-5 w-5" /> },
          { label: "Reports Ready", value: stats.completed, color: "#00c875", icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: "STAT / Urgent", value: stats.urgent, color: "#e2445c", icon: <AlertCircle className="h-5 w-5" /> },
        ].map((card) => (
          <div key={card.label} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk shadow-xs text-center">
            <div style={{ color: card.color }} className="flex justify-center mb-1">{card.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold uppercase">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Chips — Frappe list-view style with live counts */}
      <div className="flex flex-wrap gap-1.5">
        {["all", "pending", "sample_collected", "processing", "completed"].map((s) => {
          const count = s === "all" ? labOrders.length : labOrders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filter === s
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {s === "all" ? "All Orders" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* LIMS Table */}
      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={TestTube} title="Could not load lab orders" description={error} actionLabel="Retry" onAction={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TestTube}
          title="No lab orders"
          description="Order lab tests from OPD/IPD or directly from this board."
          actionLabel="Order First Lab Test"
          onAction={() => setShowOrderDialog(true)}
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-canvas-silk bg-canvas text-xs font-semibold uppercase text-graphite-500 dark:text-slate-400">
                <th className="py-2.5 px-4">Test # / Type</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Sample</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Result Summary</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-silk">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{order.test_number}</div>
                    <div className="text-xs text-graphite-500 dark:text-slate-400">{order.test_type}</div>
                    {(order.order_source === "external_referral" || (order.entered_by && order.ordered_by && order.entered_by !== order.ordered_by) || (order.order_source && order.order_source !== "electronic")) && (
                      <div className="text-xs text-graphite-400">
                        {order.order_source === "external_referral" ? (
                          <>External referral{order.external_referrer_name ? ` — ${order.external_referrer_name}` : ""}{order.entered_by && names[order.entered_by] ? ` · entered by ${names[order.entered_by]}` : ""}</>
                        ) : (
                          <>{order.ordered_by && names[order.ordered_by] ? `Ordered by ${names[order.ordered_by]} · ` : ""}entered by {order.entered_by && names[order.entered_by] ? names[order.entered_by] : "staff"}{order.order_source && order.order_source !== "electronic" ? ` (${order.order_source.replace("_", " ")})` : ""}</>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-primary-500">{nameFor(order.patient_id) || "Inpatient"}</td>
                  <td className="py-3 px-3 text-center">{getStatusPill(order.status, order)}</td>
                  <td className="py-3 px-3 text-slate-500">{order.sample_type || "—"}</td>
                  <td className="py-3 px-3">
                    {order.priority && order.priority !== "routine" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-error-500">{order.priority.toUpperCase()}</span>
                    ) : (
                      <span className="text-graphite-500 dark:text-slate-400">Routine</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">{order.result_summary || "—"}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {["pending", "ordered"].includes(order.status) && (
                        <button
                          onClick={() => advance(order, "sample_collected")}
                          className="px-2 py-1 rounded text-xs font-bold bg-primary-400 text-white"
                        >
                          Collect
                        </button>
                      )}
                      {order.status === "sample_collected" && (
                        <button
                          onClick={() => advance(order, "processing")}
                          className="px-2 py-1 rounded text-xs font-bold bg-warning-500 text-white"
                        >
                          Process
                        </button>
                      )}
                      {["processing", "sample_collected"].includes(order.status) && (
                        <button
                          onClick={() => { setShowResultDialog(order); setResultInput(order.result_summary || ""); }}
                          className="px-2 py-1 rounded text-xs font-bold bg-primary-500 text-white"
                        >
                          Enter Result
                        </button>
                      )}
                      {["completed", "report_ready"].includes(order.status) && (
                        <button
                          onClick={() => window.print()}
                          className="px-2 py-1 rounded text-xs font-bold bg-success-500 text-white flex items-center gap-0.5"
                        >
                          <Printer className="h-3 w-3" /> Print
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

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-semibold text-base">Order Laboratory Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrderLab} className="space-y-3 py-2 text-xs">
            <HospitalPatientSelect
              institutionId={hospital?.id}
              value={orderForm.patient_id}
              onChange={(id) => setOrderForm({ ...orderForm, patient_id: id })}
              label="Patient *"
            />
            <div>
              <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Test Name *</label>
              <input
                value={orderForm.test_type}
                onChange={(e) => setOrderForm({ ...orderForm, test_type: e.target.value })}
                placeholder="e.g. Full Blood Count / Lipid Profile"
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Category</label>
                <input
                  value={orderForm.test_category}
                  onChange={(e) => setOrderForm({ ...orderForm, test_category: e.target.value })}
                  placeholder="e.g. Biochemistry"
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Sample Type</label>
                <input
                  value={orderForm.sample_type}
                  onChange={(e) => setOrderForm({ ...orderForm, sample_type: e.target.value })}
                  placeholder="e.g. Blood, Urine"
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Priority</label>
              <select
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                value={orderForm.priority}
                onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT (Immediate)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">How did this order arrive?</label>
              <select
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                value={orderForm.order_source}
                onChange={(e) => setOrderForm({ ...orderForm, order_source: e.target.value })}
              >
                <option value="electronic">Electronic — I am ordering it</option>
                <option value="paper_form">Paper request form</option>
                <option value="verbal">Verbal / phone order</option>
                <option value="external_referral">External referral (outside clinician)</option>
              </select>
            </div>
            {orderForm.order_source !== "electronic" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">
                    Referring clinician{orderForm.order_source === "external_referral" ? " *" : ""}
                  </label>
                  <input
                    value={orderForm.external_referrer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, external_referrer_name: e.target.value })}
                    placeholder="Name on the form"
                    className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Referring facility</label>
                  <input
                    value={orderForm.external_referrer_facility}
                    onChange={(e) => setOrderForm({ ...orderForm, external_referrer_facility: e.target.value })}
                    placeholder="e.g. Outside clinic"
                    className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <button type="button" onClick={() => setShowOrderDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold">
                {isSubmitting ? "Ordering..." : "Order Lab Test"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enter Result Dialog */}
      <Dialog open={!!showResultDialog} onOpenChange={(o) => !o && setShowResultDialog(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-semibold text-base">Enter Result — {showResultDialog?.test_type}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs">
            <label className="font-semibold text-graphite-500 dark:text-slate-400 uppercase">Result Summary *</label>
            <textarea
              className="w-full mt-1 h-24 p-2 rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-medium"
              placeholder="e.g. Haemoglobin 14.2 g/dL — Within Normal Range"
              value={resultInput}
              onChange={(e) => setResultInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <button onClick={() => setShowResultDialog(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
            <button
              onClick={submitResult}
              disabled={!resultInput.trim() || isSubmitting}
              className="px-4 py-1.5 rounded-md bg-success-500 text-white text-xs font-bold"
            >
              {isSubmitting ? "Submitting..." : "Submit for Verification"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HospitalLab;

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TestTube, Clock, CheckCircle2, AlertCircle, Printer, Timer, RefreshCw, Plus, Loader2 } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getStatusPill = (status: string) => {
  switch (status) {
    case "completed":
    case "report_ready":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Report Ready</span>;
    case "processing":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Processing</span>;
    case "sample_collected":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Sample Collected</span>;
    case "cancelled":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Cancelled</span>;
    default:
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#a25ddc]">Pending Collection</span>;
  }
};

export const HospitalLab = ({ hospital }: { hospital: any }) => {
  const [filter, setFilter] = useState("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState<any>(null);
  const [resultInput, setResultInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderForm, setOrderForm] = useState({
    patient_name: "",
    test_type: "Complete Blood Count (CBC)",
    test_category: "Hematology",
    priority: "routine",
    sample_type: "Blood",
  });

  const { data: labOrders, loading, error, refresh } = useHospitalModule<any>(
    "lab_tests", "lab_id", hospital?.id, { orderBy: "created_at", ascending: false }
  );
  const { nameFor } = usePatientNames(labOrders.map((o) => o.patient_id));

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
    setIsSubmitting(true);
    try {
      const testNum = `LAB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const { error: err } = await (supabase.from("lab_tests" as any) as any).insert({
        lab_id: hospital.id,
        test_number: testNum,
        test_type: orderForm.test_type,
        test_category: orderForm.test_category,
        priority: orderForm.priority,
        sample_type: orderForm.sample_type,
        status: "pending",
        payment_status: "pending",
        price: 200,
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
      const { error: err } = await (supabase.from("lab_tests" as any) as any)
        .update({ status: "completed", result_summary: resultInput, results_date: new Date().toISOString() })
        .eq("id", showResultDialog.id);
      if (err) throw err;
      toast.success("Lab result submitted and released");
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
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-[#e6e9ef] pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <TestTube className="h-5 w-5 text-[#0073ea]" />
            Laboratory Information Management System (LIMS)
          </h3>
          <p className="text-xs text-[#676879] font-medium">
            Sample lifecycle tracking, reflex test rules, and result dispatch
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-md bg-[#f0f2f7] font-bold text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowOrderDialog(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs flex items-center gap-1"
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
          <div key={card.label} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
            <div style={{ color: card.color }} className="flex justify-center mb-1">{card.icon}</div>
            <div className="text-2xl font-black font-mono" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[10px] text-[#676879] font-bold uppercase">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] rounded-xl overflow-x-auto">
        {["all", "pending", "sample_collected", "processing", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-extrabold whitespace-nowrap transition-all ${
              filter === s ? "bg-[#0073ea] text-white shadow-xs" : "text-[#676879] hover:bg-[#f0f2f7]"
            }`}
          >
            {s === "all" ? "All Orders" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
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
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Test # / Type</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Sample</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Result Summary</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">{order.test_number}</div>
                    <div className="text-[10px] text-[#676879]">{order.test_type}</div>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#0073ea]">{nameFor(order.patient_id) || "Inpatient"}</td>
                  <td className="py-3 px-3 text-center">{getStatusPill(order.status)}</td>
                  <td className="py-3 px-3 text-slate-500">{order.sample_type || "—"}</td>
                  <td className="py-3 px-3">
                    {order.priority && order.priority !== "routine" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#e2445c]">{order.priority.toUpperCase()}</span>
                    ) : (
                      <span className="text-[#676879]">Routine</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">{order.result_summary || "—"}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {["pending", "ordered"].includes(order.status) && (
                        <button
                          onClick={() => advance(order, "sample_collected")}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-[#579bfc] text-white"
                        >
                          Collect
                        </button>
                      )}
                      {order.status === "sample_collected" && (
                        <button
                          onClick={() => advance(order, "processing")}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-[#fdab3d] text-white"
                        >
                          Process
                        </button>
                      )}
                      {["processing", "sample_collected"].includes(order.status) && (
                        <button
                          onClick={() => { setShowResultDialog(order); setResultInput(order.result_summary || ""); }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-[#0073ea] text-white"
                        >
                          Enter Result
                        </button>
                      )}
                      {["completed", "report_ready"].includes(order.status) && (
                        <button
                          onClick={() => window.print()}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-[#00c875] text-white flex items-center gap-0.5"
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
        <DialogContent className="sm:max-w-[425px] bg-white border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Order Laboratory Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrderLab} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Test Name *</label>
              <input
                value={orderForm.test_type}
                onChange={(e) => setOrderForm({ ...orderForm, test_type: e.target.value })}
                placeholder="e.g. Full Blood Count / Lipid Profile"
                className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Category</label>
                <input
                  value={orderForm.test_category}
                  onChange={(e) => setOrderForm({ ...orderForm, test_category: e.target.value })}
                  placeholder="e.g. Biochemistry"
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]"
                />
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Sample Type</label>
                <input
                  value={orderForm.sample_type}
                  onChange={(e) => setOrderForm({ ...orderForm, sample_type: e.target.value })}
                  placeholder="e.g. Blood, Urine"
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]"
                />
              </div>
            </div>
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Priority</label>
              <select
                className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                value={orderForm.priority}
                onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT (Immediate)</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <button type="button" onClick={() => setShowOrderDialog(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold">
                {isSubmitting ? "Ordering..." : "Order Lab Test"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enter Result Dialog */}
      <Dialog open={!!showResultDialog} onOpenChange={(o) => !o && setShowResultDialog(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Enter Result — {showResultDialog?.test_type}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs">
            <label className="font-extrabold text-[#676879] uppercase">Result Summary *</label>
            <textarea
              className="w-full mt-1 h-24 p-2 rounded-md border border-[#c3c6d4] text-xs font-medium"
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
              className="px-4 py-1.5 rounded-md bg-[#00c875] text-white text-xs font-bold"
            >
              {isSubmitting ? "Releasing..." : "Submit & Release Result"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HospitalLab;

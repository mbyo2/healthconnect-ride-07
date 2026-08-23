import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image, Clock, CheckCircle2, FileText, Plus, Loader2, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getStatusPill = (status: string) => {
  switch (status) {
    case "reported": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Reported ✓</span>;
    case "in_progress": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">In Progress</span>;
    case "report_pending": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#a25ddc]">Report Pending</span>;
    case "scheduled": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Scheduled</span>;
    case "cancelled": return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Cancelled</span>;
    default: return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#676879]">Requested</span>;
  }
};

export const RadiologyImaging = ({ hospital }: { hospital: any }) => {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ patient_name: "", exam_type: "X-Ray", exam_name: "", body_part: "", priority: "routine", notes: "" });

  const { data: orders, loading, error, refresh } = useHospitalModule<any>("radiology_requests", "hospital_id", hospital?.id, { orderBy: "request_date", ascending: false });
  const { nameFor } = usePatientNames(orders.map((o) => o.patient_id));

  const modalities = Array.from(new Set(orders.map((o) => o.exam_type).filter(Boolean))).map((m) => ({
    name: m,
    queue: orders.filter((o) => o.exam_type === m && !["reported", "completed", "cancelled"].includes(o.status)).length,
    total: orders.filter((o) => o.exam_type === m).length,
  }));

  const pending = orders.filter((o) => !["reported", "cancelled"].includes(o.status)).length;
  const reported = orders.filter((o) => o.status === "reported").length;

  const handleNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.exam_type) return;
    setIsSubmitting(true);
    try {
      const reqNum = `RAD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error: err } = await (supabase.from("radiology_requests" as any) as any).insert({
        hospital_id: hospital.id, request_number: reqNum, exam_type: form.exam_type,
        exam_name: form.exam_name || form.exam_type, body_part: form.body_part,
        priority: form.priority, notes: form.notes, status: "requested",
        request_date: new Date().toISOString().split("T")[0],
      });
      if (err) throw err;
      toast.success(`Imaging order ${reqNum} created`);
      setShowNewOrder(false);
      setForm({ patient_name: "", exam_type: "X-Ray", exam_name: "", body_part: "", priority: "routine", notes: "" });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create imaging order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (row: any, status: string) => {
    try {
      const { error: err } = await (supabase.from("radiology_requests" as any) as any)
        .update({ status, ...(status === "reported" ? { report_date: new Date().toISOString() } : {}) })
        .eq("id", row.id);
      if (err) throw err;
      toast.success(`Study → ${status.replace("_", " ")}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update study");
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-[#e6e9ef] pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Image className="h-5 w-5 text-[#0073ea]" />
            Radiology & Medical Imaging WorkOS
          </h3>
          <p className="text-xs text-[#676879] font-medium">Order book, modality queue, scheduling and radiologist report dispatch</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-1.5 rounded-md bg-[#f0f2f7] font-bold text-xs flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowNewOrder(true)} className="px-3.5 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs flex items-center gap-1">
            <Plus className="h-4 w-4" /> New Imaging Order
          </button>
        </div>
      </div>

      {/* Telemetry Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
          <Image className="h-5 w-5 mx-auto text-[#0073ea] mb-1" />
          <div className="text-2xl font-black font-mono text-[#0073ea]">{orders.length}</div>
          <div className="text-[10px] text-[#676879] font-bold uppercase">Total Studies</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
          <Clock className="h-5 w-5 mx-auto text-[#fdab3d] mb-1" />
          <div className="text-2xl font-black font-mono text-[#fdab3d]">{pending}</div>
          <div className="text-[10px] text-[#676879] font-bold uppercase">In Queue</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-[#00c875] mb-1" />
          <div className="text-2xl font-black font-mono text-[#00c875]">{reported}</div>
          <div className="text-[10px] text-[#676879] font-bold uppercase">Reports Signed</div>
        </div>
      </div>

      {/* Modality Queue Pills */}
      {modalities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {modalities.map((m) => (
            <span key={String(m.name)} className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#e5f0ff] text-[#0073ea]">
              {String(m.name)}: {m.queue} in queue / {m.total} total
            </span>
          ))}
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Image} title="Could not load imaging orders" description={error} actionLabel="Retry" onAction={refresh} />
      ) : orders.length === 0 ? (
        <EmptyState icon={Image} title="No imaging orders yet" description="Radiology requests from OPD, IPD or theatre appear here." actionLabel="Create New Order" onAction={() => setShowNewOrder(true)} />
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                <th className="py-2.5 px-4">Order # / Modality</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Exam / Body Part</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9ef]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">{o.request_number}</div>
                    <div className="text-[10px] text-[#0073ea] font-bold">{o.exam_type}</div>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#0073ea]">{nameFor(o.patient_id) || "Patient"}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold">{o.exam_name || o.exam_type}</div>
                    <div className="text-[10px] text-[#676879]">{o.body_part}</div>
                  </td>
                  <td className="py-3 px-3">
                    {o.priority && o.priority !== "routine" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#e2445c]">{o.priority.toUpperCase()}</span>
                    ) : (
                      <span className="text-[#676879]">Routine</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">{getStatusPill(o.status)}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {["requested", "scheduled"].includes(o.status) && (
                        <button onClick={() => setStatus(o, "in_progress")} className="px-2 py-1 rounded text-[10px] font-bold bg-[#fdab3d] text-white">Start Scan</button>
                      )}
                      {o.status === "in_progress" && (
                        <button onClick={() => setStatus(o, "report_pending")} className="px-2 py-1 rounded text-[10px] font-bold bg-[#a25ddc] text-white">Finish Scan</button>
                      )}
                      {o.status === "report_pending" && (
                        <button onClick={() => setStatus(o, "reported")} className="px-2 py-1 rounded text-[10px] font-bold bg-[#00c875] text-white flex items-center gap-0.5">
                          <FileText className="h-3 w-3" /> Sign Report
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

      {/* New Order Dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-[#e6e9ef]">
          <DialogHeader><DialogTitle className="font-extrabold text-base">New Radiology Imaging Order</DialogTitle></DialogHeader>
          <form onSubmit={handleNewOrder} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Modality *</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })}>
                  {["X-Ray", "CT Scan", "MRI", "Ultrasound", "Mammography", "DEXA Scan", "PET Scan", "Fluoroscopy", "Echocardiogram", "ECG"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Priority</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Body Part / Region</label>
              <input value={form.body_part} onChange={(e) => setForm({ ...form, body_part: e.target.value })} placeholder="e.g. Chest, Abdomen, Right Knee" className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]" />
            </div>
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Clinical Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Clinical indication or history" className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowNewOrder(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold">{isSubmitting ? "Creating..." : "Create Imaging Order"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RadiologyImaging;

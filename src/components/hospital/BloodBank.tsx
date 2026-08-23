import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Droplets, AlertTriangle, Plus, Loader2, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const getStockPill = (status: string) => {
  if (status === "adequate") return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">Adequate</span>;
  if (status === "low") return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#fdab3d]">Low Stock</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#e2445c]">Critical</span>;
};

const getRequestPill = (urgency: string) => {
  if (urgency === "emergency") return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Emergency</span>;
  if (urgency === "urgent") return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Urgent</span>;
  return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Routine</span>;
};

export const BloodBank = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "requests">("inventory");
  const [showAddStock, setShowAddStock] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockForm, setStockForm] = useState({ blood_type: "O+", component_type: "whole_blood", units_available: 1, expiry_date: "" });
  const [reqForm, setReqForm] = useState({ blood_type: "O+", component_type: "prbc", units_required: 1, urgency: "routine" });

  const { data: inventory, loading, error, refresh } = useHospitalModule<any>("blood_bank_inventory", "hospital_id", hospital?.id, { orderBy: "blood_type", ascending: true });
  const { data: requests, loading: reqLoading, refresh: refreshRequests } = useHospitalModule<any>("blood_bank_requests", "hospital_id", hospital?.id, { orderBy: "request_date", ascending: false });
  const { nameFor } = usePatientNames(requests.map((r) => r.patient_id));

  const byType = BLOOD_TYPES.map((type) => {
    const rows = inventory.filter((i) => i.blood_type === type);
    const unitsFor = (comp: string) => rows.filter((r) => (r.component_type || "").toLowerCase() === comp).reduce((s, r) => s + (r.units_available || 0), 0);
    const total = rows.reduce((s, r) => s + (r.units_available || 0), 0);
    return { type, whole: unitsFor("whole_blood") || unitsFor("whole blood"), prbc: unitsFor("prbc"), ffp: unitsFor("ffp"), platelets: unitsFor("platelets"), total, status: total === 0 ? "critical" : total < 5 ? "low" : "adequate", hasRows: rows.length > 0 };
  });

  const tracked = byType.filter((t) => t.hasRows);
  const criticalCount = tracked.filter((t) => t.status === "critical").length;

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("blood_bank_inventory" as any) as any).insert({ hospital_id: hospital.id, ...stockForm, units_available: Number(stockForm.units_available), expiry_date: stockForm.expiry_date || null });
      if (err) throw err;
      toast.success("Blood stock added");
      setShowAddStock(false);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to add stock"); }
    finally { setIsSubmitting(false); }
  };

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const reqNum = `BBR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error: err } = await (supabase.from("blood_bank_requests" as any) as any).insert({ hospital_id: hospital.id, request_number: reqNum, ...reqForm, units_required: Number(reqForm.units_required), status: "pending", request_date: new Date().toISOString() });
      if (err) throw err;
      toast.success(`Blood request ${reqNum} created`);
      setShowNewRequest(false);
      refreshRequests();
    } catch (e: any) { toast.error(e?.message || "Failed to create request"); }
    finally { setIsSubmitting(false); }
  };

  const updateRequest = async (row: any, status: string) => {
    try {
      const { error: err } = await (supabase.from("blood_bank_requests" as any) as any).update({ status, ...(status === "issued" ? { issued_date: new Date().toISOString() } : {}) }).eq("id", row.id);
      if (err) throw err;
      toast.success(`Request ${row.request_number || ""} ${status}`);
      refreshRequests();
    } catch (e: any) { toast.error(e?.message || "Failed to update request"); }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-[#e6e9ef] pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-[#e2445c]" />
            Blood Bank & Transfusion Management
          </h3>
          <p className="text-xs text-[#676879] font-medium">Live blood component inventory and transfusion request tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refresh(); refreshRequests(); }} className="px-3 py-1.5 rounded-md bg-[#f0f2f7] font-bold text-xs flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowAddStock(true)} className="px-3 py-1.5 rounded-md border border-[#c3c6d4] font-bold text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Stock
          </button>
          <button onClick={() => setShowNewRequest(true)} className="px-3.5 py-1.5 rounded-md bg-[#e2445c] hover:bg-[#c73652] text-white font-extrabold text-xs flex items-center gap-1">
            <Plus className="h-4 w-4" /> New Request
          </button>
        </div>
      </div>

      {criticalCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#e2445c]/10 border border-[#e2445c]/30 text-[#e2445c] font-bold text-xs">
          <AlertTriangle className="h-4 w-4" /> {criticalCount} blood group(s) are critically out of stock.
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] rounded-xl">
        {(["inventory", "requests"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold capitalize transition-all ${activeTab === tab ? "bg-[#0073ea] text-white shadow-xs" : "text-[#676879] hover:bg-[#f0f2f7]"}`}
          >
            {tab === "inventory" ? `Blood Inventory (${tracked.length})` : `Transfusion Requests (${requests.length})`}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        loading ? <ListSkeleton count={4} variant="compact" /> :
        error ? <EmptyState icon={Droplets} title="Could not load blood stock" description={error} actionLabel="Retry" onAction={refresh} /> :
        tracked.length === 0 ? <EmptyState icon={Droplets} title="No blood stock recorded" description="Add blood component units to track live availability." /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-2.5 px-4">Blood Type</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Whole Blood</th>
                  <th className="py-2.5 px-3 text-right">PRBC</th>
                  <th className="py-2.5 px-3 text-right">FFP</th>
                  <th className="py-2.5 px-3 text-right">Platelets</th>
                  <th className="py-2.5 px-3 text-right font-extrabold">Total Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef]">
                {tracked.map((t) => (
                  <tr key={t.type} className="hover:bg-[#f0f2f7] transition-colors">
                    <td className="py-3 px-4 text-2xl font-black font-mono text-[#e2445c]">{t.type}</td>
                    <td className="py-3 px-3 text-center">{getStockPill(t.status)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.whole}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.prbc}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.ffp}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.platelets}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-[#0073ea]">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "requests" && (
        reqLoading ? <ListSkeleton count={3} variant="row" /> :
        requests.length === 0 ? <EmptyState icon={Droplets} title="No transfusion requests" description="Blood requests from wards and theatre appear here." /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-2.5 px-4">Request #</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Blood Type</th>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3 text-center">Urgency</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef]">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#f0f2f7] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold">{r.request_number}</td>
                    <td className="py-3 px-3 font-bold text-[#0073ea]">{nameFor(r.patient_id) || "Patient"}</td>
                    <td className="py-3 px-3 font-black text-[#e2445c] text-base">{r.blood_type}</td>
                    <td className="py-3 px-3 uppercase text-[#676879]">{r.component_type}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{r.units_required}</td>
                    <td className="py-3 px-3 text-center">{getRequestPill(r.urgency)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white ${r.status === "issued" ? "bg-[#00c875]" : r.status === "crossmatch_done" ? "bg-[#579bfc]" : "bg-[#fdab3d]"}`}>
                        {(r.status || "pending").replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {r.status === "pending" && (
                          <button onClick={() => updateRequest(r, "crossmatch_done")} className="px-2 py-1 rounded text-[10px] font-bold bg-[#579bfc] text-white">Crossmatch</button>
                        )}
                        {r.status !== "issued" && (
                          <button onClick={() => updateRequest(r, "issued")} className="px-2 py-1 rounded text-[10px] font-bold bg-[#00c875] text-white">Issue</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Add Stock Dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent className="sm:max-w-[380px] bg-white border border-[#e6e9ef]">
          <DialogHeader><DialogTitle className="font-extrabold text-base">Add Blood Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={stockForm.blood_type} onChange={(e) => setStockForm({ ...stockForm, blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Component</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={stockForm.component_type} onChange={(e) => setStockForm({ ...stockForm, component_type: e.target.value })}>
                  <option value="whole_blood">Whole Blood</option>
                  <option value="prbc">PRBC</option>
                  <option value="ffp">FFP</option>
                  <option value="platelets">Platelets</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Units</label>
                <input type="number" className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={stockForm.units_available} onChange={(e) => setStockForm({ ...stockForm, units_available: Number(e.target.value) })} />
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Expiry Date</label>
                <input type="date" className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]" value={stockForm.expiry_date} onChange={(e) => setStockForm({ ...stockForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddStock(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold">{isSubmitting ? "Adding..." : "Add Stock"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="sm:max-w-[380px] bg-white border border-[#e6e9ef]">
          <DialogHeader><DialogTitle className="font-extrabold text-base">New Blood Transfusion Request</DialogTitle></DialogHeader>
          <form onSubmit={handleNewRequest} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={reqForm.blood_type} onChange={(e) => setReqForm({ ...reqForm, blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Component</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={reqForm.component_type} onChange={(e) => setReqForm({ ...reqForm, component_type: e.target.value })}>
                  <option value="prbc">PRBC</option>
                  <option value="ffp">FFP</option>
                  <option value="platelets">Platelets</option>
                  <option value="whole_blood">Whole Blood</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Units Required</label>
                <input type="number" className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={reqForm.units_required} onChange={(e) => setReqForm({ ...reqForm, units_required: Number(e.target.value) })} />
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Urgency</label>
                <select className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold" value={reqForm.urgency} onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowNewRequest(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-[#e2445c] text-white text-xs font-bold">{isSubmitting ? "Submitting..." : "Submit Request"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BloodBank;

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
  if (status === "adequate") return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-success-500">Adequate</span>;
  if (status === "low") return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-warning-500">Low Stock</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-error-500">Critical</span>;
};

const getRequestPill = (urgency: string) => {
  if (urgency === "emergency") return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Emergency</span>;
  if (urgency === "urgent") return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Urgent</span>;
  return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-primary-400">Routine</span>;
};

export const BloodBank = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "requests" | "donors" | "donations" | "compatibility" | "audit">("inventory");
  const [showAddStock, setShowAddStock] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [showAddDonation, setShowAddDonation] = useState(false);
  const [showCompatTest, setShowCompatTest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockForm, setStockForm] = useState({ blood_type: "O+", component_type: "whole_blood", units_available: 1, expiry_date: "" });
  const [reqForm, setReqForm] = useState({ patient_id: "", blood_type: "O+", component_type: "prbc", units_required: 1, urgency: "routine" });
  const [donorForm, setDonorForm] = useState({ full_name: "", blood_type: "O+", phone: "", email: "", date_of_birth: "", gender: "", address: "", notes: "" });
  const [donationForm, setDonationForm] = useState({ donor_id: "", blood_type: "O+", component_type: "whole_blood", units_collected: 1, expiry_date: "", screening_status: "pending", screening_notes: "" });
  const [compatForm, setCompatForm] = useState({ request_id: "", donor_blood_type: "O+", recipient_blood_type: "O+", test_type: "crossmatch", result: "pending", notes: "" });
  const [patients, setPatients] = useState<any[]>([]);

  const { data: inventory, loading, error, refresh } = useHospitalModule<any>("blood_bank_inventory", "hospital_id", hospital?.id, { orderBy: "blood_type", ascending: true });
  const { data: requests, loading: reqLoading, refresh: refreshRequests } = useHospitalModule<any>("blood_bank_requests", "hospital_id", hospital?.id, { orderBy: "request_date", ascending: false });
  const { data: donors, loading: donorsLoading, refresh: refreshDonors } = useHospitalModule<any>("blood_donors", "hospital_id", hospital?.id, { orderBy: "full_name", ascending: true });
  const { data: donations, loading: donationsLoading, refresh: refreshDonations } = useHospitalModule<any>("blood_donations", "hospital_id", hospital?.id, { orderBy: "donation_date", ascending: false });
  const { data: compatTests, loading: compatLoading, refresh: refreshCompat } = useHospitalModule<any>("blood_compatibility_tests", "hospital_id", hospital?.id, { orderBy: "created_at", ascending: false });
  const { data: auditLog, loading: auditLoading, refresh: refreshAudit } = useHospitalModule<any>("blood_bank_audit", "hospital_id", hospital?.id, { orderBy: "issued_at", ascending: false });
  const { nameFor } = usePatientNames(requests.map((r) => r.patient_id));

  // Load patient list for the request form.
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("id, first_name, last_name").eq("role", "patient").order("last_name").limit(200);
        setPatients(data || []);
      } catch { /* non-fatal */ }
    })();
  }, []);

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
    if (!reqForm.patient_id) { toast.error("Select a patient for this transfusion request"); return; }
    setIsSubmitting(true);
    try {
      const reqNum = `BBR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error: err } = await (supabase.from("blood_bank_requests" as any) as any).insert({ hospital_id: hospital.id, request_number: reqNum, patient_id: reqForm.patient_id, requested_by: (await supabase.auth.getUser()).data.user?.id || null, ...reqForm, units_required: Number(reqForm.units_required), status: "pending", request_date: new Date().toISOString() });
      if (err) throw err;
      toast.success(`Blood request ${reqNum} created`);
      setShowNewRequest(false);
      setReqForm({ patient_id: "", blood_type: "O+", component_type: "prbc", units_required: 1, urgency: "routine" });
      refreshRequests();
    } catch (e: any) { toast.error(e?.message || "Failed to create request"); }
    finally { setIsSubmitting(false); }
  };

  const updateRequest = async (row: any, status: string) => {
    // Issuance goes through the atomic RPC: stock check + inventory decrement
    // + request update + audit record in ONE transaction.
    if (status === "issued") {
      setIsSubmitting(true);
      try {
        const { data, error: err } = await (supabase.rpc as any)("issue_blood", { p_request_id: row.id });
        if (err) throw err;
        toast.success(`Blood issued for request ${row.request_number || ""} — inventory decremented`);
        refreshRequests();
        refresh();
        refreshAudit();
      } catch (e: any) { toast.error(e?.message || "Failed to issue blood"); }
      finally { setIsSubmitting(false); }
      return;
    }
    try {
      const { error: err } = await (supabase.from("blood_bank_requests" as any) as any).update({ status }).eq("id", row.id);
      if (err) throw err;
      toast.success(`Request ${row.request_number || ""} ${status}`);
      refreshRequests();
    } catch (e: any) { toast.error(e?.message || "Failed to update request"); }
  };

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("blood_donors" as any) as any).insert({
        hospital_id: hospital.id,
        ...donorForm,
        date_of_birth: donorForm.date_of_birth || null,
      });
      if (err) throw err;
      toast.success("Blood donor registered");
      setShowAddDonor(false);
      setDonorForm({ full_name: "", blood_type: "O+", phone: "", email: "", date_of_birth: "", gender: "", address: "", notes: "" });
      refreshDonors();
    } catch (e: any) { toast.error(e?.message || "Failed to register donor"); }
    finally { setIsSubmitting(false); }
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Atomic: donation + inventory in one transaction via RPC.
      const { error: err } = await (supabase.rpc as any)("record_blood_donation", {
        p_hospital_id: hospital.id,
        p_donor_id: donationForm.donor_id || null,
        p_blood_type: donationForm.blood_type,
        p_component_type: donationForm.component_type,
        p_units_collected: Number(donationForm.units_collected),
        p_screening_status: donationForm.screening_status,
        p_screening_notes: donationForm.screening_notes || null,
        p_expiry_date: donationForm.expiry_date || null,
      });
      if (err) throw err;

      toast.success("Donation recorded" + (donationForm.screening_status === 'passed' ? " and added to inventory" : ""));
      setShowAddDonation(false);
      setDonationForm({ donor_id: "", blood_type: "O+", component_type: "whole_blood", units_collected: 1, expiry_date: "", screening_status: "pending", screening_notes: "" });
      refreshDonations();
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to record donation"); }
    finally { setIsSubmitting(false); }
  };

  const handleCompatTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("blood_compatibility_tests" as any) as any).insert({
        hospital_id: hospital.id,
        request_id: compatForm.request_id || null,
        donor_blood_type: compatForm.donor_blood_type,
        recipient_blood_type: compatForm.recipient_blood_type,
        test_type: compatForm.test_type,
        result: compatForm.result,
        notes: compatForm.notes || null,
        performed_at: new Date().toISOString(),
      });
      if (err) throw err;
      toast.success("Compatibility test recorded");
      setShowCompatTest(false);
      setCompatForm({ request_id: "", donor_blood_type: "O+", recipient_blood_type: "O+", test_type: "crossmatch", result: "pending", notes: "" });
      refreshCompat();
    } catch (e: any) { toast.error(e?.message || "Failed to record test"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-canvas-silk pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-error-500" />
            Blood Bank & Transfusion Management
          </h3>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">Live blood component inventory and transfusion request tracking</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { refresh(); refreshRequests(); refreshDonors(); refreshDonations(); refreshCompat(); refreshAudit(); }} className="px-3 py-1.5 rounded-md bg-canvas-mist dark:bg-slate-800 font-bold text-xs flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowAddDonor(true)} className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Donor
          </button>
          <button onClick={() => setShowAddDonation(true)} className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Donation
          </button>
          <button onClick={() => setShowCompatTest(true)} className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Compat. Test
          </button>
          <button onClick={() => setShowAddStock(true)} className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Stock
          </button>
          <button onClick={() => setShowNewRequest(true)} className="px-3.5 py-1.5 rounded-md bg-error-500 hover:bg-error-500 text-white font-extrabold text-xs flex items-center gap-1">
            <Plus className="h-4 w-4" /> New Request
          </button>
        </div>
      </div>

      {criticalCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-error-500/10 border border-error-500/30 text-error-500 font-bold text-xs">
          <AlertTriangle className="h-4 w-4" /> {criticalCount} blood group(s) are critically out of stock.
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-canvas-silk rounded-xl overflow-x-auto">
        {([
          { key: "inventory", label: `Blood Inventory (${tracked.length})` },
          { key: "requests", label: `Transfusion Requests (${requests.length})` },
          { key: "donors", label: `Donors (${donors.length})` },
          { key: "donations", label: `Donations (${donations.length})` },
          { key: "compatibility", label: `Compatibility (${compatTests.length})` },
          { key: "audit", label: `Audit (${auditLog.length})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold capitalize transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary-500 text-white shadow-xs" : "text-graphite-500 dark:text-slate-400 hover:bg-canvas-mist dark:hover:bg-slate-800"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        loading ? <ListSkeleton count={4} variant="compact" /> :
        error ? <EmptyState icon={Droplets} title="Could not load blood stock" description={error} actionLabel="Retry" onAction={refresh} /> :
        tracked.length === 0 ? <EmptyState icon={Droplets} title="No blood stock recorded" description="Add blood component units to track live availability." /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Blood Type</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Whole Blood</th>
                  <th className="py-2.5 px-3 text-right">PRBC</th>
                  <th className="py-2.5 px-3 text-right">FFP</th>
                  <th className="py-2.5 px-3 text-right">Platelets</th>
                  <th className="py-2.5 px-3 text-right font-extrabold">Total Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {tracked.map((t) => (
                  <tr key={t.type} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4 text-2xl font-black font-mono text-error-500">{t.type}</td>
                    <td className="py-3 px-3 text-center">{getStockPill(t.status)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.whole}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.prbc}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.ffp}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{t.platelets}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-primary-500">{t.total}</td>
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
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
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
              <tbody className="divide-y divide-canvas-silk">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold">{r.request_number}</td>
                    <td className="py-3 px-3 font-bold text-primary-500">{nameFor(r.patient_id) || "Patient"}</td>
                    <td className="py-3 px-3 font-black text-error-500 text-base">{r.blood_type}</td>
                    <td className="py-3 px-3 uppercase text-graphite-500 dark:text-slate-400">{r.component_type}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{r.units_required}</td>
                    <td className="py-3 px-3 text-center">{getRequestPill(r.urgency)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white ${r.status === "issued" ? "bg-success-500" : r.status === "crossmatch_done" ? "bg-primary-400" : "bg-warning-500"}`}>
                        {(r.status || "pending").replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {r.status === "pending" && (
                          <button onClick={() => setShowCompatTest(true)} className="px-2 py-1 rounded text-[10px] font-bold bg-primary-400 text-white">Crossmatch</button>
                        )}
                        {r.status !== "issued" && (
                          <button onClick={() => updateRequest(r, "issued")} className="px-2 py-1 rounded text-[10px] font-bold bg-success-500 text-white">Issue</button>
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

      {activeTab === "donors" && (
        donorsLoading ? <ListSkeleton count={3} variant="row" /> :
        donors.length === 0 ? <EmptyState icon={Droplets} title="No donors registered" description="Register blood donors to track donations." actionLabel="Register Donor" onAction={() => setShowAddDonor(true)} /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Donor</th>
                  <th className="py-2.5 px-3">Blood Type</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Last Donation</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {donors.map((d) => (
                  <tr key={d.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4 font-bold">{d.full_name}</td>
                    <td className="py-3 px-3 font-mono font-bold text-error-500">{d.blood_type}</td>
                    <td className="py-3 px-3">{d.phone || "—"}</td>
                    <td className="py-3 px-3">{d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : "Never"}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${d.is_active ? "bg-success-500" : "bg-graphite-400"}`}>
                        {d.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "donations" && (
        donationsLoading ? <ListSkeleton count={3} variant="row" /> :
        donations.length === 0 ? <EmptyState icon={Droplets} title="No donations recorded" description="Record blood donations to update inventory." actionLabel="Record Donation" onAction={() => setShowAddDonation(true)} /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Blood Type</th>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3 text-center">Screening</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4">{new Date(d.donation_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-mono font-bold text-error-500">{d.blood_type}</td>
                    <td className="py-3 px-3 capitalize">{(d.component_type || "").replace(/_/g, " ")}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{d.units_collected}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${d.screening_status === "passed" ? "bg-success-500" : d.screening_status === "failed" ? "bg-error-500" : "bg-warning-500"}`}>
                        {d.screening_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "compatibility" && (
        compatLoading ? <ListSkeleton count={3} variant="row" /> :
        compatTests.length === 0 ? <EmptyState icon={Droplets} title="No compatibility tests" description="Record crossmatch and compatibility tests here." actionLabel="New Test" onAction={() => setShowCompatTest(true)} /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Donor Type</th>
                  <th className="py-2.5 px-3">Recipient Type</th>
                  <th className="py-2.5 px-3">Test</th>
                  <th className="py-2.5 px-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {compatTests.map((t) => (
                  <tr key={t.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-mono font-bold">{t.donor_blood_type}</td>
                    <td className="py-3 px-3 font-mono font-bold">{t.recipient_blood_type}</td>
                    <td className="py-3 px-3 capitalize">{t.test_type}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${t.result === "compatible" ? "bg-success-500" : t.result === "incompatible" ? "bg-error-500" : "bg-warning-500"}`}>
                        {t.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "audit" && (
        auditLoading ? <ListSkeleton count={3} variant="row" /> :
        auditLog.length === 0 ? <EmptyState icon={Droplets} title="No audit records" description="Blood issuance events will appear here with full traceability." /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Issued At</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Blood</th>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3 text-center">Units</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {auditLog.map((a) => (
                  <tr key={a.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4">{new Date(a.issued_at).toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold">{nameFor(a.patient_id) || "—"}</td>
                    <td className="py-3 px-3 font-mono font-bold">{a.blood_type}</td>
                    <td className="py-3 px-3 capitalize">{(a.component_type || "").replace("_", " ")}</td>
                    <td className="py-3 px-3 text-center font-bold">{a.units_issued}</td>
                    <td className="py-3 px-3"><span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-success-500">{a.action}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Add Stock Dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent className="sm:max-w-[380px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader><DialogTitle className="font-extrabold text-base">Add Blood Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={stockForm.blood_type} onChange={(e) => setStockForm({ ...stockForm, blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Component</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={stockForm.component_type} onChange={(e) => setStockForm({ ...stockForm, component_type: e.target.value })}>
                  <option value="whole_blood">Whole Blood</option>
                  <option value="prbc">PRBC</option>
                  <option value="ffp">FFP</option>
                  <option value="platelets">Platelets</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Units</label>
                <input type="number" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={stockForm.units_available} onChange={(e) => setStockForm({ ...stockForm, units_available: Number(e.target.value) })} />
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Expiry Date</label>
                <input type="date" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700" value={stockForm.expiry_date} onChange={(e) => setStockForm({ ...stockForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddStock(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-primary-500 text-white text-xs font-bold">{isSubmitting ? "Adding..." : "Add Stock"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="sm:max-w-[380px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader><DialogTitle className="font-extrabold text-base">New Blood Transfusion Request</DialogTitle></DialogHeader>
          <form onSubmit={handleNewRequest} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Patient *</label>
              <select required className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={reqForm.patient_id} onChange={(e) => setReqForm({ ...reqForm, patient_id: e.target.value })}>
                <option value="">— Select patient —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={reqForm.blood_type} onChange={(e) => setReqForm({ ...reqForm, blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Component</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={reqForm.component_type} onChange={(e) => setReqForm({ ...reqForm, component_type: e.target.value })}>
                  <option value="prbc">PRBC</option>
                  <option value="ffp">FFP</option>
                  <option value="platelets">Platelets</option>
                  <option value="whole_blood">Whole Blood</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Units Required</label>
                <input type="number" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={reqForm.units_required} onChange={(e) => setReqForm({ ...reqForm, units_required: Number(e.target.value) })} />
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Urgency</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={reqForm.urgency} onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowNewRequest(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-error-500 text-white text-xs font-bold">{isSubmitting ? "Submitting..." : "Submit Request"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Donor Dialog */}
      <Dialog open={showAddDonor} onOpenChange={setShowAddDonor}>
        <DialogContent className="sm:max-w-[420px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Register Blood Donor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDonor} className="space-y-3 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Full Name *</label>
              <input required type="text" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donorForm.full_name} onChange={(e) => setDonorForm({ ...donorForm, full_name: e.target.value })} placeholder="Donor name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donorForm.blood_type} onChange={(e) => setDonorForm({ ...donorForm, blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Phone</label>
                <input type="tel" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} placeholder="+260..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Date of Birth</label>
                <input type="date" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donorForm.date_of_birth} onChange={(e) => setDonorForm({ ...donorForm, date_of_birth: e.target.value })} />
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Gender</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donorForm.gender} onChange={(e) => setDonorForm({ ...donorForm, gender: e.target.value })}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddDonor(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-error-500 text-white text-xs font-bold">{isSubmitting ? "Saving..." : "Register Donor"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Donation Dialog */}
      <Dialog open={showAddDonation} onOpenChange={setShowAddDonation}>
        <DialogContent className="sm:max-w-[420px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Record Blood Donation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDonation} className="space-y-3 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Donor</label>
              <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donationForm.donor_id} onChange={(e) => setDonationForm({ ...donationForm, donor_id: e.target.value })}>
                <option value="">Walk-in / Anonymous</option>
                {donors.map((d) => <option key={d.id} value={d.id}>{d.full_name} ({d.blood_type})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donationForm.blood_type} onChange={(e) => setDonationForm({ ...donationForm, blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Component</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donationForm.component_type} onChange={(e) => setDonationForm({ ...donationForm, component_type: e.target.value })}>
                  <option value="whole_blood">Whole Blood</option>
                  <option value="prbc">PRBC</option>
                  <option value="ffp">FFP</option>
                  <option value="platelets">Platelets</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Units</label>
                <input type="number" min="0.5" step="0.5" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donationForm.units_collected} onChange={(e) => setDonationForm({ ...donationForm, units_collected: Number(e.target.value) })} />
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Expiry Date</label>
                <input type="date" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donationForm.expiry_date} onChange={(e) => setDonationForm({ ...donationForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Screening Status</label>
              <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={donationForm.screening_status} onChange={(e) => setDonationForm({ ...donationForm, screening_status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="passed">Passed — add to inventory</option>
                <option value="failed">Failed — discard</option>
              </select>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddDonation(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-error-500 text-white text-xs font-bold">{isSubmitting ? "Saving..." : "Record Donation"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Compatibility Test Dialog */}
      <Dialog open={showCompatTest} onOpenChange={setShowCompatTest}>
        <DialogContent className="sm:max-w-[420px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Compatibility / Crossmatch Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCompatTest} className="space-y-3 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Related Request</label>
              <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={compatForm.request_id} onChange={(e) => setCompatForm({ ...compatForm, request_id: e.target.value })}>
                <option value="">None</option>
                {requests.map((r) => <option key={r.id} value={r.id}>{r.request_number} — {r.blood_type}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Donor Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={compatForm.donor_blood_type} onChange={(e) => setCompatForm({ ...compatForm, donor_blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Recipient Blood Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={compatForm.recipient_blood_type} onChange={(e) => setCompatForm({ ...compatForm, recipient_blood_type: e.target.value })}>
                  {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Test Type</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={compatForm.test_type} onChange={(e) => setCompatForm({ ...compatForm, test_type: e.target.value })}>
                  <option value="crossmatch">Crossmatch</option>
                  <option value="antibody_screen">Antibody Screen</option>
                  <option value="abo_rh">ABO/Rh Confirm</option>
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Result</label>
                <select className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" value={compatForm.result} onChange={(e) => setCompatForm({ ...compatForm, result: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="compatible">Compatible</option>
                  <option value="incompatible">Incompatible</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowCompatTest(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 rounded-md bg-error-500 text-white text-xs font-bold">{isSubmitting ? "Saving..." : "Record Test"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BloodBank;

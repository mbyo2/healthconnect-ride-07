import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tent, Users, UserPlus, ClipboardCheck, CalendarClock, BarChart3, Plus, Loader2, RefreshCw, CheckCircle2, Link2 } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CAMP_TYPES = [
  { key: "screening", label: "Health Screening" },
  { key: "vaccination", label: "Vaccination Drive" },
  { key: "eye", label: "Eye Camp" },
  { key: "dental", label: "Dental Camp" },
  { key: "maternal", label: "Maternal & Child" },
  { key: "hiv_testing", label: "HIV Testing" },
  { key: "general", label: "General Outreach" },
] as const;

const campTypeLabel = (t: string) => CAMP_TYPES.find((c) => c.key === t)?.label || t;

const getStatusPill = (status: string) => {
  if (status === "active") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-success-500">Active</span>;
  if (status === "completed") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-primary-400">Completed</span>;
  if (status === "cancelled") return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-error-500">Cancelled</span>;
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-warning-500">Planned</span>;
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString(); } catch { return d; }
};

export const CampManagement = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"camps" | "registrations" | "followups" | "reports">("camps");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCamp, setShowNewCamp] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showScreening, setShowScreening] = useState(false);
  const [screeningFor, setScreeningFor] = useState<any>(null);
  const [filterCampId, setFilterCampId] = useState<string>("all");
  const [cancelTarget, setCancelTarget] = useState<any>(null);

  const [campForm, setCampForm] = useState({ name: "", location: "", camp_date: "", camp_type: "general", target_population: "", notes: "" });
  const [regForm, setRegForm] = useState({ camp_id: "", full_name: "", phone: "", age: "", gender: "" });
  const [screenForm, setScreenForm] = useState({ blood_pressure: "", blood_sugar: "", weight_kg: "", temperature_c: "", hiv_result: "", notes: "", referral_needed: false, referred_to: "", follow_up_date: "" });

  const { data: camps, loading, error, refresh } = useHospitalModule<any>("health_camps", "institution_id", hospital?.id, { orderBy: "camp_date", ascending: false });
  const { data: registrations, loading: regLoading, refresh: refreshRegs } = useHospitalModule<any>("camp_registrations", null, null, { orderBy: "created_at", ascending: false, limit: 500 });

  const campById = (id: string) => camps.find((c) => c.id === id);
  const myCampIds = new Set(camps.map((c) => c.id));
  const myRegs = registrations.filter((r) => myCampIds.has(r.camp_id));
  const visibleRegs = filterCampId === "all" ? myRegs : myRegs.filter((r) => r.camp_id === filterCampId);

  const activeCamps = camps.filter((c) => c.status === "active");
  const pendingReferrals = myRegs.filter((r) => r.referral_needed);
  const todayStr = new Date().toISOString().slice(0, 10);
  const followupsDue = myRegs.filter((r) => r.follow_up_date && r.follow_up_date <= todayStr && !r.follow_up_done);
  const unsynced = myRegs.filter((r) => !r.synced_to_ehr);

  const refreshAll = () => { refresh(); refreshRegs(); };

  // ---- Camp actions ----
  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campForm.name.trim()) { toast.error("Camp name is required"); return; }
    if (!campForm.location.trim()) { toast.error("Location is required"); return; }
    if (!campForm.camp_date) { toast.error("Camp date is required"); return; }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from("health_camps" as any) as any).insert({
        institution_id: hospital.id,
        name: campForm.name.trim(),
        location: campForm.location.trim(),
        camp_date: campForm.camp_date,
        camp_type: campForm.camp_type,
        target_population: campForm.target_population ? Number(campForm.target_population) : null,
        notes: campForm.notes.trim() || null,
        created_by: user?.id || null,
      });
      if (err) throw err;
      toast.success("Health camp created");
      setShowNewCamp(false);
      setCampForm({ name: "", location: "", camp_date: "", camp_type: "general", target_population: "", notes: "" });
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to create camp"); }
    finally { setIsSubmitting(false); }
  };

  const updateCampStatus = async (camp: any, status: string) => {
    try {
      const { error: err } = await (supabase.from("health_camps" as any) as any).update({ status }).eq("id", camp.id);
      if (err) throw err;
      toast.success(`Camp ${status}`);
      setCancelTarget(null);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to update camp"); }
  };

  // ---- Registration actions (fast walk-in capture) ----
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.camp_id) { toast.error("Select a camp"); return; }
    if (!regForm.full_name.trim()) { toast.error("Full name is required"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("camp_registrations" as any) as any).insert({
        camp_id: regForm.camp_id,
        full_name: regForm.full_name.trim(),
        phone: regForm.phone.trim() || null,
        age: regForm.age ? Number(regForm.age) : null,
        gender: regForm.gender || null,
      });
      if (err) throw err;
      toast.success("Walk-in registered");
      setShowRegister(false);
      setRegForm({ camp_id: regForm.camp_id, full_name: "", phone: "", age: "", gender: "" });
      refreshRegs();
    } catch (e: any) { toast.error(e?.message || "Failed to register"); }
    finally { setIsSubmitting(false); }
  };

  const openScreening = (reg: any) => {
    const s = reg.screening_results || {};
    setScreeningFor(reg);
    setScreenForm({
      blood_pressure: s.blood_pressure || "",
      blood_sugar: s.blood_sugar || "",
      weight_kg: s.weight_kg || "",
      temperature_c: s.temperature_c || "",
      hiv_result: s.hiv_result || "",
      notes: s.notes || "",
      referral_needed: !!reg.referral_needed,
      referred_to: reg.referred_to || "",
      follow_up_date: reg.follow_up_date || "",
    });
    setShowScreening(true);
  };

  const handleSaveScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screeningFor) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("camp_registrations" as any) as any).update({
        screening_results: {
          blood_pressure: screenForm.blood_pressure || null,
          blood_sugar: screenForm.blood_sugar || null,
          weight_kg: screenForm.weight_kg || null,
          temperature_c: screenForm.temperature_c || null,
          hiv_result: screenForm.hiv_result || null,
          notes: screenForm.notes || null,
          recorded_at: new Date().toISOString(),
        },
        referral_needed: screenForm.referral_needed,
        referred_to: screenForm.referred_to.trim() || null,
        follow_up_date: screenForm.follow_up_date || null,
      }).eq("id", screeningFor.id);
      if (err) throw err;
      toast.success("Screening results recorded");
      setShowScreening(false);
      setScreeningFor(null);
      refreshRegs();
    } catch (e: any) { toast.error(e?.message || "Failed to save screening"); }
    finally { setIsSubmitting(false); }
  };

  /** Sync to EHR: link to a registered patient by phone when one exists; the
   *  camp registration row itself is the clinical record otherwise. */
  const handleSyncEHR = async (reg: any) => {
    setIsSubmitting(true);
    try {
      let patientId: string | null = null;
      if (reg.phone) {
        const { data } = await supabase.from("profiles").select("id").eq("phone", reg.phone).limit(1);
        if (data && data.length > 0) patientId = data[0].id;
      }
      const { error: err } = await (supabase.from("camp_registrations" as any) as any).update({
        patient_id: patientId || reg.patient_id,
        synced_to_ehr: true,
      }).eq("id", reg.id);
      if (err) throw err;
      toast.success(patientId ? "Linked to patient record in EHR" : "Saved to EHR — will link automatically when the patient registers with this phone number");
      refreshRegs();
    } catch (e: any) { toast.error(e?.message || "Failed to sync"); }
    finally { setIsSubmitting(false); }
  };

  const markFollowupDone = async (reg: any) => {
    try {
      const { error: err } = await (supabase.from("camp_registrations" as any) as any).update({ follow_up_done: true }).eq("id", reg.id);
      if (err) throw err;
      toast.success("Follow-up marked done");
      refreshRegs();
    } catch (e: any) { toast.error(e?.message || "Failed to update"); }
  };

  const glance = [
    { label: "Active camps", value: activeCamps.length, icon: Tent, tone: "text-primary-500" },
    { label: "Registrations", value: myRegs.length, icon: Users, tone: "text-primary-500" },
    { label: "Referrals pending", value: pendingReferrals.length, icon: ClipboardCheck, tone: pendingReferrals.length > 0 ? "text-warning-500" : "text-primary-500" },
    { label: "Follow-ups due", value: followupsDue.length, icon: CalendarClock, tone: followupsDue.length > 0 ? "text-error-500" : "text-primary-500" },
  ];

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-canvas-silk pb-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Tent className="h-5 w-5 text-primary-500" />
            Health Camp Outreach
          </h3>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">Community camps: fast on-site registration, screening, referrals and follow-up</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={refreshAll} className="px-3 py-1.5 min-h-[44px] rounded-md bg-canvas-mist dark:bg-slate-800 font-bold text-xs flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowRegister(true)} className="px-3 py-1.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" /> Quick Register
          </button>
          <button onClick={() => setShowNewCamp(true)} className="px-3.5 py-1.5 min-h-[44px] rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs flex items-center gap-1">
            <Plus className="h-4 w-4" /> New Camp
          </button>
        </div>
      </div>

      {/* Today at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {glance.map((g) => (
          <div key={g.label} className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <g.icon className={`h-5 w-5 ${g.tone} mb-2`} />
            <p className="text-[28px] leading-8 font-extrabold tabular-nums">{g.value}</p>
            <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium mt-1">{g.label}</p>
          </div>
        ))}
      </div>

      {unsynced.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/30 text-warning-500 font-bold text-xs">
          <Link2 className="h-4 w-4" /> {unsynced.length} registration(s) not yet synced to the EHR.
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-canvas-silk rounded-xl overflow-x-auto">
        {([
          { key: "camps", label: `Camps (${camps.length})` },
          { key: "registrations", label: `Registrations (${myRegs.length})` },
          { key: "followups", label: `Follow-ups (${followupsDue.length})` },
          { key: "reports", label: "Reports" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 min-h-[44px] rounded-md text-xs font-extrabold transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary-500 text-white shadow-xs" : "text-graphite-500 dark:text-slate-400 hover:bg-canvas-mist dark:hover:bg-slate-800"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CAMPS */}
      {activeTab === "camps" && (
        loading ? <ListSkeleton count={3} variant="row" /> :
        error ? <EmptyState icon={Tent} title="Could not load camps" description={error} actionLabel="Retry" onAction={refresh} /> :
        camps.length === 0 ? <EmptyState icon={Tent} title="No health camps yet" description="Create your first outreach camp — screening, vaccination, eye, dental and more." actionLabel="Create camp" onAction={() => setShowNewCamp(true)} /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {camps.map((c) => {
              const regs = myRegs.filter((r) => r.camp_id === c.id);
              return (
                <div key={c.id} className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-extrabold">{c.name}</p>
                      <p className="text-xs text-graphite-500 dark:text-slate-400">{c.location} • {fmtDate(c.camp_date)} • {campTypeLabel(c.camp_type)}</p>
                    </div>
                    {getStatusPill(c.status)}
                  </div>
                  <div className="flex gap-4 text-xs text-graphite-500 dark:text-slate-400">
                    <span><strong className="text-slate-900 dark:text-slate-100 tabular-nums">{regs.length}</strong> registered</span>
                    {c.target_population ? <span>Target: <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{c.target_population}</strong></span> : null}
                    <span><strong className="text-slate-900 dark:text-slate-100 tabular-nums">{regs.filter((r) => r.referral_needed).length}</strong> referrals</span>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {c.status === "planned" && (
                      <button onClick={() => updateCampStatus(c, "active")} className="px-3 py-1.5 min-h-[44px] rounded-md bg-success-500 text-white text-xs font-bold">Start camp</button>
                    )}
                    {c.status === "active" && (
                      <>
                        <button onClick={() => { setRegForm((f) => ({ ...f, camp_id: c.id })); setShowRegister(true); }} className="px-3 py-1.5 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-bold">Register walk-in</button>
                        <button onClick={() => updateCampStatus(c, "completed")} className="px-3 py-1.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Complete</button>
                      </>
                    )}
                    {(c.status === "planned" || c.status === "active") && (
                      <button onClick={() => setCancelTarget(c)} className="px-3 py-1.5 min-h-[44px] rounded-md text-xs font-bold text-error-500">Cancel camp</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* REGISTRATIONS */}
      {activeTab === "registrations" && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-xs font-bold text-graphite-500 dark:text-slate-400">Camp:</label>
            <select value={filterCampId} onChange={(e) => setFilterCampId(e.target.value)} className="px-3 py-2 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold">
              <option value="all">All camps</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {regLoading ? <ListSkeleton count={4} variant="row" /> :
          visibleRegs.length === 0 ? <EmptyState icon={Users} title="No registrations" description="Walk-in registrations from camps appear here." actionLabel="Quick register" onAction={() => setShowRegister(true)} /> : (
            <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-canvas-silk bg-canvas text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3 text-center">Age</th>
                    <th className="py-2.5 px-3">Camp</th>
                    <th className="py-2.5 px-3 text-center">Referral</th>
                    <th className="py-2.5 px-3 text-center">EHR</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-silk">
                  {visibleRegs.map((r) => (
                    <tr key={r.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                      <td className="py-3 px-4 font-bold">{r.full_name}</td>
                      <td className="py-3 px-3">{r.phone || "—"}</td>
                      <td className="py-3 px-3 text-center tabular-nums">{r.age ?? "—"}</td>
                      <td className="py-3 px-3 text-graphite-500 dark:text-slate-400">{campById(r.camp_id)?.name || "—"}</td>
                      <td className="py-3 px-3 text-center">
                        {r.referral_needed
                          ? <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-warning-500">Referred</span>
                          : <span className="text-graphite-500 dark:text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.synced_to_ehr
                          ? <span className="inline-flex items-center gap-1 text-success-500 font-bold"><CheckCircle2 className="h-3.5 w-3.5" /> Synced</span>
                          : <span className="text-graphite-500 dark:text-slate-400">Pending</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <button onClick={() => openScreening(r)} className="px-2.5 py-1.5 min-h-[44px] rounded text-xs font-bold bg-primary-400 text-white">Screening</button>
                          {!r.synced_to_ehr && (
                            <button onClick={() => handleSyncEHR(r)} disabled={isSubmitting} className="px-2.5 py-1.5 min-h-[44px] rounded text-xs font-bold bg-success-500 text-white disabled:opacity-50">Sync to EHR</button>
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

      {/* FOLLOW-UPS */}
      {activeTab === "followups" && (
        regLoading ? <ListSkeleton count={3} variant="row" /> :
        followupsDue.length === 0 ? <EmptyState icon={CalendarClock} title="No follow-ups due" description="Patients flagged for follow-up with a due date appear here." /> : (
          <div className="space-y-2">
            {followupsDue.map((r) => (
              <div key={r.id} className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[15px] font-extrabold">{r.full_name}</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    {r.phone || "No phone"} • Due {fmtDate(r.follow_up_date)} • {campById(r.camp_id)?.name}
                    {r.referral_needed && r.referred_to ? ` • Referred to ${r.referred_to}` : ""}
                  </p>
                </div>
                <button onClick={() => markFollowupDone(r)} className="px-3.5 py-2 min-h-[44px] rounded-md bg-success-500 text-white text-xs font-bold">Mark done</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* REPORTS */}
      {activeTab === "reports" && (
        camps.length === 0 ? <EmptyState icon={BarChart3} title="No camp data" description="Reports appear once camps have registrations." /> : (
          <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Camp</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Registered</th>
                  <th className="py-2.5 px-3 text-right">Screened</th>
                  <th className="py-2.5 px-3 text-right">Referred</th>
                  <th className="py-2.5 px-3 text-right">Synced to EHR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {camps.map((c) => {
                  const regs = myRegs.filter((r) => r.camp_id === c.id);
                  const screened = regs.filter((r) => r.screening_results && Object.keys(r.screening_results).length > 0);
                  return (
                    <tr key={c.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                      <td className="py-3 px-4 font-bold">{c.name}</td>
                      <td className="py-3 px-3">{fmtDate(c.camp_date)}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{regs.length}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{screened.length}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{regs.filter((r) => r.referral_needed).length}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{regs.filter((r) => r.synced_to_ehr).length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* New camp dialog */}
      <Dialog open={showNewCamp} onOpenChange={setShowNewCamp}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New health camp</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateCamp} className="space-y-3">
            <div>
              <label className="text-xs font-bold">Camp name *</label>
              <input value={campForm.name} onChange={(e) => setCampForm({ ...campForm, name: e.target.value })} placeholder="e.g. Matero Screening Camp" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold">Location *</label>
              <input value={campForm.location} onChange={(e) => setCampForm({ ...campForm, location: e.target.value })} placeholder="e.g. Matero Community Hall" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold">Date *</label>
                <input type="date" value={campForm.camp_date} onChange={(e) => setCampForm({ ...campForm, camp_date: e.target.value })} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Type</label>
                <select value={campForm.camp_type} onChange={(e) => setCampForm({ ...campForm, camp_type: e.target.value })} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                  {CAMP_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold">Target population (optional)</label>
              <input type="number" min={1} value={campForm.target_population} onChange={(e) => setCampForm({ ...campForm, target_population: e.target.value })} placeholder="e.g. 200" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold">Notes (optional)</label>
              <textarea value={campForm.notes} onChange={(e) => setCampForm({ ...campForm, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowNewCamp(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-extrabold disabled:opacity-50 flex items-center gap-1">
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create camp
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick walk-in registration dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quick walk-in registration</DialogTitle></DialogHeader>
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-xs font-bold">Camp *</label>
              <select value={regForm.camp_id} onChange={(e) => setRegForm({ ...regForm, camp_id: e.target.value })} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                <option value="">Select camp</option>
                {camps.filter((c) => c.status === "active" || c.status === "planned").map((c) => <option key={c.id} value={c.id}>{c.name} — {fmtDate(c.camp_date)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold">Full name *</label>
              <input value={regForm.full_name} onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} placeholder="Patient name" autoFocus className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold">Phone</label>
                <input value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="097XXXXXXX" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Age</label>
                <input type="number" min={0} max={130} value={regForm.age} onChange={(e) => setRegForm({ ...regForm, age: e.target.value })} placeholder="Years" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold">Gender (optional)</label>
              <select value={regForm.gender} onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowRegister(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-extrabold disabled:opacity-50 flex items-center gap-1">
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Register
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Screening results dialog */}
      <Dialog open={showScreening} onOpenChange={setShowScreening}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Screening — {screeningFor?.full_name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveScreening} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold">Blood pressure</label>
                <input value={screenForm.blood_pressure} onChange={(e) => setScreenForm({ ...screenForm, blood_pressure: e.target.value })} placeholder="120/80" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Blood sugar (mmol/L)</label>
                <input value={screenForm.blood_sugar} onChange={(e) => setScreenForm({ ...screenForm, blood_sugar: e.target.value })} placeholder="5.4" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Weight (kg)</label>
                <input value={screenForm.weight_kg} onChange={(e) => setScreenForm({ ...screenForm, weight_kg: e.target.value })} placeholder="68" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Temperature (°C)</label>
                <input value={screenForm.temperature_c} onChange={(e) => setScreenForm({ ...screenForm, temperature_c: e.target.value })} placeholder="36.6" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold">HIV test result</label>
              <select value={screenForm.hiv_result} onChange={(e) => setScreenForm({ ...screenForm, hiv_result: e.target.value })} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                <option value="">Not tested</option>
                <option value="negative">Negative</option>
                <option value="positive">Positive</option>
                <option value="indeterminate">Indeterminate</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold">Clinical notes</label>
              <textarea value={screenForm.notes} onChange={(e) => setScreenForm({ ...screenForm, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={screenForm.referral_needed} onChange={(e) => setScreenForm({ ...screenForm, referral_needed: e.target.checked })} className="h-5 w-5 accent-primary-500" />
              Referral needed
            </label>
            {screenForm.referral_needed && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Referred to</label>
                  <input value={screenForm.referred_to} onChange={(e) => setScreenForm({ ...screenForm, referred_to: e.target.value })} placeholder="e.g. UTH Cardiology" className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold">Follow-up date</label>
                  <input type="date" value={screenForm.follow_up_date} onChange={(e) => setScreenForm({ ...screenForm, follow_up_date: e.target.value })} className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                </div>
              </div>
            )}
            <DialogFooter>
              <button type="button" onClick={() => setShowScreening(false)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 min-h-[44px] rounded-md bg-primary-500 text-white text-xs font-extrabold disabled:opacity-50 flex items-center gap-1">
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save screening
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel camp confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel this camp?</DialogTitle></DialogHeader>
          <p className="text-sm text-graphite-500 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">{cancelTarget?.name}</strong> will be marked cancelled. Registrations already captured are kept.
          </p>
          <DialogFooter>
            <button onClick={() => setCancelTarget(null)} className="px-4 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-bold">Keep camp</button>
            <button onClick={() => updateCampStatus(cancelTarget, "cancelled")} className="px-4 py-2.5 min-h-[44px] rounded-md bg-error-500 text-white text-xs font-extrabold">Yes, cancel</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

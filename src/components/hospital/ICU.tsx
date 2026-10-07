import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BedDouble, Activity, Plus, Loader2, RefreshCw, LogOut, UserPlus, Wrench } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { usePatientNames } from "@/hooks/usePatientNames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  occupied: "bg-error-500",
  available: "bg-success-500",
  maintenance: "bg-warning-500",
};

const STATUS_BG: Record<string, string> = {
  occupied: "bg-error-500/10 border-error-500/30",
  available: "bg-success-500/10 border-success-500/30",
  maintenance: "bg-warning-500/10 border-warning-500/30",
};

const getStatusPill = (status: string) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${STATUS_COLORS[status] || "bg-slate-400"} capitalize`}>
    {status}
  </span>
);

export const ICU = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"beds" | "observations">("beds");
  const [showAddBed, setShowAddBed] = useState(false);
  const [showAdmit, setShowAdmit] = useState(false);
  const [showObsForm, setShowObsForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bedForm, setBedForm] = useState({ bed_number: "", ward_name: "ICU" });
  const [admitBed, setAdmitBed] = useState<any>(null);
  const [obsBed, setObsBed] = useState<any>(null);
  const [timelinePatientId, setTimelinePatientId] = useState<string>("");
  const [obsForm, setObsForm] = useState({ heart_rate: "", bp_systolic: "", bp_diastolic: "", spo2: "", temperature: "", gcs_score: "", notes: "" });
  const [patientQuery, setPatientQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [admitPatientId, setAdmitPatientId] = useState("");

  const { data: beds, loading, error, refresh } = useHospitalModule<any>("icu_beds", "institution_id", hospital?.id, { orderBy: "bed_number", ascending: true });
  const { data: observations, loading: obsLoading, refresh: refreshObs } = useHospitalModule<any>("icu_observations", null, null, { orderBy: "recorded_at", ascending: false, limit: 100 });
  const { nameFor } = usePatientNames(beds.map((b) => b.patient_id));

  const occupiedBeds = beds.filter((b) => b.status === "occupied");
  const availableCount = beds.filter((b) => b.status === "available").length;
  const maintenanceCount = beds.filter((b) => b.status === "maintenance").length;

  // Observations limited to this institution's beds (RLS enforces, but client-side filter too)
  const bedIds = new Set(beds.map((b) => b.id));
  const myObs = observations.filter((o) => bedIds.has(o.bed_id));
  const timeline = timelinePatientId
    ? myObs.filter((o) => o.patient_id === timelinePatientId)
    : [];

  const searchPatients = async (query: string) => {
    setPatientQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await (supabase.rpc as any)("search_patients_for_provider", { p_search: query.trim() });
      setSearchResults(data || []);
    } catch (e) {
      console.error("Patient search failed:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedForm.bed_number.trim()) { toast.error("Bed number is required"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("icu_beds" as any) as any).insert({
        institution_id: hospital.id,
        bed_number: bedForm.bed_number.trim(),
        ward_name: bedForm.ward_name.trim() || "ICU",
        status: "available",
      });
      if (err) throw err;
      toast.success(`ICU bed ${bedForm.bed_number.trim()} added`);
      setShowAddBed(false);
      setBedForm({ bed_number: "", ward_name: "ICU" });
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to add bed"); }
    finally { setIsSubmitting(false); }
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitBed) return;
    if (!admitPatientId) { toast.error("Select a patient to admit"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("icu_beds" as any) as any)
        .update({ status: "occupied", patient_id: admitPatientId, admitted_at: new Date().toISOString() })
        .eq("id", admitBed.id);
      if (err) throw err;
      toast.success(`Patient admitted to bed ${admitBed.bed_number}`);
      setShowAdmit(false);
      setAdmitBed(null);
      setAdmitPatientId("");
      setPatientQuery("");
      setSearchResults([]);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to admit patient"); }
    finally { setIsSubmitting(false); }
  };

  const handleDischarge = async (bed: any) => {
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("icu_beds" as any) as any)
        .update({ status: "available", patient_id: null, admitted_at: null })
        .eq("id", bed.id);
      if (err) throw err;
      toast.success(`Bed ${bed.bed_number} discharged — now available`);
      if (timelinePatientId === bed.patient_id) setTimelinePatientId("");
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to discharge bed"); }
    finally { setIsSubmitting(false); }
  };

  const handleMaintenance = async (bed: any) => {
    const next = bed.status === "maintenance" ? "available" : "maintenance";
    if (bed.status === "occupied") { toast.error("Discharge the patient before marking maintenance"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("icu_beds" as any) as any).update({ status: next }).eq("id", bed.id);
      if (err) throw err;
      toast.success(`Bed ${bed.bed_number} marked ${next}`);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to update bed status"); }
    finally { setIsSubmitting(false); }
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsBed) return;
    setIsSubmitting(true);
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const payload = {
        bed_id: obsBed.id,
        patient_id: obsBed.patient_id,
        recorded_by: (await supabase.auth.getUser()).data.user?.id || null,
        heart_rate: num(obsForm.heart_rate),
        bp_systolic: num(obsForm.bp_systolic),
        bp_diastolic: num(obsForm.bp_diastolic),
        spo2: num(obsForm.spo2),
        temperature: num(obsForm.temperature),
        gcs_score: num(obsForm.gcs_score),
        notes: obsForm.notes.trim() || null,
        recorded_at: new Date().toISOString(),
      };
      const { error: err } = await (supabase.from("icu_observations" as any) as any).insert(payload);
      if (err) throw err;
      toast.success(`Observations recorded for bed ${obsBed.bed_number}`);
      setShowObsForm(false);
      setObsForm({ heart_rate: "", bp_systolic: "", bp_diastolic: "", spo2: "", temperature: "", gcs_score: "", notes: "" });
      refreshObs();
    } catch (e: any) { toast.error(e?.message || "Failed to record observations"); }
    finally { setIsSubmitting(false); }
  };

  const latestFor = (bedId: string) => myObs.find((o) => o.bed_id === bedId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-graphite-800 dark:text-white flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary-500" /> ICU Management
          </h2>
          <p className="text-xs text-graphite-500 dark:text-slate-400">
            {beds.length} beds · {occupiedBeds.length} occupied · {availableCount} available · {maintenanceCount} in maintenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refresh(); refreshObs(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-xs font-bold hover:bg-canvas-mist dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowAddBed(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" /> Add Bed
          </button>
        </div>
      </div>

      {maintenanceCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/30 text-warning-500 font-bold text-xs">
          <Wrench className="h-4 w-4" /> {maintenanceCount} ICU bed(s) under maintenance.
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-canvas-silk rounded-xl overflow-x-auto">
        {([
          { key: "beds", label: `Bed Grid (${beds.length})` },
          { key: "observations", label: `Vitals Timeline (${myObs.length})` },
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

      {activeTab === "beds" && (
        loading ? <ListSkeleton count={6} variant="compact" /> :
        error ? <EmptyState icon={BedDouble} title="Could not load ICU beds" description={error} actionLabel="Retry" onAction={refresh} /> :
        beds.length === 0 ? <EmptyState icon={BedDouble} title="No ICU beds registered" description="Add beds to start tracking ICU occupancy and monitoring." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {beds.map((bed) => {
              const latest = latestFor(bed.id);
              return (
                <div key={bed.id} className={`rounded-xl border p-4 space-y-2 ${STATUS_BG[bed.status] || "bg-white border-canvas-silk"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${STATUS_COLORS[bed.status] || "bg-slate-400"}`} />
                      <span className="font-extrabold text-sm text-graphite-800 dark:text-white">{bed.bed_number}</span>
                    </div>
                    {getStatusPill(bed.status)}
                  </div>
                  <p className="text-[11px] text-graphite-500 dark:text-slate-400">{bed.ward_name}</p>
                  {bed.status === "occupied" && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-graphite-800 dark:text-white">{nameFor(bed.patient_id)}</p>
                      {bed.admitted_at && (
                        <p className="text-graphite-500 dark:text-slate-400">
                          Admitted {new Date(bed.admitted_at).toLocaleDateString()}
                        </p>
                      )}
                      {latest && (
                        <p className="text-graphite-500 dark:text-slate-400">
                          HR {latest.heart_rate ?? "—"} · SpO₂ {latest.spo2 ?? "—"}% · GCS {latest.gcs_score ?? "—"}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bed.status === "available" && (
                      <button
                        onClick={() => { setAdmitBed(bed); setShowAdmit(true); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-bold hover:bg-primary-600"
                      >
                        <UserPlus className="h-3 w-3" /> Admit
                      </button>
                    )}
                    {bed.status === "occupied" && (
                      <>
                        <button
                          onClick={() => { setObsBed(bed); setShowObsForm(true); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-bold hover:bg-primary-600"
                        >
                          <Activity className="h-3 w-3" /> Chart
                        </button>
                        <button
                          onClick={() => { setTimelinePatientId(bed.patient_id); setActiveTab("observations"); }}
                          className="px-2.5 py-1.5 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-[11px] font-bold hover:bg-canvas-mist dark:hover:bg-slate-800"
                        >
                          Timeline
                        </button>
                        <button
                          onClick={() => handleDischarge(bed)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success-500 text-white text-[11px] font-bold hover:bg-success-600 disabled:opacity-50"
                        >
                          <LogOut className="h-3 w-3" /> Discharge
                        </button>
                      </>
                    )}
                    {bed.status !== "occupied" && (
                      <button
                        onClick={() => handleMaintenance(bed)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-[11px] font-bold hover:bg-canvas-mist dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        <Wrench className="h-3 w-3" /> {bed.status === "maintenance" ? "Restore" : "Maintenance"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {activeTab === "observations" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-graphite-600 dark:text-slate-300">Patient:</label>
            <select
              value={timelinePatientId}
              onChange={(e) => setTimelinePatientId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">Select an admitted patient…</option>
              {occupiedBeds.map((b) => (
                <option key={b.id} value={b.patient_id}>
                  {nameFor(b.patient_id)} — Bed {b.bed_number}
                </option>
              ))}
            </select>
          </div>
          {!timelinePatientId ? (
            <EmptyState icon={Activity} title="No patient selected" description="Pick an admitted patient to see their vitals timeline." />
          ) : obsLoading ? <ListSkeleton count={4} variant="compact" /> :
          timeline.length === 0 ? (
            <EmptyState icon={Activity} title="No observations yet" description="Chart observations from the bed card to start the timeline." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-canvas-silk">
              <table className="w-full text-xs">
                <thead className="bg-canvas-mist dark:bg-slate-800 text-left">
                  <tr>
                    {["Time", "HR", "BP", "SpO₂", "Temp °C", "GCS", "Notes"].map((h) => (
                      <th key={h} className="px-3 py-2 font-extrabold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((o) => (
                    <tr key={o.id} className="border-t border-canvas-silk dark:border-slate-700">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(o.recorded_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{o.heart_rate ?? "—"}</td>
                      <td className="px-3 py-2">{o.bp_systolic && o.bp_diastolic ? `${o.bp_systolic}/${o.bp_diastolic}` : "—"}</td>
                      <td className="px-3 py-2">{o.spo2 ?? "—"}</td>
                      <td className="px-3 py-2">{o.temperature ?? "—"}</td>
                      <td className="px-3 py-2">{o.gcs_score ?? "—"}</td>
                      <td className="px-3 py-2 max-w-48 truncate">{o.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add bed dialog */}
      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add ICU Bed</DialogTitle></DialogHeader>
          <form onSubmit={handleAddBed} className="space-y-3">
            <div>
              <label className="text-xs font-bold">Bed Number</label>
              <input value={bedForm.bed_number} onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-sm" placeholder="e.g. ICU-01" required />
            </div>
            <div>
              <label className="text-xs font-bold">Ward Name</label>
              <input value={bedForm.ward_name} onChange={(e) => setBedForm({ ...bedForm, ward_name: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-sm" placeholder="ICU" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddBed(false)} className="px-4 py-2 rounded-lg border border-canvas-silk text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Bed"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admit dialog */}
      <Dialog open={showAdmit} onOpenChange={(v) => { setShowAdmit(v); if (!v) { setAdmitBed(null); setAdmitPatientId(""); setPatientQuery(""); setSearchResults([]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Admit Patient — Bed {admitBed?.bed_number}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold">Search patient</label>
              <input value={patientQuery} onChange={(e) => searchPatients(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-sm" placeholder="Type at least 2 characters…" />
              {searching && <p className="text-[11px] text-graphite-500 mt-1">Searching…</p>}
              {searchResults.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-canvas-silk">
                  {searchResults.map((p: any) => (
                    <button type="button" key={p.id}
                      onClick={() => { setAdmitPatientId(p.id); setPatientQuery(p.full_name || p.email || p.id); setSearchResults([]); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-canvas-mist dark:hover:bg-slate-800 ${admitPatientId === p.id ? "bg-primary-500/10" : ""}`}>
                      <span className="font-bold">{p.full_name || "Unnamed patient"}</span>
                      <span className="text-graphite-500"> {p.email || ""}</span>
                    </button>
                  ))}
                </div>
              )}
              {admitPatientId && <p className="text-[11px] text-success-500 font-bold mt-1">Patient selected</p>}
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAdmit(false)} className="px-4 py-2 rounded-lg border border-canvas-silk text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting || !admitPatientId} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Admit"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Observations dialog */}
      <Dialog open={showObsForm} onOpenChange={(v) => { setShowObsForm(v); if (!v) setObsBed(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chart Observations — Bed {obsBed?.bed_number}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddObservation} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "heart_rate", label: "Heart Rate (bpm)" },
                { key: "spo2", label: "SpO₂ (%)" },
                { key: "bp_systolic", label: "BP Systolic" },
                { key: "bp_diastolic", label: "BP Diastolic" },
                { key: "temperature", label: "Temperature (°C)" },
                { key: "gcs_score", label: "GCS Score (3–15)" },
              ] as const).map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-bold">{f.label}</label>
                  <input type="number" step="any" value={obsForm[f.key]} onChange={(e) => setObsForm({ ...obsForm, [f.key]: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-sm" placeholder="—" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold">Notes</label>
              <textarea value={obsForm.notes} onChange={(e) => setObsForm({ ...obsForm, notes: e.target.value })} rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-canvas-silk bg-white dark:bg-slate-900 text-sm" placeholder="Clinical notes…" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowObsForm(false)} className="px-4 py-2 rounded-lg border border-canvas-silk text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Observations"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

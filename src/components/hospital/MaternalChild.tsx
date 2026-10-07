import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Baby, HeartPulse, Syringe, Plus, Loader2, RefreshCw, CalendarCheck } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { useHospitalPatients } from "@/hooks/useHospitalPatients";
import { usePatientNames } from "@/hooks/usePatientNames";
import { HospitalPatientSelect } from "@/components/hospital/HospitalPatientSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "anc" | "deliveries" | "immunizations";

const numOrNull = (v: string) => (v === "" || v === null || v === undefined ? null : Number(v));
const todayISO = () => new Date().toISOString().slice(0, 10);

export const MaternalChild = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<Tab>("anc");
  const [showAnc, setShowAnc] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showImmun, setShowImmun] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const [ancForm, setAncForm] = useState({
    patient_id: "", visit_date: todayISO(), gestational_age_weeks: "", weight_kg: "",
    bp_systolic: "", bp_diastolic: "", hemoglobin: "", urine_protein: "",
    fetal_heart_rate: "", notes: "", next_visit_date: "",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    patient_id: "", delivery_date: todayISO(), delivery_type: "normal",
    birth_weight_kg: "", baby_gender: "", apgar_score: "", complications: "",
  });
  const [immunForm, setImmunForm] = useState({
    patient_id: "", vaccine_name: "", dose_number: "1", scheduled_date: todayISO(), batch_number: "",
  });

  const hid = hospital?.id;
  const { data: ancVisits, loading: ancLoading, refresh: refreshAnc } = useHospitalModule<any>("anc_visits", "institution_id", hid, { orderBy: "visit_date", ascending: false });
  const { data: deliveries, loading: delLoading, refresh: refreshDel } = useHospitalModule<any>("deliveries", "institution_id", hid, { orderBy: "delivery_date", ascending: false });
  const { data: immunizations, loading: immLoading, refresh: refreshImm } = useHospitalModule<any>("immunizations", "institution_id", hid, { orderBy: "scheduled_date", ascending: true });
  const { patients, loading: patientsLoading } = useHospitalPatients(hid);
  const { nameFor } = usePatientNames([
    ...ancVisits.map((v) => v.patient_id),
    ...deliveries.map((d) => d.patient_id),
    ...immunizations.map((i) => i.patient_id),
  ]);

  const dueVaccines = immunizations.filter((i) => !i.administered_date);
  const upcomingDue = dueVaccines.filter((i) => (i.scheduled_date || "") <= todayISO()).length;

  const handleAddAnc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancForm.patient_id) { toast.error("Select a patient for this ANC visit"); return; }
    setIsSubmitting(true);
    try {
      const prior = ancVisits.filter((v) => v.patient_id === ancForm.patient_id).length;
      const { error: err } = await (supabase.from("anc_visits" as any) as any).insert({
        institution_id: hid,
        patient_id: ancForm.patient_id,
        visit_number: prior + 1,
        visit_date: ancForm.visit_date,
        gestational_age_weeks: numOrNull(ancForm.gestational_age_weeks),
        weight_kg: numOrNull(ancForm.weight_kg),
        bp_systolic: numOrNull(ancForm.bp_systolic),
        bp_diastolic: numOrNull(ancForm.bp_diastolic),
        hemoglobin: numOrNull(ancForm.hemoglobin),
        urine_protein: ancForm.urine_protein || null,
        fetal_heart_rate: numOrNull(ancForm.fetal_heart_rate),
        notes: ancForm.notes || null,
        next_visit_date: ancForm.next_visit_date || null,
      });
      if (err) throw err;
      toast.success(`ANC visit #${prior + 1} recorded`);
      setShowAnc(false);
      setAncForm({ patient_id: "", visit_date: todayISO(), gestational_age_weeks: "", weight_kg: "", bp_systolic: "", bp_diastolic: "", hemoglobin: "", urine_protein: "", fetal_heart_rate: "", notes: "", next_visit_date: "" });
      refreshAnc();
    } catch (e: any) { toast.error(e?.message || "Failed to record ANC visit"); }
    finally { setIsSubmitting(false); }
  };

  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryForm.patient_id) { toast.error("Select a patient for this delivery record"); return; }
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from("deliveries" as any) as any).insert({
        institution_id: hid,
        patient_id: deliveryForm.patient_id,
        delivery_date: deliveryForm.delivery_date,
        delivery_type: deliveryForm.delivery_type,
        birth_weight_kg: numOrNull(deliveryForm.birth_weight_kg),
        baby_gender: deliveryForm.baby_gender || null,
        apgar_score: numOrNull(deliveryForm.apgar_score),
        complications: deliveryForm.complications || null,
        attended_by: user?.user?.id || null,
      });
      if (err) throw err;
      toast.success("Delivery recorded");
      setShowDelivery(false);
      setDeliveryForm({ patient_id: "", delivery_date: todayISO(), delivery_type: "normal", birth_weight_kg: "", baby_gender: "", apgar_score: "", complications: "" });
      refreshDel();
    } catch (e: any) { toast.error(e?.message || "Failed to record delivery"); }
    finally { setIsSubmitting(false); }
  };

  const handleScheduleImmun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!immunForm.patient_id) { toast.error("Select a patient for this vaccination"); return; }
    if (!immunForm.vaccine_name.trim()) { toast.error("Enter the vaccine name"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("immunizations" as any) as any).insert({
        institution_id: hid,
        patient_id: immunForm.patient_id,
        vaccine_name: immunForm.vaccine_name.trim(),
        dose_number: Number(immunForm.dose_number) || 1,
        scheduled_date: immunForm.scheduled_date,
        batch_number: immunForm.batch_number || null,
      });
      if (err) throw err;
      toast.success("Vaccination scheduled");
      setShowImmun(false);
      setImmunForm({ patient_id: "", vaccine_name: "", dose_number: "1", scheduled_date: todayISO(), batch_number: "" });
      refreshImm();
    } catch (e: any) { toast.error(e?.message || "Failed to schedule vaccination"); }
    finally { setIsSubmitting(false); }
  };

  const markAdministered = async (row: any) => {
    setMarkingId(row.id);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error: err } = await (supabase.from("immunizations" as any) as any).update({
        administered_date: todayISO(),
        administered_by: user?.user?.id || null,
      }).eq("id", row.id);
      if (err) throw err;
      toast.success(`${row.vaccine_name} marked as administered`);
      refreshImm();
    } catch (e: any) { toast.error(e?.message || "Failed to mark as administered"); }
    finally { setMarkingId(null); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "anc", label: "ANC Visits", icon: <HeartPulse className="h-4 w-4" /> },
    { key: "deliveries", label: "Deliveries", icon: <Baby className="h-4 w-4" /> },
    { key: "immunizations", label: "Immunizations", icon: <Syringe className="h-4 w-4" />, badge: upcomingDue || undefined },
  ];

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const labelCls = "text-xs font-medium text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/60">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon}{t.label}
              {t.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-error-500 text-white">{t.badge}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeTab === "anc" && <button onClick={() => setShowAnc(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"><Plus className="h-4 w-4" />Record ANC Visit</button>}
          {activeTab === "deliveries" && <button onClick={() => setShowDelivery(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"><Plus className="h-4 w-4" />Record Delivery</button>}
          {activeTab === "immunizations" && <button onClick={() => setShowImmun(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"><Plus className="h-4 w-4" />Schedule Vaccination</button>}
        </div>
      </div>

      {/* ── ANC Visits ── */}
      {activeTab === "anc" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">ANC Visit History</h3>
            <button onClick={refreshAnc} className="p-1.5 rounded-md hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {ancLoading ? <ListSkeleton rows={4} /> : ancVisits.length === 0 ? (
            <EmptyState title="No ANC visits yet" description="Record the first antenatal visit to start the register." />
          ) : (
            <div className="divide-y divide-border">
              {ancVisits.map((v: any) => (
                <div key={v.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{nameFor(v.patient_id)} <span className="text-xs text-muted-foreground">· Visit #{v.visit_number}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.visit_date}
                      {v.gestational_age_weeks ? ` · ${v.gestational_age_weeks} wks` : ""}
                      {v.bp_systolic && v.bp_diastolic ? ` · BP ${v.bp_systolic}/${v.bp_diastolic}` : ""}
                      {v.weight_kg ? ` · ${v.weight_kg} kg` : ""}
                      {v.hemoglobin ? ` · Hb ${v.hemoglobin}` : ""}
                      {v.fetal_heart_rate ? ` · FHR ${v.fetal_heart_rate}` : ""}
                    </p>
                    {v.next_visit_date && <p className="text-xs text-primary-500 mt-0.5 flex items-center gap-1"><CalendarCheck className="h-3 w-3" />Next visit: {v.next_visit_date}</p>}
                    {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Deliveries ── */}
      {activeTab === "deliveries" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Delivery Register</h3>
            <button onClick={refreshDel} className="p-1.5 rounded-md hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {delLoading ? <ListSkeleton rows={4} /> : deliveries.length === 0 ? (
            <EmptyState title="No deliveries recorded" description="Record each delivery in the facility register." />
          ) : (
            <div className="divide-y divide-border">
              {deliveries.map((d: any) => (
                <div key={d.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{nameFor(d.patient_id)} <span className="text-xs text-muted-foreground">· {d.delivery_date}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {d.delivery_type}
                    {d.birth_weight_kg ? ` · ${d.birth_weight_kg} kg` : ""}
                    {d.baby_gender ? ` · ${d.baby_gender}` : ""}
                    {d.apgar_score != null ? ` · APGAR ${d.apgar_score}` : ""}
                  </p>
                  {d.complications && <p className="text-xs text-error-500 mt-1">Complications: {d.complications}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Immunizations ── */}
      {activeTab === "immunizations" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Immunization Register {dueVaccines.length > 0 && <span className="ml-1 text-xs text-error-500">({dueVaccines.length} pending)</span>}</h3>
            <button onClick={refreshImm} className="p-1.5 rounded-md hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {immLoading ? <ListSkeleton rows={4} /> : immunizations.length === 0 ? (
            <EmptyState title="No vaccinations scheduled" description="Schedule the first vaccination to build the immunization register." />
          ) : (
            <div className="divide-y divide-border">
              {immunizations.map((i: any) => (
                <div key={i.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{i.vaccine_name} <span className="text-xs text-muted-foreground">· Dose {i.dose_number}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {nameFor(i.patient_id)} · Scheduled {i.scheduled_date}
                      {i.administered_date ? ` · Given ${i.administered_date}` : ""}
                      {i.batch_number ? ` · Batch ${i.batch_number}` : ""}
                    </p>
                  </div>
                  {!i.administered_date ? (
                    <button
                      onClick={() => markAdministered(i)}
                      disabled={markingId === i.id}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md bg-success-500 text-white text-xs font-medium hover:bg-success-600 disabled:opacity-50"
                    >
                      {markingId === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Mark Given
                    </button>
                  ) : (
                    <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-success-500">Administered</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ANC dialog ── */}
      <Dialog open={showAnc} onOpenChange={setShowAnc}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record ANC Visit</DialogTitle></DialogHeader>
          <form onSubmit={handleAddAnc} className="space-y-3">
            <HospitalPatientSelect patients={patients} loading={patientsLoading} value={ancForm.patient_id} onChange={(id) => setAncForm({ ...ancForm, patient_id: id })} />
            <div className="grid grid-cols-2 gap-3">
              <div><p className={labelCls}>Visit date</p><input type="date" className={inputCls} value={ancForm.visit_date} onChange={(e) => setAncForm({ ...ancForm, visit_date: e.target.value })} required /></div>
              <div><p className={labelCls}>Gestational age (weeks)</p><input type="number" step="0.5" min="0" className={inputCls} value={ancForm.gestational_age_weeks} onChange={(e) => setAncForm({ ...ancForm, gestational_age_weeks: e.target.value })} /></div>
              <div><p className={labelCls}>Weight (kg)</p><input type="number" step="0.1" min="0" className={inputCls} value={ancForm.weight_kg} onChange={(e) => setAncForm({ ...ancForm, weight_kg: e.target.value })} /></div>
              <div><p className={labelCls}>Hemoglobin (g/dL)</p><input type="number" step="0.1" min="0" className={inputCls} value={ancForm.hemoglobin} onChange={(e) => setAncForm({ ...ancForm, hemoglobin: e.target.value })} /></div>
              <div><p className={labelCls}>BP systolic</p><input type="number" min="0" className={inputCls} value={ancForm.bp_systolic} onChange={(e) => setAncForm({ ...ancForm, bp_systolic: e.target.value })} /></div>
              <div><p className={labelCls}>BP diastolic</p><input type="number" min="0" className={inputCls} value={ancForm.bp_diastolic} onChange={(e) => setAncForm({ ...ancForm, bp_diastolic: e.target.value })} /></div>
              <div><p className={labelCls}>Urine protein</p><input className={inputCls} value={ancForm.urine_protein} onChange={(e) => setAncForm({ ...ancForm, urine_protein: e.target.value })} placeholder="e.g. trace, +" /></div>
              <div><p className={labelCls}>Fetal heart rate (bpm)</p><input type="number" min="0" className={inputCls} value={ancForm.fetal_heart_rate} onChange={(e) => setAncForm({ ...ancForm, fetal_heart_rate: e.target.value })} /></div>
              <div className="col-span-2"><p className={labelCls}>Next visit date</p><input type="date" className={inputCls} value={ancForm.next_visit_date} onChange={(e) => setAncForm({ ...ancForm, next_visit_date: e.target.value })} /></div>
              <div className="col-span-2"><p className={labelCls}>Notes</p><textarea className={inputCls} rows={2} value={ancForm.notes} onChange={(e) => setAncForm({ ...ancForm, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAnc(false)} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Save Visit
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delivery dialog ── */}
      <Dialog open={showDelivery} onOpenChange={setShowDelivery}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Delivery</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDelivery} className="space-y-3">
            <HospitalPatientSelect patients={patients} loading={patientsLoading} value={deliveryForm.patient_id} onChange={(id) => setDeliveryForm({ ...deliveryForm, patient_id: id })} />
            <div className="grid grid-cols-2 gap-3">
              <div><p className={labelCls}>Delivery date</p><input type="date" className={inputCls} value={deliveryForm.delivery_date} onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })} required /></div>
              <div>
                <p className={labelCls}>Delivery type</p>
                <select className={inputCls} value={deliveryForm.delivery_type} onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_type: e.target.value })}>
                  <option value="normal">Normal (SVD)</option>
                  <option value="caesarean">Caesarean section</option>
                  <option value="assisted">Assisted (vacuum/forceps)</option>
                </select>
              </div>
              <div><p className={labelCls}>Birth weight (kg)</p><input type="number" step="0.01" min="0" className={inputCls} value={deliveryForm.birth_weight_kg} onChange={(e) => setDeliveryForm({ ...deliveryForm, birth_weight_kg: e.target.value })} /></div>
              <div>
                <p className={labelCls}>Baby gender</p>
                <select className={inputCls} value={deliveryForm.baby_gender} onChange={(e) => setDeliveryForm({ ...deliveryForm, baby_gender: e.target.value })}>
                  <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
              <div><p className={labelCls}>APGAR score (0–10)</p><input type="number" min="0" max="10" className={inputCls} value={deliveryForm.apgar_score} onChange={(e) => setDeliveryForm({ ...deliveryForm, apgar_score: e.target.value })} /></div>
              <div className="col-span-2"><p className={labelCls}>Complications</p><textarea className={inputCls} rows={2} value={deliveryForm.complications} onChange={(e) => setDeliveryForm({ ...deliveryForm, complications: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowDelivery(false)} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Save Delivery
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Immunization dialog ── */}
      <Dialog open={showImmun} onOpenChange={setShowImmun}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Vaccination</DialogTitle></DialogHeader>
          <form onSubmit={handleScheduleImmun} className="space-y-3">
            <HospitalPatientSelect patients={patients} loading={patientsLoading} value={immunForm.patient_id} onChange={(id) => setImmunForm({ ...immunForm, patient_id: id })} />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><p className={labelCls}>Vaccine name</p><input className={inputCls} value={immunForm.vaccine_name} onChange={(e) => setImmunForm({ ...immunForm, vaccine_name: e.target.value })} placeholder="e.g. BCG, OPV-1, Penta-1" required /></div>
              <div><p className={labelCls}>Dose number</p><input type="number" min="1" className={inputCls} value={immunForm.dose_number} onChange={(e) => setImmunForm({ ...immunForm, dose_number: e.target.value })} /></div>
              <div><p className={labelCls}>Scheduled date</p><input type="date" className={inputCls} value={immunForm.scheduled_date} onChange={(e) => setImmunForm({ ...immunForm, scheduled_date: e.target.value })} required /></div>
              <div className="col-span-2"><p className={labelCls}>Batch number</p><input className={inputCls} value={immunForm.batch_number} onChange={(e) => setImmunForm({ ...immunForm, batch_number: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowImmun(false)} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Schedule
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

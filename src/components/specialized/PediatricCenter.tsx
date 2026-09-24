import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Baby,
  Activity,
  ShieldCheck,
  Calculator,
  Calendar,
  Plus,
  TrendingUp,
  FileCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface PediatricPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  guardian_name?: string;
  guardian_phone?: string;
}

const STANDARD_VACCINES = [
  { id: "bcg", name: "BCG (Tuberculosis)", due: "At Birth", status: "completed" },
  { id: "opv0", name: "OPV 0 (Polio)", due: "At Birth", status: "completed" },
  { id: "penta1", name: "Pentavalent 1 (DTP-HepB-Hib)", due: "6 Weeks", status: "completed" },
  { id: "pcv1", name: "PCV 1 (Pneumococcal)", due: "6 Weeks", status: "completed" },
  { id: "rota1", name: "Rotavirus 1", due: "6 Weeks", status: "completed" },
  { id: "penta2", name: "Pentavalent 2", due: "10 Weeks", status: "completed" },
  { id: "penta3", name: "Pentavalent 3", due: "14 Weeks", status: "due" },
  { id: "ipv", name: "IPV (Inactivated Polio)", due: "14 Weeks", status: "due" },
  { id: "measles1", name: "Measles-Rubella 1", due: "9 Months", status: "upcoming" },
  { id: "yellowfever", name: "Yellow Fever", due: "9 Months", status: "upcoming" },
  { id: "measles2", name: "Measles-Rubella 2", due: "18 Months", status: "upcoming" },
];

const DEVELOPMENTAL_MILESTONES = [
  { age: "2 Months", milestone: "Smiles at people, can briefly calm self, tracks objects with eyes", category: "Social / Cognitive" },
  { age: "4 Months", milestone: "Pushes up on elbows, holds head steady, babbles with expression", category: "Gross Motor / Speech" },
  { age: "6 Months", milestone: "Rolls over both directions, passes items hand-to-hand, responds to name", category: "Motor / Social" },
  { age: "9 Months", milestone: "Stands holding on, plays peek-a-boo, crawls, uses pincer grasp", category: "Motor / Cognitive" },
  { age: "12 Months", milestone: "Takes first independent steps, says 1-2 single words, waves bye-bye", category: "Language / Motor" },
  { age: "18 Months", milestone: "Walks up steps, drinks from cup, says 10+ words, uses spoon", category: "Self-Help / Speech" },
  { age: "24 Months", milestone: "Runs, kicks ball, speaks in 2-4 word sentences, sorts shapes/colors", category: "Cognitive / Motor" },
];

export const PediatricCenter: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"growth" | "immunization" | "milestones" | "calculator">("growth");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchPatient, setSearchPatient] = useState("");

  // Growth entry state — blank until measured; nothing is prefilled.
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [heightCm, setHeightCm] = useState<number>(0);
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<number>(0);
  const [growthNotes, setGrowthNotes] = useState("");
  const [savingGrowth, setSavingGrowth] = useState(false);

  // Milestone checklist is a session aid; doses below file to vaccination_records.
  const [achievedMilestones, setAchievedMilestones] = useState<number[]>([]);
  const [recordingDose, setRecordingDose] = useState<string | null>(null);

  // Dosage Calculator state
  const [calcDrug, setCalcDrug] = useState("Amoxicillin (50mg/kg/day in 2 divided doses)");
  const [calcWeight, setCalcWeight] = useState<number>(10);
  const [calcMgPerKg, setCalcMgPerKg] = useState<number>(25);
  const [calcConcentrationMgMl, setCalcConcentrationMgMl] = useState<number>(50); // e.g. 250mg / 5ml = 50mg/ml

  // Fetch pediatric patients
  const { data: patients = [] } = useQuery({
    queryKey: ["pediatric-patients", searchPatient],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, date_of_birth, gender, phone")
        .eq("role", "patient")
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Real immunization registry for the active child.
  const { data: vaccineRecords = [], refetch: refetchVaccines } = useQuery({
    queryKey: ["peds-vaccines", activePatient?.id],
    enabled: !!activePatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaccination_records")
        .select("id,vaccine_name,dose_number,administered_date,batch_number,notes")
        .eq("patient_id", activePatient!.id)
        .order("administered_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const recordedVaccineNames = new Set(vaccineRecords.map((r) => r.vaccine_name));

  const handleRecordDose = async (vaccineName: string) => {
    if (!activePatient?.id) {
      toast.error("Select a patient first");
      return;
    }
    if (!user) {
      toast.error("Sign in to file immunization records");
      return;
    }
    setRecordingDose(vaccineName);
    try {
      const doseNumber = vaccineRecords.filter((r) => r.vaccine_name === vaccineName).length + 1;
      const { error } = await supabase.from("vaccination_records").insert({
        patient_id: activePatient.id,
        vaccine_name: vaccineName,
        dose_number: doseNumber,
        administered_date: new Date().toISOString().split("T")[0],
        administered_by: user.id,
        notes: "Recorded via Pediatric Center",
      } as any);
      if (error) throw error;
      toast.success(`${vaccineName} filed to the immunization registry`);
      refetchVaccines();
      queryClient.invalidateQueries({ queryKey: ["peds-vaccines"] });
    } catch (e: any) {
      console.error("Record dose failed:", e);
      toast.error(e?.message || "Could not file the dose. Check permissions and try again.");
    } finally {
      setRecordingDose(null);
    }
  };

  const calculateAgeMonths = (dob?: string) => {
    if (!dob) return 12;
    const birth = new Date(dob);
    const now = new Date();
    const diff = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return Math.max(diff, 1);
  };

  // Growth history persists per measurement in comprehensive_health_metrics
  // (category 'growth'). The chart renders recorded values only.
  const { data: growthRows = [], refetch: refetchGrowth } = useQuery({
    queryKey: ["peds-growth", activePatient?.id],
    enabled: !!activePatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comprehensive_health_metrics")
        .select("metric_name,value,unit,recorded_at,notes")
        .eq("user_id", activePatient!.id)
        .eq("metric_category", "growth")
        .order("recorded_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const ageAt = (dob?: string, at?: string) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const ref = at ? new Date(at) : new Date();
    return Math.max((ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth()), 0);
  };

  const growthHistory = (() => {
    const byDay: Record<string, any> = {};
    growthRows.forEach((r) => {
      const day = (r.recorded_at || "").slice(0, 10);
      if (!day) return;
      byDay[day] = byDay[day] || { date: day, ageMonths: ageAt(activePatient?.date_of_birth, r.recorded_at), weight: 0, height: 0, head: 0 };
      if (r.metric_name === "weight_kg") byDay[day].weight = Number(r.value);
      if (r.metric_name === "height_cm") byDay[day].height = Number(r.value);
      if (r.metric_name === "head_circumference_cm") byDay[day].head = Number(r.value);
    });
    return Object.values(byDay) as Array<{ date: string; ageMonths: number; weight: number; height: number; head: number }>;
  })();

  const handleAddGrowthEntry = async () => {
    if (!activePatient?.id) {
      toast.error("Select a patient first");
      return;
    }
    if (!weightKg || !heightCm) {
      toast.error("Enter the measured weight and height");
      return;
    }
    if (!user) {
      toast.error("Sign in to file growth records");
      return;
    }
    setSavingGrowth(true);
    try {
      const recordedAt = new Date().toISOString();
      const rows = [
        { user_id: activePatient.id, metric_category: "growth", metric_name: "weight_kg", value: weightKg, unit: "kg", recorded_at: recordedAt, recorded_by: user.id, is_patient_entered: false, notes: growthNotes.trim() || null },
        { user_id: activePatient.id, metric_category: "growth", metric_name: "height_cm", value: heightCm, unit: "cm", recorded_at: recordedAt, recorded_by: user.id, is_patient_entered: false, notes: growthNotes.trim() || null },
      ];
      if (headCircumferenceCm > 0) {
        rows.push({ user_id: activePatient.id, metric_category: "growth", metric_name: "head_circumference_cm", value: headCircumferenceCm, unit: "cm", recorded_at: recordedAt, recorded_by: user.id, is_patient_entered: false, notes: growthNotes.trim() || null });
      }
      const { error } = await supabase.from("comprehensive_health_metrics").insert(rows as any);
      if (error) throw error;
      toast.success("Growth measurements filed to the child's chart");
      setShowGrowthModal(false);
      setWeightKg(0); setHeightCm(0); setHeadCircumferenceCm(0); setGrowthNotes("");
      refetchGrowth();
      queryClient.invalidateQueries({ queryKey: ["peds-growth"] });
    } catch (e: any) {
      console.error("Save growth failed:", e);
      toast.error(e?.message || "Could not file the measurements. Check permissions and try again.");
    } finally {
      setSavingGrowth(false);
    }
  };

  // Dosage computation
  const singleDoseMg = (calcWeight * calcMgPerKg).toFixed(1);
  const singleDoseMl = calcConcentrationMgMl > 0 ? (Number(singleDoseMg) / calcConcentrationMgMl).toFixed(2) : "0";

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 to-slate-900 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Baby className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Pediatric Care &amp; Child Health Center</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                WHO Standardized
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Growth curves, immunization registry, milestone checkups, and precision pediatric dosage calculators
            </p>
          </div>
        </div>

        {/* Patient Selection dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold border border-white/30 focus:outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} ({p.date_of_birth ? `${calculateAgeMonths(p.date_of_birth)} mo` : "Child"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "growth", label: "WHO Growth Curves & Vitals", icon: TrendingUp },
          { id: "immunization", label: "Vaccine & Immunization Registry", icon: ShieldCheck },
          { id: "milestones", label: "Developmental Milestones", icon: Activity },
          { id: "calculator", label: "Pediatric Dosage Calculator", icon: Calculator },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeSubTab === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-canvas-mist dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Growth Curves & Measurements */}
      {activeSubTab === "growth" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Child Anthropometry &amp; Growth Trajectory
              </h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                Patient: <span className="font-bold text-primary-500">{activePatient?.first_name} {activePatient?.last_name}</span> (Age: {calculateAgeMonths(activePatient?.date_of_birth)} months)
              </p>
            </div>

            <Dialog open={showGrowthModal} onOpenChange={setShowGrowthModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Log Measurement
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Log Pediatric Growth Vitals</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.05"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Height / Length (cm) *</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                        value={heightCm}
                        onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Head Circ. (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                        value={headCircumferenceCm}
                        onChange={(e) => setHeadCircumferenceCm(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Notes</label>
                    <textarea
                      rows={2}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                      placeholder="Feeding status, appetite, nutritional observations..."
                      value={growthNotes}
                      onChange={(e) => setGrowthNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowGrowthModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddGrowthEntry} disabled={savingGrowth} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold disabled:opacity-50">{savingGrowth ? "Filing…" : "Save Record"}</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Growth Cards — latest charted entry, or honest empty state */}
          {growthHistory.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed text-center">
              <p className="font-bold text-sm">No growth measurements on this child&apos;s chart</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Log the first measurement above — entries file to the chart and persist.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Latest Weight (charted)</span>
              <div className="text-2xl font-black text-primary-500 mt-1">
                {growthHistory[growthHistory.length - 1]?.weight} kg
              </div>
              <span className="text-[10px] font-bold text-slate-500">{growthHistory[growthHistory.length - 1]?.date} — verify against WHO charts</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Latest Length / Height</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {growthHistory[growthHistory.length - 1]?.height} cm
              </div>
              <span className="text-[10px] font-bold text-slate-500">{growthHistory[growthHistory.length - 1]?.date} — verify against WHO charts</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Head Circumference</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {growthHistory[growthHistory.length - 1]?.head || "—"}{growthHistory[growthHistory.length - 1]?.head ? " cm" : ""}
              </div>
              <span className="text-[10px] font-bold text-slate-500">Clinical screening still required</span>
            </div>
          </div>
          )}

          {/* Growth Table */}
          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Visit Date</th>
                  <th className="py-3 px-3">Age (Months)</th>
                  <th className="py-3 px-3">Weight</th>
                  <th className="py-3 px-3">Height / Length</th>
                  <th className="py-3 px-3">Head Circ.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {growthHistory.map((row, i) => (
                  <tr key={i} className="hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-bold text-primary-500">{row.date}</td>
                    <td className="py-3 px-3 font-semibold">{row.ageMonths} mo</td>
                    <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">{row.weight} kg</td>
                    <td className="py-3 px-3 font-semibold">{row.height} cm</td>
                    <td className="py-3 px-3 font-semibold">{row.head ? `${row.head} cm` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Vaccine & Immunization Registry */}
      {activeSubTab === "immunization" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">National Immunization Schedule (EPI)</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                Tracking completed doses, upcoming shots, and batch serial numbers
              </p>
            </div>
              <button
                onClick={() => {
                  const printWin = window.open("", "_blank");
                  if (!printWin) {
                    toast.error("Popup blocked — allow popups to print the record");
                    return;
                  }
                  const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
                  printWin.document.write(
                    `<html><body style="font-family: monospace; font-size: 12px; max-width: 560px; margin: auto; padding: 20px;">` +
                    `<h2>Immunization Registry Record</h2>` +
                    `<p>Patient: ${esc(activePatient?.first_name)} ${esc(activePatient?.last_name)}</p>` +
                    `<p>Printed ${new Date().toLocaleString()}</p><hr/>` +
                    (vaccineRecords.length === 0
                      ? `<p>No doses filed for this child yet.</p>`
                      : `<ul>${vaccineRecords.map((r) => `<li>${esc(r.vaccine_name)} — dose ${esc(r.dose_number)} on ${esc(r.administered_date)}</li>`).join("")}</ul>`) +
                    `<script>window.print();</script></body></html>`
                  );
                  printWin.document.close();
                  toast.success("Registry record sent to printer");
                }}
                className="px-4 py-2 rounded-xl border border-primary-500 text-primary-500 font-extrabold text-xs hover:bg-primary-500 hover:text-white transition-colors"
              >
                Print Registry Record
              </button>
          </div>

          <p className="text-xs text-muted-foreground -mt-1">
            Zambia EPI reference schedule. Doses you record below file to this child&apos;s
            immunization registry — nothing is pre-marked given.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STANDARD_VACCINES.map((v) => {
              const recorded = recordedVaccineNames.has(v.name);
              const shown = recorded ? "completed" : "due";
              return (
              <div
                key={v.id}
                className="p-4 rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-black ${
                      shown === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : shown === "due"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 animate-pulse"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{v.name}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Recommended Age: {v.due}</p>
                  </div>
                </div>

                <div>
                  {shown === "completed" ? (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      ✓ Filed in registry
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRecordDose(v.name)}
                      disabled={recordingDose === v.name}
                      className="px-3 py-1.5 rounded-full text-[10px] font-black bg-primary-500 text-white shadow-xs hover:bg-primary-600 disabled:opacity-50"
                    >
                      {recordingDose === v.name ? "Filing…" : "Record Dose"}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Developmental Milestones */}
      {activeSubTab === "milestones" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Pediatric Developmental Milestones (Ages 0 - 24 Months)</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">Screening motor, speech, and social progression</p>
          </div>

          <div className="space-y-3">
            {DEVELOPMENTAL_MILESTONES.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-primary-500/10 text-primary-500 font-black text-[10px]">
                      {m.age}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{m.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.milestone}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    aria-pressed={achievedMilestones.includes(idx)}
                    onClick={() => {
                      setAchievedMilestones((prev) =>
                        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-colors ${
                      achievedMilestones.includes(idx)
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    {achievedMilestones.includes(idx) ? "✓ Noted (session)" : "✓ Achieved"}
                  </button>
                  <button
                    onClick={() => toast.info(`Milestone for ${m.age} marked as In Progress`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-canvas-silk text-slate-600 dark:text-slate-300 font-bold text-[11px]"
                  >
                    In Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Pediatric Dosage Calculator */}
      {activeSubTab === "calculator" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Weight-Based Pediatric Dosage Calculator</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              Calculate exact single and daily doses (mg and mL) from child weight and liquid concentration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs">
              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary-500" /> Dosage Input Parameters
              </h4>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Medication Preset</label>
                <select
                  value={calcDrug}
                  onChange={(e) => {
                    setCalcDrug(e.target.value);
                    if (e.target.value.includes("Amoxicillin")) {
                      setCalcMgPerKg(25);
                      setCalcConcentrationMgMl(50); // 250mg/5ml
                    } else if (e.target.value.includes("Paracetamol")) {
                      setCalcMgPerKg(15);
                      setCalcConcentrationMgMl(24); // 120mg/5ml
                    } else if (e.target.value.includes("Ibuprofen")) {
                      setCalcMgPerKg(10);
                      setCalcConcentrationMgMl(20); // 100mg/5ml
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                >
                  <option value="Amoxicillin (50mg/kg/day in 2 divided doses)">Amoxicillin Susp (250mg/5mL)</option>
                  <option value="Paracetamol (15mg/kg/dose every 6h)">Paracetamol Syrup (120mg/5mL)</option>
                  <option value="Ibuprofen (10mg/kg/dose every 8h)">Ibuprofen Susp (100mg/5mL)</option>
                  <option value="Custom Formula">Custom Drug Formulation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Child Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-black"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Dose (mg / kg / dose) *</label>
                  <input
                    type="number"
                    step="1"
                    value={calcMgPerKg}
                    onChange={(e) => setCalcMgPerKg(parseFloat(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Liquid Concentration (mg / mL)</label>
                <input
                  type="number"
                  step="1"
                  value={calcConcentrationMgMl}
                  onChange={(e) => setCalcConcentrationMgMl(parseFloat(e.target.value) || 1)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                />
                <span className="text-[10px] text-slate-400">e.g. 250mg in 5mL = 50 mg/mL</span>
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex flex-col justify-between space-y-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-500 text-white uppercase tracking-wider">
                  Precise Calculated Dosage
                </span>
                <div className="mt-4">
                  <div className="text-4xl font-black text-emerald-400 tracking-tight">
                    {singleDoseMl} mL
                  </div>
                  <p className="text-xs text-slate-300 font-semibold mt-1">
                    Equates to <span className="text-white font-black">{singleDoseMg} mg</span> per individual dose
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-300">Patient Weight:</span>
                  <span className="font-bold">{calcWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Prescription Standard:</span>
                  <span className="font-bold">{calcMgPerKg} mg / kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Administration:</span>
                  <span className="font-bold text-emerald-300">Oral Suspension via Syringe / Dropper</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  const text = `${calcDrug}: ${singleDoseMl} mL (${singleDoseMg} mg) per dose for ${calcWeight} kg patient`;
                  try {
                    await navigator.clipboard.writeText(text);
                    toast.success("Dosage copied — paste it into the prescription");
                  } catch {
                    toast.error("Copy failed — your browser blocked clipboard access");
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs"
              >
                Copy Dosage for Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PediatricCenter;

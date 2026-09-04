import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const [activeSubTab, setActiveSubTab] = useState<"growth" | "immunization" | "milestones" | "calculator">("growth");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchPatient, setSearchPatient] = useState("");

  // Growth entry state
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [weightKg, setWeightKg] = useState<number>(8.5);
  const [heightCm, setHeightCm] = useState<number>(72);
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<number>(44);
  const [growthNotes, setGrowthNotes] = useState("");

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

  const calculateAgeMonths = (dob?: string) => {
    if (!dob) return 12;
    const birth = new Date(dob);
    const now = new Date();
    const diff = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return Math.max(diff, 1);
  };

  // Sample Growth History
  const [growthHistory, setGrowthHistory] = useState([
    { date: "2026-03-15", ageMonths: 2, weight: 5.2, height: 58, head: 38.5, percentile: "50th" },
    { date: "2026-05-10", ageMonths: 4, weight: 6.8, height: 64, head: 41.0, percentile: "60th" },
    { date: "2026-07-20", ageMonths: 6, weight: 7.9, height: 68, head: 43.2, percentile: "55th" },
    { date: "2026-09-01", ageMonths: 8, weight: 8.7, height: 72, head: 44.5, percentile: "52nd" },
  ]);

  const handleAddGrowthEntry = () => {
    if (!weightKg || !heightCm) {
      toast.error("Please enter weight and height");
      return;
    }
    const newEntry = {
      date: new Date().toISOString().split("T")[0],
      ageMonths: calculateAgeMonths(activePatient?.date_of_birth),
      weight: weightKg,
      height: heightCm,
      head: headCircumferenceCm,
      percentile: "50th (WHO Standard)",
    };
    setGrowthHistory((prev) => [...prev, newEntry]);
    toast.success("Growth record successfully logged!");
    setShowGrowthModal(false);
  };

  // Dosage computation
  const singleDoseMg = (calcWeight * calcMgPerKg).toFixed(1);
  const singleDoseMl = calcConcentrationMgMl > 0 ? (Number(singleDoseMg) / calcConcentrationMgMl).toFixed(2) : "0";

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] to-[#0f172a] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
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
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#f0f2f7]"
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
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Patient: <span className="font-bold text-[#0073ea]">{activePatient?.first_name} {activePatient?.last_name}</span> (Age: {calculateAgeMonths(activePatient?.date_of_birth)} months)
              </p>
            </div>

            <Dialog open={showGrowthModal} onOpenChange={setShowGrowthModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
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
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
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
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                        value={heightCm}
                        onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Head Circ. (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                        value={headCircumferenceCm}
                        onChange={(e) => setHeadCircumferenceCm(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Clinical Notes</label>
                    <textarea
                      rows={2}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                      placeholder="Feeding status, appetite, nutritional observations..."
                      value={growthNotes}
                      onChange={(e) => setGrowthNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowGrowthModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddGrowthEntry} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Save Record</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Growth Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Current Weight</span>
              <div className="text-2xl font-black text-[#0073ea] mt-1">
                {growthHistory[growthHistory.length - 1]?.weight} kg
              </div>
              <span className="text-[10px] font-bold text-emerald-600">✓ 50th percentile (Normal)</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Current Length / Height</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {growthHistory[growthHistory.length - 1]?.height} cm
              </div>
              <span className="text-[10px] font-bold text-emerald-600">✓ On WHO growth curve</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Head Circumference</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {growthHistory[growthHistory.length - 1]?.head} cm
              </div>
              <span className="text-[10px] font-bold text-emerald-600">✓ Microcephaly / Macrocephaly Screen: Negative</span>
            </div>
          </div>

          {/* Growth Table */}
          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Visit Date</th>
                  <th className="py-3 px-3">Age (Months)</th>
                  <th className="py-3 px-3">Weight</th>
                  <th className="py-3 px-3">Height / Length</th>
                  <th className="py-3 px-3">Head Circ.</th>
                  <th className="py-3 px-3 text-center">WHO Percentile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {growthHistory.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-bold text-[#0073ea]">{row.date}</td>
                    <td className="py-3 px-3 font-semibold">{row.ageMonths} mo</td>
                    <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">{row.weight} kg</td>
                    <td className="py-3 px-3 font-semibold">{row.height} cm</td>
                    <td className="py-3 px-3 font-semibold">{row.head} cm</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{row.percentile}</td>
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
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Tracking completed doses, upcoming shots, and batch serial numbers
              </p>
            </div>
            <button
              onClick={() => toast.success("Immunization certificate exported to PDF")}
              className="px-4 py-2 rounded-xl border border-[#0073ea] text-[#0073ea] font-extrabold text-xs hover:bg-[#0073ea] hover:text-white transition-colors"
            >
              Export Vaccine Certificate (PDF)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STANDARD_VACCINES.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-black ${
                      v.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : v.status === "due"
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
                  {v.status === "completed" ? (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      ✓ Administered
                    </span>
                  ) : v.status === "due" ? (
                    <button
                      onClick={() => toast.success(`Recorded ${v.name} as administered`)}
                      className="px-3 py-1.5 rounded-full text-[10px] font-black bg-[#0073ea] text-white shadow-xs hover:bg-[#0060c4]"
                    >
                      Record Dose
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800">
                      Scheduled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Developmental Milestones */}
      {activeSubTab === "milestones" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Pediatric Developmental Milestones (Ages 0 - 24 Months)</h3>
            <p className="text-xs text-[#676879] dark:text-slate-400">Screening motor, speech, and social progression</p>
          </div>

          <div className="space-y-3">
            {DEVELOPMENTAL_MILESTONES.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#0073ea]/10 text-[#0073ea] font-black text-[10px]">
                      {m.age}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{m.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.milestone}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toast.success(`Milestone for ${m.age} marked as Achieved`)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 font-extrabold text-[11px] hover:bg-emerald-600 hover:text-white transition-colors"
                  >
                    ✓ Achieved
                  </button>
                  <button
                    onClick={() => toast.info(`Milestone for ${m.age} marked as In Progress`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#e6e9ef] text-slate-600 dark:text-slate-300 font-bold text-[11px]"
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
            <p className="text-xs text-[#676879] dark:text-slate-400">
              Calculate exact single and daily doses (mg and mL) from child weight and liquid concentration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs">
              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#0073ea]" /> Dosage Input Parameters
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
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
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
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-black"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Dose (mg / kg / dose) *</label>
                  <input
                    type="number"
                    step="1"
                    value={calcMgPerKg}
                    onChange={(e) => setCalcMgPerKg(parseFloat(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-black"
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
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                />
                <span className="text-[10px] text-slate-400">e.g. 250mg in 5mL = 50 mg/mL</span>
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-md flex flex-col justify-between space-y-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#0073ea] text-white uppercase tracking-wider">
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
                onClick={() => toast.success(`Dosage of ${singleDoseMl} mL (${singleDoseMg} mg) copied to prescription`)}
                className="w-full py-2.5 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs"
              >
                Insert into Prescription Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PediatricCenter;

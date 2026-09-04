import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  Flame,
  Dumbbell,
  ClipboardList,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface JointROM {
  id: string;
  joint: string;
  movement: string;
  leftDegrees: number;
  rightDegrees: number;
  normalRange: string;
  notes?: string;
}

interface ExercisePlan {
  id: string;
  name: string;
  targetArea: string;
  sets: number;
  reps: string;
  frequency: string;
  equipment: string;
}

const DEFAULT_ROM_JOINTS: JointROM[] = [
  { id: "1", joint: "Shoulder", movement: "Flexion", leftDegrees: 140, rightDegrees: 175, normalRange: "0° - 180°", notes: "Mild impingement left" },
  { id: "2", joint: "Shoulder", movement: "Abduction", leftDegrees: 120, rightDegrees: 170, normalRange: "0° - 180°", notes: "Subacromial pain" },
  { id: "3", joint: "Knee", movement: "Flexion", leftDegrees: 130, rightDegrees: 135, normalRange: "0° - 140°", notes: "Good progress" },
  { id: "4", joint: "Knee", movement: "Extension", leftDegrees: 0, rightDegrees: 0, normalRange: "0°", notes: "Full terminal extension" },
  { id: "5", joint: "Lumbar Spine", movement: "Forward Flexion", leftDegrees: 60, rightDegrees: 60, normalRange: "0° - 80°", notes: "Hamstring tightness" },
  { id: "6", joint: "Cervical Spine", movement: "Rotation", leftDegrees: 65, rightDegrees: 80, normalRange: "0° - 80°", notes: "Trapezius spasm" },
];

export const PhysiotherapyCenter: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<"rom" | "pain" | "exercises" | "sessions">("rom");
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // ROM state
  const [romList, setRomList] = useState<JointROM[]>(DEFAULT_ROM_JOINTS);
  const [showAddROM, setShowAddROM] = useState(false);
  const [newJoint, setNewJoint] = useState({
    joint: "Shoulder",
    movement: "External Rotation",
    leftDegrees: 60,
    rightDegrees: 80,
    normalRange: "0° - 90°",
    notes: "",
  });

  // Pain Scale State
  const [painScore, setPainScore] = useState<number>(6);
  const [painLocation, setPainLocation] = useState<string>("Left Lumbar / Sacroiliac Joint");
  const [aggravatingFactors, setAggravatingFactors] = useState<string>("Prolonged sitting, bending forward");
  const [relievingFactors, setRelievingFactors] = useState<string>("Walking, heat packs, supine decompression");

  // Exercise Prescriptions
  const [exercises, setExercises] = useState<ExercisePlan[]>([
    { id: "ex-1", name: "Cat-Cow Lumbar Mobilization", targetArea: "Lower Back & Spine", sets: 3, reps: "10 reps", frequency: "2x daily", equipment: "Mat" },
    { id: "ex-2", name: "Theraband Scapular Retractions", targetArea: "Upper Back & Shoulder", sets: 3, reps: "15 reps", frequency: "Daily", equipment: "Green Band" },
    { id: "ex-3", name: "Quad Sets & Straight Leg Raises", targetArea: "Knee / Quadriceps", sets: 3, reps: "12 reps each", frequency: "Daily", equipment: "Ankle weight 1kg" },
    { id: "ex-4", name: "Glute Bridges with Core Brace", targetArea: "Pelvis / Posterior Chain", sets: 3, reps: "12 reps (3s hold)", frequency: "Daily", equipment: "Bodyweight" },
  ]);

  // Rehabilitation Sessions
  const [sessions, setSessions] = useState([
    { sessionNo: 1, date: "2026-08-15", painPre: 8, painPost: 5, modalities: "TENS (20m), Moist Heat, Manual Spine Mobilization Grade II", therapist: "Lead PT" },
    { sessionNo: 2, date: "2026-08-22", painPre: 6, painPost: 4, modalities: "Ultrasound 1.5W/cm², Myofascial Release, Core Activation", therapist: "Lead PT" },
    { sessionNo: 3, date: "2026-08-29", painPre: 5, painPost: 2, modalities: "Dry Needling glutes, Resistance Band Rehab, Cryotherapy", therapist: "Lead PT" },
  ]);

  const { data: patients = [] } = useQuery({
    queryKey: ["pt-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .eq("role", "patient")
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const handleAddROM = () => {
    setRomList((prev) => [
      ...prev,
      {
        id: `rom-${Date.now()}`,
        joint: newJoint.joint,
        movement: newJoint.movement,
        leftDegrees: newJoint.leftDegrees,
        rightDegrees: newJoint.rightDegrees,
        normalRange: newJoint.normalRange,
        notes: newJoint.notes,
      },
    ]);
    toast.success("Joint Range of Motion recorded");
    setShowAddROM(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0073ea] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Physiotherapy &amp; Rehabilitation Center</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-400 text-slate-950">
                Biomechanics &amp; ROM
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Goniometry, visual pain tracking, individualized exercise therapy regimens &amp; clinical progress documentation
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
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "rom", label: "Range of Motion (ROM Goniometry)", icon: Activity },
          { id: "pain", label: "Pain Assessment (VAS 0-10)", icon: Flame },
          { id: "exercises", label: "Rehabilitation Exercise Rx", icon: Dumbbell },
          { id: "sessions", label: "Therapy Session Records", icon: ClipboardList },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
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

      {/* 1. ROM Goniometry */}
      {activeTab === "rom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Joint Range of Motion (Goniometry Measurements)
              </h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Tracking joint flexibility, bilateral symmetry, and physical limitations
              </p>
            </div>

            <Dialog open={showAddROM} onOpenChange={setShowAddROM}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Add Joint Measurement
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Log Joint Goniometry (ROM)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold">Joint *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newJoint.joint}
                        onChange={(e) => setNewJoint({ ...newJoint, joint: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Movement *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newJoint.movement}
                        onChange={(e) => setNewJoint({ ...newJoint, movement: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold">Left Side (°)</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newJoint.leftDegrees}
                        onChange={(e) => setNewJoint({ ...newJoint, leftDegrees: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Right Side (°)</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newJoint.rightDegrees}
                        onChange={(e) => setNewJoint({ ...newJoint, rightDegrees: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold">Normal Range (°)</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      value={newJoint.normalRange}
                      onChange={(e) => setNewJoint({ ...newJoint, normalRange: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold">Clinical Notes</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      placeholder="End-feel, pain at end range, clicking..."
                      value={newJoint.notes}
                      onChange={(e) => setNewJoint({ ...newJoint, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowAddROM(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddROM} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Save ROM</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Joint &amp; Movement</th>
                  <th className="py-3 px-3">Left Side (Degrees)</th>
                  <th className="py-3 px-3">Right Side (Degrees)</th>
                  <th className="py-3 px-3">Standard Reference</th>
                  <th className="py-3 px-3">Clinical Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {romList.map((r) => {
                  const hasDeficit = Math.abs(r.leftDegrees - r.rightDegrees) > 15;
                  return (
                    <tr key={r.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">{r.joint}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{r.movement}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                        {r.leftDegrees}°
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-slate-100">
                        {r.rightDegrees}°
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-500">{r.normalRange}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {hasDeficit ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-black text-[10px]">
                              Asymmetric Deficit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-black text-[10px]">
                              Symmetric
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">{r.notes}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Visual Analog Pain Scale (VAS) */}
      {activeTab === "pain" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Visual Analog Pain Scale &amp; Functional Restrictions
            </h3>
            <p className="text-xs text-[#676879] dark:text-slate-400">
              Assessing severity from 0 (No Pain) to 10 (Worst Imaginable Pain)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-black text-sm">Visual Analog Scale (VAS): {painScore} / 10</label>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black text-white ${
                      painScore <= 3 ? "bg-emerald-500" : painScore <= 6 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                  >
                    {painScore <= 3 ? "Mild" : painScore <= 6 ? "Moderate" : "Severe"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScore}
                  onChange={(e) => setPainScore(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0073ea]"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                  <span>0 - No Pain</span>
                  <span>5 - Moderate</span>
                  <span>10 - Excruciating</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Anatomical Region / Location *</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                  value={painLocation}
                  onChange={(e) => setPainLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Aggravating Factors</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                  value={aggravatingFactors}
                  onChange={(e) => setAggravatingFactors(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Relieving Factors</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                  value={relievingFactors}
                  onChange={(e) => setRelievingFactors(e.target.value)}
                />
              </div>

              <button
                onClick={() => toast.success("Pain Assessment saved to clinical chart")}
                className="w-full py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold shadow-xs hover:bg-[#0060c4]"
              >
                Log Pain Assessment
              </button>
            </div>

            {/* Pain Trend Summary */}
            <div className="p-6 rounded-3xl bg-[#0f172a] text-white shadow-md flex flex-col justify-between space-y-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  Rehabilitation Trajectory
                </span>
                <div className="mt-4">
                  <div className="text-3xl font-black text-emerald-400">
                    -75% Pain Reduction
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Baseline at initial intake was VAS 8/10. Current baseline is VAS 2/10.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Functional Capacity:</span>
                  <span className="font-bold text-white">Able to sit for 90+ mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Target Discharge Score:</span>
                  <span className="font-bold text-emerald-300">VAS ≤ 1/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Treatment Phase:</span>
                  <span className="font-bold text-blue-300">Phase 3: Strengthening &amp; Return to Sport</span>
                </div>
              </div>

              <button
                onClick={() => toast.success("Exported Physical Therapy Progress Report (PDF)")}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs border border-white/20"
              >
                Export Progress Report (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Rehabilitation Exercise Prescriptions */}
      {activeTab === "exercises" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Prescribed Home &amp; Clinic Exercise Protocol
              </h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Customized therapeutic conditioning routine for active rehabilitation
              </p>
            </div>
            <button
              onClick={() => toast.success("Exercise Prescription sent to Patient Mobile App & WhatsApp")}
              className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs"
            >
              Share with Patient App
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#0073ea]/10 text-[#0073ea] font-black text-[10px]">
                    {ex.targetArea}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{ex.frequency}</span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4 text-[#0073ea]" />
                  <span>{ex.name}</span>
                </h4>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#e6e9ef] dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400">Sets:</span>
                    <div className="font-bold">{ex.sets} Sets</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Reps:</span>
                    <div className="font-bold">{ex.reps}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Equipment:</span>
                    <div className="font-bold text-[#0073ea]">{ex.equipment}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Therapy Sessions */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Clinical Session Logs &amp; Modality Applications
              </h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Treatment interventions, pre/post pain differentials, and manual adjustments
              </p>
            </div>
            <button
              onClick={() => {
                const nextSess = {
                  sessionNo: sessions.length + 1,
                  date: new Date().toISOString().split("T")[0],
                  painPre: 4,
                  painPost: 1,
                  modalities: "Deep Tissue Trigger Point, Eccentric Loading, Dynamic Balance Training",
                  therapist: "Lead PT",
                };
                setSessions([...sessions, nextSess]);
                toast.success(`Session #${nextSess.sessionNo} logged!`);
              }}
              className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Log Today's Session
            </button>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Session #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-center">Pre-VAS</th>
                  <th className="py-3 px-3 text-center">Post-VAS</th>
                  <th className="py-3 px-3">Modalities &amp; Interventions Applied</th>
                  <th className="py-3 px-3">Physiotherapist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {sessions.map((s) => (
                  <tr key={s.sessionNo} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-black text-[#0073ea]">Session #{s.sessionNo}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">{s.date}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{s.painPre}/10</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{s.painPost}/10</td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{s.modalities}</td>
                    <td className="py-3 px-3 font-semibold text-slate-500">{s.therapist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysiotherapyCenter;

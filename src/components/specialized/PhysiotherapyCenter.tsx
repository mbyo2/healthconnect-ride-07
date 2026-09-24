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

// Sample joint readings for demos — never shown as real records.
// The worksheet starts empty; samples load only via the opt-in button.
const SAMPLE_ROM_JOINTS: JointROM[] = [
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

  // ROM state — session worksheet only (no backend table exists yet)
  const [romList, setRomList] = useState<JointROM[]>([]);
  const [romSamplesLoaded, setRomSamplesLoaded] = useState(false);
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

  // Rehabilitation Sessions — session worksheet only (no backend table exists yet)
  const [sessions, setSessions] = useState([
  ] as Array<{ sessionNo: number; date: string; painPre: number; painPost: number; modalities: string; therapist: string }>);

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
    toast.success("Joint reading added to this session's worksheet (not saved to chart)");
    setShowAddROM(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-primary-500 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto">
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

      {/* 1. ROM Goniometry */}
      {activeTab === "rom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Joint Range of Motion (Goniometry Measurements)
              </h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                Tracking joint flexibility, bilateral symmetry, and physical limitations
              </p>
            </div>

            <Dialog open={showAddROM} onOpenChange={setShowAddROM}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
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
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                        value={newJoint.joint}
                        onChange={(e) => setNewJoint({ ...newJoint, joint: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Movement *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
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
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                        value={newJoint.leftDegrees}
                        onChange={(e) => setNewJoint({ ...newJoint, leftDegrees: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Right Side (°)</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                        value={newJoint.rightDegrees}
                        onChange={(e) => setNewJoint({ ...newJoint, rightDegrees: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold">Normal Range (°)</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                      value={newJoint.normalRange}
                      onChange={(e) => setNewJoint({ ...newJoint, normalRange: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold">Clinical Notes</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                      placeholder="End-feel, pain at end range, clicking..."
                      value={newJoint.notes}
                      onChange={(e) => setNewJoint({ ...newJoint, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowAddROM(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddROM} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold">Save ROM</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {romList.length === 0 && (
            <div className="p-8 rounded-2xl border border-dashed text-center">
              <p className="font-bold text-sm">No measurements this session</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Goniometry readings entered here stay in this session&apos;s worksheet until a
                clinical-record integration lands — they are not filed to any chart.
              </p>
              {!romSamplesLoaded && (
                <button
                  onClick={() => { setRomList(SAMPLE_ROM_JOINTS); setRomSamplesLoaded(true); }}
                  className="mt-3 px-4 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 text-xs font-extrabold text-primary-500 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Load sample data for demo
                </button>
              )}
            </div>
          )}

          {romList.length > 0 && (
          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Joint &amp; Movement</th>
                  <th className="py-3 px-3">Left Side (Degrees)</th>
                  <th className="py-3 px-3">Right Side (Degrees)</th>
                  <th className="py-3 px-3">Standard Reference</th>
                  <th className="py-3 px-3">Clinical Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {romList.map((r) => {
                  const hasDeficit = Math.abs(r.leftDegrees - r.rightDegrees) > 15;
                  return (
                    <tr key={r.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-800/60">
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
          )}
        </div>
      )}

      {/* 2. Visual Analog Pain Scale (VAS) */}
      {activeTab === "pain" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Visual Analog Pain Scale &amp; Functional Restrictions
            </h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              Assessing severity from 0 (No Pain) to 10 (Worst Imaginable Pain)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs">
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
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
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
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                  value={painLocation}
                  onChange={(e) => setPainLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Aggravating Factors</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                  value={aggravatingFactors}
                  onChange={(e) => setAggravatingFactors(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Relieving Factors</label>
                <textarea
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-medium"
                  value={relievingFactors}
                  onChange={(e) => setRelievingFactors(e.target.value)}
                />
              </div>

              <button
                onClick={() => toast.success(`VAS ${painScore}/10 noted in this session's worksheet (not filed to chart)`)}
                className="w-full py-2.5 rounded-xl bg-primary-500 text-white font-extrabold shadow-xs hover:bg-primary-600"
              >
                Log Pain Assessment
              </button>
            </div>

            {/* Pain Trend Summary — derived from this session's logged entries */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-md flex flex-col justify-between space-y-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  Session Worksheet
                </span>
                <div className="mt-4">
                  {sessions.length === 0 ? (
                    <>
                      <div className="text-3xl font-black text-slate-300">No sessions yet</div>
                      <p className="text-xs text-slate-300 mt-1">
                        Log sessions below to track pre/post pain across this worksheet.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-black text-emerald-400">
                        {sessions.length} session{sessions.length === 1 ? "" : "s"} logged
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Latest: VAS {sessions[sessions.length - 1].painPre}/10 →{" "}
                        {sessions[sessions.length - 1].painPost}/10 post-treatment.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Current VAS setting:</span>
                  <span className="font-bold text-white">{painScore}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Location:</span>
                  <span className="font-bold text-emerald-300">{painLocation || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Record status:</span>
                  <span className="font-bold text-blue-300">Session worksheet only</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const lines = [
                    "PHYSIOTHERAPY SESSION WORKSHEET (not a clinical record)",
                    `Date: ${new Date().toLocaleDateString()}`,
                    `Current VAS: ${painScore}/10 at ${painLocation || "unspecified site"}`,
                    "",
                    ...sessions.map(
                      (s) => `Session #${s.sessionNo} (${s.date}): VAS ${s.painPre} → ${s.painPost} — ${s.modalities}`
                    ),
                  ];
                  const printWin = window.open("", "_blank");
                  if (!printWin) {
                    toast.error("Popup blocked — allow popups to print the worksheet");
                    return;
                  }
                  printWin.document.write(
                    `<html><body style="font-family: monospace; font-size: 12px; max-width: 560px; margin: auto; padding: 20px;">` +
                    `<h2>Physiotherapy Session Worksheet</h2>` +
                    `<p>Printed ${new Date().toLocaleString()} — worksheet copy, not a filed clinical record.</p><hr/>` +
                    `<pre>${lines.join("\n")}</pre>` +
                    `<script>window.print();</script></body></html>`
                  );
                  printWin.document.close();
                  toast.success("Worksheet sent to printer");
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs border border-white/20"
              >
                Print Session Worksheet
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
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                Customized therapeutic conditioning routine for active rehabilitation
              </p>
            </div>
            <button
              onClick={async () => {
                const text = exercises
                  .map((ex) => `• ${ex.name} (${ex.targetArea}): ${ex.sets} sets × ${ex.reps}, ${ex.frequency} — ${ex.equipment}`)
                  .join("\n");
                const summary = `Exercise plan:\n${text}`;
                try {
                  await navigator.clipboard.writeText(summary);
                  toast.success("Exercise plan copied — paste it anywhere to share");
                } catch {
                  toast.error("Copy failed — your browser blocked clipboard access");
                }
              }}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white font-extrabold text-xs shadow-xs"
            >
              Copy Plan to Share
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-primary-500/10 text-primary-500 font-black text-[10px]">
                    {ex.targetArea}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{ex.frequency}</span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4 text-primary-500" />
                  <span>{ex.name}</span>
                </h4>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-canvas-silk dark:border-slate-800 text-[11px]">
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
                    <div className="font-bold text-primary-500">{ex.equipment}</div>
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
              <p className="text-xs text-graphite-500 dark:text-slate-400">
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
                toast.success(`Session #${nextSess.sessionNo} added to this worksheet (not filed to chart)`);
              }}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Log Today's Session
            </button>
          </div>

              <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Session #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-center">Pre-VAS</th>
                  <th className="py-3 px-3 text-center">Post-VAS</th>
                  <th className="py-3 px-3">Modalities &amp; Interventions Applied</th>
                  <th className="py-3 px-3">Physiotherapist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <p className="font-bold text-sm">No sessions logged this worksheet</p>
                      <p className="text-xs text-muted-foreground mt-1">Log today&apos;s session to start tracking pre/post pain here.</p>
                    </td>
                  </tr>
                )}
                {sessions.map((s) => (
                  <tr key={s.sessionNo} className="hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-black text-primary-500">Session #{s.sessionNo}</td>
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

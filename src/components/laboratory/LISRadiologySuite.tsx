import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TestTube2,
  Scan,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface LiveSample {
  id: string;
  barcode: string;
  patientName: string;
  testName: string;
  specimenType: string;
  collectionTime: string;
  analyzerResult: string;
  status: string;
  isUrgent: boolean;
}

interface LiveStudy {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
  bodyPart: string;
  studyDate: string;
  clinicalIndication: string;
  radiologistReport: string;
  status: string;
  imageUrl?: string | null;
}

/**
 * LIS + RIS backed by live lab_tests and radiology_requests. Verification
 * writes real statuses; the viewer shows real study images when filed and
 * says so plainly when none exist.
 */
export const LISRadiologySuite: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"lis" | "ris" | "dicom">("lis");
  const [samples, setSamples] = useState<LiveSample[]>([]);
  const [studies, setStudies] = useState<LiveStudy[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<LiveStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // DICOM Viewer tools state
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [inverted, setInverted] = useState<boolean>(false);
  const [preset, setPreset] = useState<"bone" | "soft" | "lung">("soft");

  const fetchAll = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [testsRes, radRes] = await Promise.all([
        supabase
          .from("lab_tests")
          .select(`
            id, test_number, test_type, sample_type, status, priority,
            result_summary, result, sample_collected_at, created_at,
            patient:profiles!lab_tests_patient_id_fkey(first_name, last_name)
          `)
          .eq("lab_id", institutionId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("radiology_requests")
          .select(`
            id, request_number, modality, body_part, status, report,
            notes, request_date, image_url,
            patient:profiles!radiology_requests_patient_id_fkey(first_name, last_name)
          `)
          .eq("hospital_id", institutionId)
          .order("request_date", { ascending: false })
          .limit(200),
      ]);
      if (testsRes.error) throw testsRes.error;
      if (radRes.error) throw radRes.error;

      setSamples(
        ((testsRes.data as any[]) || []).map((t: any) => {
          const resultText =
            t.result_summary ||
            (typeof t.result === "string" ? t.result : t.result ? JSON.stringify(t.result) : "Awaiting result");
          return {
            id: t.id,
            barcode: t.test_number || t.id.slice(0, 8),
            patientName: t.patient
              ? `${t.patient.first_name || ""} ${t.patient.last_name || ""}`.trim() || "Patient"
              : "Patient",
            testName: t.test_type || "Lab test",
            specimenType: t.sample_type || "—",
            collectionTime: t.sample_collected_at
              ? new Date(t.sample_collected_at).toLocaleString()
              : t.created_at
                ? new Date(t.created_at).toLocaleString()
                : "—",
            analyzerResult: resultText,
            status: t.status || "pending",
            isUrgent: ["urgent", "stat"].includes(String(t.priority || "").toLowerCase()),
          };
        })
      );

      const liveStudies = ((radRes.data as any[]) || []).map((r: any) => ({
        id: r.id,
        accessionNumber: r.request_number || r.id.slice(0, 8),
        patientName: r.patient
          ? `${r.patient.first_name || ""} ${r.patient.last_name || ""}`.trim() || "Patient"
          : "Patient",
        modality: r.modality || "—",
        bodyPart: r.body_part || "—",
        studyDate: r.request_date ? new Date(r.request_date).toLocaleDateString() : "—",
        clinicalIndication: r.notes || "—",
        radiologistReport: r.report || "Report pending",
        status: r.status || "ordered",
        imageUrl: r.image_url,
      }));
      setStudies(liveStudies);
      setSelectedStudy((prev) => {
        if (!prev) return liveStudies[0] || null;
        return liveStudies.find((s) => s.id === prev.id) || liveStudies[0] || null;
      });
    } catch (error) {
      console.error("Error loading LIS/RIS data:", error);
      toast.error("Failed to load laboratory data");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleVerifySample = async (id: string) => {
    setVerifyingId(id);
    try {
      const { error } = await (supabase.from("lab_tests" as any) as any)
        .update({
          status: "completed",
          verified_by: user?.id || null,
          results_date: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Result verified and published to the patient chart.");
      fetchAll();
    } catch (error: any) {
      console.error("Error verifying sample:", error);
      toast.error(error?.message || "Failed to verify sample");
    } finally {
      setVerifyingId(null);
    }
  };

  if (!institutionId) {
    return (
      <div className="p-8 rounded-3xl border border-dashed text-center text-sm text-muted-foreground">
        Laboratory suite needs an institution context — open this from a facility dashboard.
      </div>
    );
  }

  const criticalCount = samples.filter((s) => s.isUrgent && s.status !== "completed").length;

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <TestTube2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">LIS &amp; RIS Diagnostic Imaging Center</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-400 text-slate-950">
                Live Orders
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Laboratory accessioning &amp; radiology worklist with image viewer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
            {criticalCount} Urgent Lab Alert{criticalCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto" role="tablist" aria-label="Laboratory views">
        {[
          { id: "lis", label: "LIS Specimen Accessioning & Validation", icon: TestTube2 },
          { id: "ris", label: "RIS Radiology Orders & Worklist", icon: Scan },
          { id: "dicom", label: "Study Image Viewer", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
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

      {/* 1. LIS Specimen Accessioning */}
      {activeTab === "lis" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Laboratory Specimens &amp; Pathologist Worklist</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                {samples.length} order{samples.length === 1 ? "" : "s"} on record
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Sample Barcode</th>
                  <th className="py-3 px-3">Patient Name</th>
                  <th className="py-3 px-3">Test Panel &amp; Specimen</th>
                  <th className="py-3 px-3">Analyzer Value</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading specimens">Loading specimens…</td></tr>
                ) : samples.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center">
                    <p className="font-bold text-sm">No lab orders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Orders created in Lab Management appear here for validation.</p>
                  </td></tr>
                ) : (
                  samples.map((s) => (
                    <tr key={s.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-mono font-bold text-primary-500">{s.barcode}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{s.patientName}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold">{s.testName}</div>
                        <div className="text-[10px] text-slate-400">{s.specimenType} • Coll: {s.collectionTime}</div>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <span className={s.isUrgent ? "text-rose-600 font-black" : "text-slate-900 dark:text-slate-100"}>
                          {s.analyzerResult}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.status === "completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : s.isUrgent
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 animate-pulse"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.status !== "completed" ? (
                          <button
                            onClick={() => handleVerifySample(s.id)}
                            disabled={verifyingId === s.id}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[11px] shadow-xs"
                          >
                            {verifyingId === s.id ? "Verifying…" : "Verify & Sign"}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600">✓ Signed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. RIS Worklist */}
      {activeTab === "ris" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Radiology Information System (RIS) Worklist</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              {studies.length} imaging order{studies.length === 1 ? "" : "s"} on record
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="status" aria-label="Loading imaging orders">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" aria-hidden />
              ))}
            </div>
          ) : studies.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed text-center">
              <p className="font-bold text-sm">No imaging orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">Orders created in Lab Management appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studies.map((st) => (
                <div
                  key={st.id}
                  className="p-5 rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-primary-500/10 text-primary-500 font-mono font-black text-[10px]">
                        {st.modality}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{st.studyDate}</span>
                    </div>

                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">{st.bodyPart}</h4>
                    <p className="text-xs text-primary-500 font-bold mt-0.5">{st.patientName}</p>

                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-canvas-silk text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Radiology Findings:</span>
                      {st.radiologistReport}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 capitalize">{st.status}</span>
                    <button
                      onClick={() => {
                        setSelectedStudy(st);
                        setActiveTab("dicom");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Study
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Study Image Viewer */}
      {activeTab === "dicom" && (
        <div className="space-y-4">
          {!selectedStudy ? (
            <div className="p-10 rounded-3xl border border-dashed text-center">
              <p className="font-bold text-sm">No study selected</p>
              <p className="text-xs text-muted-foreground mt-1">Open a study from the RIS worklist to view its images.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Study Viewer • {selectedStudy.modality}: {selectedStudy.bodyPart}
                  </h3>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    Patient: <span className="font-bold text-primary-500">{selectedStudy.patientName}</span> • Acc: {selectedStudy.accessionNumber}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                    aria-label="Zoom out"
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk text-xs font-bold hover:bg-canvas-mist dark:hover:bg-slate-800"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                    aria-label="Zoom in"
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk text-xs font-bold hover:bg-canvas-mist dark:hover:bg-slate-800"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setInverted((inv) => !inv)}
                    aria-pressed={inverted}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                      inverted ? "bg-primary-500 text-white" : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    Invert
                  </button>
                  <select
                    value={preset}
                    aria-label="Image display preset"
                    onChange={(e) => setPreset(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                  >
                    <option value="soft">Window: Soft Tissue</option>
                    <option value="bone">Window: Bone High-Contrast</option>
                    <option value="lung">Window: Pulmonary Lung</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl bg-black border-4 border-slate-900 p-8 shadow-2xl min-h-[420px] flex items-center justify-center relative overflow-hidden">
                {selectedStudy.imageUrl ? (
                  <img
                    src={selectedStudy.imageUrl}
                    alt={`${selectedStudy.modality} study for ${selectedStudy.patientName}`}
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      filter: `${inverted ? "invert(100%)" : "none"} contrast(${preset === "bone" ? 180 : 120}%) brightness(${preset === "lung" ? 140 : 100}%)`,
                      transition: "transform 0.2s ease, filter 0.2s ease",
                    }}
                    className="max-h-[380px] object-contain"
                  />
                ) : (
                  <div className="text-center max-w-sm">
                    <Eye className="h-10 w-10 mx-auto text-slate-600 mb-3" aria-hidden />
                    <p className="font-bold text-sm text-slate-200">No image filed for this study yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      The order, report and status above are live. Images appear here once the
                      technologist attaches them.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Trust strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success-500" aria-hidden /> Verified results publish to charts</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-warning-500" aria-hidden /> Urgent priorities flagged</span>
        <Sparkles className="h-3.5 w-3.5 text-primary-500" aria-hidden />
      </div>
    </div>
  );
};

export default LISRadiologySuite;

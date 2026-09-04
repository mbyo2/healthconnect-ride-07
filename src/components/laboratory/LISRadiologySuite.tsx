import React, { useState } from "react";
import { toast } from "sonner";
import {
  TestTube2,
  Scan,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  SunMedium,
  Ruler,
  FileText,
  Plus,
  Search,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface LabSample {
  id: string;
  barcode: string;
  patientName: string;
  testName: string;
  specimenType: "Whole Blood" | "Serum" | "Urine" | "Sputum" | "Swab";
  collectionTime: string;
  analyzerResult: string;
  referenceRange: string;
  status: "Sample Collected" | "In Analysis" | "Pathologist Review" | "Verified";
  isCritical: boolean;
}

interface ImagingOrder {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: "X-Ray" | "CT Scan" | "MRI" | "Ultrasound";
  bodyPart: string;
  studyDate: string;
  slicesCount: number;
  clinicalIndication: string;
  radiologistReport: string;
  status: "Ordered" | "Images Acquired" | "Reported" | "Approved";
}

const DEFAULT_LAB_SAMPLES: LabSample[] = [
  { id: "lab-1", barcode: "BC-2026-8801", patientName: "Chanda Mulenga", testName: "Full Blood Count (FBC/CBC)", specimenType: "Whole Blood", collectionTime: "08:15 AM", analyzerResult: "Hb: 13.2 g/dL, WBC: 6.8x10^9/L, Plt: 280", referenceRange: "Hb: 12.0 - 15.5 g/dL", status: "Verified", isCritical: false },
  { id: "lab-2", barcode: "BC-2026-8802", patientName: "Mwamba Chileshe", testName: "Renal Function Profile (RFT / Urea & Creatinine)", specimenType: "Serum", collectionTime: "08:30 AM", analyzerResult: "Creatinine: 1.1 mg/dL, Urea: 24 mg/dL", referenceRange: "Creatinine: 0.6 - 1.2 mg/dL", status: "Verified", isCritical: false },
  { id: "lab-3", barcode: "BC-2026-8803", patientName: "Alice Njobvu", testName: "Serum Potassium (Electrolytes)", specimenType: "Serum", collectionTime: "08:45 AM", analyzerResult: "K+: 6.2 mmol/L (HIGH)", referenceRange: "K+: 3.5 - 5.1 mmol/L", status: "Pathologist Review", isCritical: true },
  { id: "lab-4", barcode: "BC-2026-8804", patientName: "Bwalya Zulu", testName: "Malaria Rapid Diagnostic (mRDT)", specimenType: "Whole Blood", collectionTime: "09:00 AM", analyzerResult: "Pf HRP2: POSITIVE", referenceRange: "Negative", status: "Verified", isCritical: false },
];

const DEFAULT_IMAGING_STUDIES: ImagingOrder[] = [
  { id: "rad-1", accessionNumber: "ACC-2026-041", patientName: "Felix Mwape", modality: "X-Ray", bodyPart: "Chest PA & Lateral", studyDate: "2026-09-01", slicesCount: 2, clinicalIndication: "Productive cough, fever, rule out pneumonia", radiologistReport: "Clear lung fields bilaterally. No focal consolidation, pneumothorax, or pleural effusion. Normal cardiothoracic ratio.", status: "Reported" },
  { id: "rad-2", accessionNumber: "ACC-2026-042", patientName: "Ruth Chiluba", modality: "MRI", bodyPart: "Lumbar Spine", studyDate: "2026-08-30", slicesCount: 48, clinicalIndication: "L4-L5 radiculopathy with lower extremity pain", radiologistReport: "L4-L5 disc desiccation with 4mm posterior protrusion indenting the thecal sac without cord compression.", status: "Approved" },
  { id: "rad-3", accessionNumber: "ACC-2026-043", patientName: "Grace Lungu", modality: "Ultrasound", bodyPart: "Abdomen & Pelvis", studyDate: "2026-09-01", slicesCount: 16, clinicalIndication: "Right upper quadrant discomfort", radiologistReport: "Normal liver echogenicity. Gallbladder is clear of calculi or wall thickening. Normal kidneys and spleen.", status: "Images Acquired" },
];

export const LISRadiologySuite: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<"lis" | "ris" | "dicom">("lis");
  const [samples, setSamples] = useState<LabSample[]>(DEFAULT_LAB_SAMPLES);
  const [studies, setStudies] = useState<ImagingOrder[]>(DEFAULT_IMAGING_STUDIES);
  const [selectedStudy, setSelectedStudy] = useState<ImagingOrder>(DEFAULT_IMAGING_STUDIES[0]);

  // DICOM Viewer tools state
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [inverted, setInverted] = useState<boolean>(false);
  const [preset, setPreset] = useState<"bone" | "soft" | "lung">("soft");
  const [contrast, setContrast] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(100);

  const handleVerifySample = (id: string) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Verified" } : s))
    );
    toast.success("Pathologist verification complete. Electronic result published to patient chart.");
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <TestTube2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">LIS &amp; RIS Diagnostic Imaging Center</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-400 text-slate-950">
                DICOM-Web &amp; LIMS Integrated
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Laboratory Information System (LIS) accessioning &amp; Radiology Information System (RIS) with PACS DICOM viewer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
            {samples.filter((s) => s.isCritical).length} Critical Lab Alerts
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "lis", label: "LIS Specimen Accessioning & Validation", icon: TestTube2 },
          { id: "ris", label: "RIS Radiology Orders & Worklist", icon: Scan },
          { id: "dicom", label: "Interactive DICOM PACS Viewer", icon: Eye },
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

      {/* 1. LIS Specimen Accessioning */}
      {activeTab === "lis" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Laboratory Specimens &amp; Pathologist Worklist</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Automated analyzer interface with critical panic value alerts</p>
            </div>
            <button
              onClick={() => toast.success("Batch verified and published 4 lab results")}
              className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs"
            >
              Verify All Results
            </button>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Sample Barcode</th>
                  <th className="py-3 px-3">Patient Name</th>
                  <th className="py-3 px-3">Test Panel &amp; Specimen</th>
                  <th className="py-3 px-3">Analyzer Value</th>
                  <th className="py-3 px-3">Reference Range</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {samples.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#0073ea]">{s.barcode}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{s.patientName}</td>
                    <td className="py-3 px-3">
                      <div className="font-extrabold">{s.testName}</div>
                      <div className="text-[10px] text-slate-400">{s.specimenType} • Coll: {s.collectionTime}</div>
                    </td>
                    <td className="py-3 px-3 font-bold">
                      <span className={s.isCritical ? "text-rose-600 font-black animate-pulse" : "text-slate-900 dark:text-slate-100"}>
                        {s.analyzerResult}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-500">{s.referenceRange}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          s.status === "Verified"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : s.isCritical
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 animate-pulse"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.status !== "Verified" ? (
                        <button
                          onClick={() => handleVerifySample(s.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs"
                        >
                          Verify &amp; Sign
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600">✓ Signed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. RIS Worklist */}
      {activeTab === "ris" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Radiology Information System (RIS) Worklist</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Imaging examinations, technician acquisition, and radiologist reports</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {studies.map((st) => (
              <div
                key={st.id}
                className="p-5 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#0073ea]/10 text-[#0073ea] font-mono font-black text-[10px]">
                      {st.modality}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{st.studyDate}</span>
                  </div>

                  <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">{st.bodyPart}</h4>
                  <p className="text-xs text-[#0073ea] font-bold mt-0.5">{st.patientName}</p>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#e6e9ef] text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Radiology Findings:</span>
                    {st.radiologistReport}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">{st.slicesCount} DICOM Slices</span>
                  <button
                    onClick={() => {
                      setSelectedStudy(st);
                      setActiveTab("dicom");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Launch PACS Viewer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DICOM-Web PACS Simulator Viewer */}
      {activeTab === "dicom" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                DICOM-Web PACS Viewer • {selectedStudy.modality}: {selectedStudy.bodyPart}
              </h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Patient: <span className="font-bold text-[#0073ea]">{selectedStudy.patientName}</span> • Acc: {selectedStudy.accessionNumber}
              </p>
            </div>

            {/* Viewer Tool Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-xs font-bold hover:bg-[#f0f2f7]"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-xs font-bold hover:bg-[#f0f2f7]"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setInverted((inv) => !inv)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                  inverted ? "bg-[#0073ea] text-white" : "bg-white dark:bg-slate-900"
                }`}
              >
                <SunMedium className="h-4 w-4" /> Invert
              </button>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
              >
                <option value="soft">Window: Soft Tissue</option>
                <option value="bone">Window: Bone High-Contrast</option>
                <option value="lung">Window: Pulmonary Lung</option>
              </select>
            </div>
          </div>

          {/* Interactive Screen Display */}
          <div className="rounded-3xl bg-[#000000] border-4 border-[#0f172a] p-8 shadow-2xl min-h-[420px] flex items-center justify-center relative overflow-hidden">
            {/* DICOM Overlay Metadata */}
            <div className="absolute top-4 left-4 text-[11px] font-mono text-emerald-400 space-y-0.5 pointer-events-none">
              <div>PATIENT: {selectedStudy.patientName.toUpperCase()}</div>
              <div>MODALITY: {selectedStudy.modality} ({selectedStudy.bodyPart})</div>
              <div>ZOOM: {zoomLevel}% • PRESET: {preset.toUpperCase()}</div>
            </div>

            <div className="absolute top-4 right-4 text-[11px] font-mono text-emerald-400 text-right pointer-events-none">
              <div>DOC' O CLOCK PACS SYSTEM</div>
              <div>LOSSLESS JPEG-2000 DICOM</div>
              <div>MATRIX: 2048 x 2048</div>
            </div>

            {/* Synthetic Anatomical Diagnostic Illustration */}
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                filter: `${inverted ? "invert(100%)" : "none"} contrast(${preset === "bone" ? 180 : 120}%) brightness(${preset === "lung" ? 140 : 100}%)`,
                transition: "transform 0.2s ease, filter 0.2s ease",
              }}
              className="w-72 h-80 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-800 to-black border-2 border-slate-700 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-32 h-44 rounded-3xl border-4 border-slate-400/80 bg-slate-800/60 relative flex items-center justify-center shadow-inner">
                <div className="w-8 h-32 rounded-full border-2 border-dashed border-slate-300/80" />
                <div className="absolute top-6 left-2 right-2 flex justify-between">
                  <div className="w-8 h-2 rounded-full bg-slate-400" />
                  <div className="w-8 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="absolute top-12 left-2 right-2 flex justify-between">
                  <div className="w-9 h-2 rounded-full bg-slate-400" />
                  <div className="w-9 h-2 rounded-full bg-slate-400" />
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-4">
                SIMULATED DICOM INSTANCE • SLICE 01 / {selectedStudy.slicesCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LISRadiologySuite;

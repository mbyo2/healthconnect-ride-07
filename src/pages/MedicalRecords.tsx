import { useState, useEffect } from "react";
import {
  FileText, Download, Upload, Calendar, User, Heart, Activity,
  ClipboardList, Pill, Bot, Sparkles, FolderHeart
} from "lucide-react";
import { getMedicalRecords, getHealthMetrics, type MedicalRecord, type HealthMetric } from "@/services/medicalRecords";
import { useNavigate } from "react-router-dom";
import { ComprehensiveMedicalRecords } from "@/components/patient/ComprehensiveMedicalRecords";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";
import { FHIRExportPanel } from "@/components/medical/FHIRExportPanel";
import PatientLabResults from "@/components/patient/PatientLabResults";
import PatientMAR from "@/components/patient/PatientMAR";

export default function MedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsData, metricsData] = await Promise.all([
          getMedicalRecords(),
          getHealthMetrics()
        ]);
        setRecords(recordsData);
        setHealthMetrics(metricsData);
      } catch (error) {
        console.error("Error fetching medical records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusPill = (status: string) => {
    switch (status) {
      case "Normal":
      case "Complete":
        return <span className="inline-block px-3 py-1 rounded-pill text-xs font-medium text-success-500 bg-success-50 border border-success-100">{status}</span>;
      case "Active":
        return <span className="inline-block px-3 py-1 rounded-pill text-xs font-medium text-primary-500 bg-primary-50 border border-primary-100">{status}</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-pill text-xs font-medium text-graphite-500 bg-graphite-50 border border-graphite-200">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Examination": return <User className="h-4 w-4 text-primary-500" />;
      case "Lab Results": return <Activity className="h-4 w-4 text-accent-500" />;
      case "Consultation": return <Heart className="h-4 w-4 text-success-500" />;
      case "Prescription": return <Pill className="h-4 w-4 text-warning-500" />;
      default: return <FileText className="h-4 w-4 text-primary-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="text-center font-bold text-xs text-[#676879]">
          Loading Electronic Health Records...
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
        {/* Top Header */}
        <div className="bg-white border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
          <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                <FolderHeart className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                  Patient Health Records Board
                  <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
                </h1>
                <p className="text-sm text-graphite-500 font-medium tracking-wide">
                  Centralized electronic medical records, lab results, prescriptions, and FHIR interoperability
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate('/ai-diagnostics')}
                className="vf-btn-secondary gap-2 text-sm"
              >
                <Bot className="h-4 w-4" />
                <span>AI Diagnostics</span>
              </button>
              <button className="px-3.5 py-2 rounded-md border border-[#c3c6d4] dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-[#f5f6f8]">
                <Upload className="h-4 w-4 text-[#676879]" />
                <span>Upload Document</span>
              </button>
              <button className="px-3.5 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all">
                <Download className="h-4 w-4" />
                <span>Export EHR Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* AI Insights for Medical Records */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <AIInsightsWidget
              context="records"
              data={{
                recordCount: records.length,
                metricsCount: healthMetrics.length
              }}
            />
          </div>

          {/* Comprehensive Medical Records Section */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <ComprehensiveMedicalRecords />
          </div>

          {/* Lab results + medication administration (live data) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <PatientLabResults />
            </div>
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <PatientMAR />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Records */}
            <div className="lg:col-span-2 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3 mb-4">
                <h2 className="font-extrabold text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#0073ea]" />
                  Recent Diagnostic & Consultation Records
                </h2>
                <span className="text-xs text-[#676879] font-bold">{records.length} records</span>
              </div>

              <div className="space-y-2">
                {records.length > 0 ? (
                  records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:bg-[#e5f0ff] dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-[#e6e9ef] dark:border-slate-800">
                          {getTypeIcon(record.type)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{record.title}</h3>
                          <p className="text-[11px] text-[#676879] dark:text-slate-400 font-medium mt-0.5">
                            {record.provider} • {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusPill(record.status)}
                        <button className="p-1.5 rounded-lg border border-[#c3c6d4] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-[#676879] font-medium">
                    No medical records found. Upload your first record!
                  </div>
                )}
              </div>
            </div>

            {/* Health Metrics & FHIR Export */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <FHIRExportPanel />
              </div>

              <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3 mb-4">
                  <h2 className="font-extrabold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#00c875]" />
                    Vital Sign Metrics
                  </h2>
                </div>

                <div className="space-y-3">
                  {healthMetrics.length > 0 ? (
                    healthMetrics.map((metric, index) => (
                      <div key={index} className="p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-xs text-slate-700 dark:text-slate-300">{metric.label}</p>
                          <p className="text-xl font-black font-mono text-[#0073ea]">{metric.value}</p>
                          <p className="text-[10px] text-[#676879] mt-0.5">{metric.date}</p>
                        </div>
                        <div>
                          {getStatusPill(metric.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-[#676879]">
                      No health metrics recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-3">Quick EHR Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => navigate('/appointments')}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:bg-[#e5f0ff] dark:hover:bg-slate-800 transition-colors text-xs font-extrabold"
              >
                <Calendar className="h-4 w-4 text-[#0073ea]" />
                <span>Schedule Checkup</span>
              </button>
              <button className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:bg-[#e5f0ff] dark:hover:bg-slate-800 transition-colors text-xs font-extrabold">
                <FileText className="h-4 w-4 text-[#a25ddc]" />
                <span>Request Records</span>
              </button>
              <button className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:bg-[#e5f0ff] dark:hover:bg-slate-800 transition-colors text-xs font-extrabold">
                <Upload className="h-4 w-4 text-[#fdab3d]" />
                <span>Upload Document</span>
              </button>
              <button
                onClick={() => navigate('/health-dashboard')}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 hover:bg-[#e5f0ff] dark:hover:bg-slate-800 transition-colors text-xs font-extrabold"
              >
                <Heart className="h-4 w-4 text-[#e2445c]" />
                <span>Health Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

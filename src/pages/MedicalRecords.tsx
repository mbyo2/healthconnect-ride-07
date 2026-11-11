import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText, Download, Upload, Calendar, User, Heart, Activity,
  ClipboardList, Pill, Bot, Sparkles, FolderHeart
} from "lucide-react";
import { getMedicalRecords, getHealthMetrics, type MedicalRecord, type HealthMetric } from "@/services/medicalRecords";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ComprehensiveMedicalRecords } from "@/components/patient/ComprehensiveMedicalRecords";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";
import { FHIRExportPanel } from "@/components/medical/FHIRExportPanel";
import { HealthHistoryTransfer } from "@/components/medical/HealthHistoryTransfer";
import { FHIRImportPanel } from "@/components/medical/FHIRImportPanel";
import { PatientPortal } from "@/components/patient/PatientPortal";
import NotificationPreferences from "@/components/patient/NotificationPreferences";
import GrowthChart from "@/components/clinical/GrowthChart";
import VaccinationSchedule from "@/components/clinical/VaccinationSchedule";
import { VitalsFlowsheet } from "@/components/clinical/VitalsFlowsheet";
import { ProblemList } from "@/components/clinical/ProblemList";
import { ClinicalReminders } from "@/components/clinical/ClinicalReminders";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard, SkeletonLine, SkeletonListRow } from "@/components/ui/skeleton-kit";
import PatientLabResults from "@/components/patient/PatientLabResults";
import PatientMAR from "@/components/patient/PatientMAR";
import PatientPHQ9History from "@/components/patient/PatientPHQ9History";
import { EmptyState } from "@/components/shared/EmptyState";

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  const downloadRecord = (record: MedicalRecord) => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medical-record-${record.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export the patient's full on-page EHR snapshot (records + health metrics)
  // as a single JSON file — previously this button had no handler at all.
  const exportAllRecords = () => {
    if (records.length === 0 && healthMetrics.length === 0) {
      toast.info("No records to export yet.");
      return;
    }
    const payload = {
      exported_at: new Date().toISOString(),
      medical_records: records,
      health_metrics: healthMetrics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dococlock-ehr-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("EHR data exported");
  };

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
        setLoadError(true);
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
        return <span className="inline-block px-3 py-1 rounded-pill text-xs font-medium text-muted-foreground bg-graphite-50 border border-graphite-200">{status}</span>;
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
      <div className="min-h-screen bg-background p-6 font-sans">
        <div className="max-w-content mx-auto space-y-4" role="status" aria-label="Loading your health records">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card px-5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonListRow key={i} className="border-b border-border py-4 last:border-0 " />
              ))}
            </div>
            <SkeletonCard className="h-64">
              <div className="space-y-3">
                <SkeletonLine className="h-5 w-1/2" />
                <SkeletonLine className="w-full" />
                <SkeletonLine className="w-5/6" />
                <SkeletonLine className="w-4/6" />
              </div>
            </SkeletonCard>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-3">
            <p className="font-semibold text-sm">We couldn&apos;t load your health records</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 min-h-[44px] rounded-full bg-gold hover:bg-gold-deep text-gold-ink text-xs font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-canvas text-foreground font-sans transition-colors pb-16">
        {/* Top Header */}
        <div className="doc-page-header px-4 sm:px-6 py-5">
          <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                <FolderHeart className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-greeting flex items-center gap-2">
                  My Health Records
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                </h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Your visits, lab results, and prescriptions in one place
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => navigate('/ai-diagnostics')}
                className="gap-2 min-h-[44px]"
              >
                <Bot className="h-4 w-4" />
                <span>AI diagnostics</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/ai-diagnostics')}
                title="Scan documents with AI"
                className="gap-1.5 min-h-[44px]"
              >
                <Upload className="h-4 w-4" />
                <span>Scan document</span>
              </Button>
              <Button
                onClick={exportAllRecords}
                className="gap-1.5 min-h-[44px]"
              >
                <Download className="h-4 w-4" />
                <span>Export EHR data</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-4 sm:px-6 pt-6 space-y-6">
          {/* AI Insights for Medical Records */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <AIInsightsWidget
              context="records"
              data={{
                recordCount: records.length,
                metricsCount: healthMetrics.length
              }}
            />
          </div>

          {/* Comprehensive Medical Records Section */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <ComprehensiveMedicalRecords />
          </div>

          {/* Lab results + medication administration (live data) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-4">
              <PatientLabResults />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <PatientMAR />
            </div>
          </div>

          {/* Mood screening history (PHQ-9) — standalone section */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <PatientPHQ9History />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Records */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary-500" />
                  Recent Diagnostic & Consultation Records
                </h2>
                <span className="text-xs text-muted-foreground font-semibold">{records.length} records</span>
              </div>

              <div className="divide-y divide-border">
                {records.length > 0 ? (
                  records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {getTypeIcon(record.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-xs text-foreground">{record.title}</h3>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {record.provider} • {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusPill(record.status)}
                        <button
                          onClick={() => downloadRecord(record)}
                          aria-label={`Download record: ${record.title}`}
                          title="Download record (JSON)"
                          className="p-3 min-h-[44px] min-w-[44px] rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      No medical records found yet. Records from your providers appear here automatically after each visit.
                    </p>
                    <button
                      onClick={() => navigate('/ai-diagnostics')}
                      className="px-5 py-2.5 min-h-[44px] rounded-full border border-border text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      Scan your first document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Health Metrics & FHIR Export */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-5">
                <FHIRExportPanel />
              </div>

              {user?.id && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <PatientPortal />
                </div>
              )}

              {user?.id && (
                <NotificationPreferences />
              )}

              {/* Pediatric growth tracking (self-hides for adults) */}
              {user?.id && (
                <GrowthChart patientId={user.id} />
              )}

              {/* EPI vaccination tracking (self-hides for adults) */}
              {user?.id && (
                <VaccinationSchedule patientId={user.id} />
              )}

              {user?.id && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <HealthHistoryTransfer patientId={user.id} />
                </div>
              )}

              {user?.id && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <FHIRImportPanel patientId={user.id} />
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-success-500" />
                    Vital Sign Metrics
                  </h2>
                </div>

                <div className="divide-y divide-border">
                  {healthMetrics.length > 0 ? (
                    healthMetrics.map((metric, index) => (
                      <div key={index} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-xs text-foreground">{metric.label}</p>
                          <p className="text-xl font-semibold font-mono text-primary-500">{metric.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{metric.date}</p>
                        </div>
                        <div>
                          {getStatusPill(metric.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={Activity}
                      title="No health metrics recorded yet"
                      description="Metrics from your visits and connected devices will appear here."
                      actionLabel="Record vitals"
                      onAction={() => navigate('/iot-monitoring')}
                    />
                  )}
                </div>
              </div>

              {user?.id && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <VitalsFlowsheet patientId={user.id} />
                </div>
              )}

              {user?.id && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <ProblemList patientId={user.id} canEdit={false} />
                </div>
              )}

              {user?.id && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <ClinicalReminders patientId={user.id} />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-3">Quick EHR Actions</h2>
            <div className="divide-y divide-border">
              <button
                onClick={() => navigate('/appointments')}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 transition-colors text-sm font-semibold text-left"
              >
                <Calendar className="h-4 w-4 text-primary-500" />
                <span>Schedule Checkup</span>
              </button>
              <button
                onClick={() => toast.info("Records from your providers appear here automatically after each visit.")}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 transition-colors text-sm font-semibold text-left">
                <FileText className="h-4 w-4 text-purple-500" />
                <span>Request Records</span>
              </button>
              <button
                onClick={() => navigate('/health-dashboard')}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 transition-colors text-sm font-semibold text-left"
              >
                <Heart className="h-4 w-4 text-error-500" />
                <span>Health Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

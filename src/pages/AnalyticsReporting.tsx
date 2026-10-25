// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, TrendingUp, Users, DollarSign, Activity, Download,
  Calendar, Filter, Settings, Eye, RefreshCw, Building2, Clock,
  FileText, PieChart, LineChart, CheckCircle, AlertTriangle
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

/**
 * Analytics & Reporting — data-source note (2026-10-20):
 *
 * This page used to read/write a `analytics_reports` table. That table does
 * NOT exist in the live database (verified 2026-10-20 via the Supabase REST
 * API: GET /rest/v1/analytics_reports -> 404 PGRST205 "Could not find the
 * table 'public.analytics_reports'"), so every fetch/insert failed and the
 * page could only ever show empty states.
 *
 * The page now computes everything from real, live-verified tables, scoped
 * to the viewer's institution and respecting RLS (all queries run as the
 * signed-in user):
 *   - appointments              (institution_id direct; id, patient_id,
 *                                provider_id, status, date, created_at)
 *   - payments                  (NO institution_id column live — scoped via
 *                                provider_id IN institution provider ids;
 *                                amount, status, created_at, payment_method)
 *   - institution_personnel     (user_id per institution — provider scope)
 *   - institution_staff         (provider_id per institution — provider scope)
 *   - institution_patient_registry (id per institution — registered patients)
 *   - lab_tests                 (institution_id direct; id, status, created_at)
 *   - comprehensive_prescriptions (NO institution_id column live — scoped via
 *                                provider_id IN institution provider ids)
 *
 * "Generated reports" are snapshots of those real aggregates for a chosen
 * date range. Because there is no reports table to persist them in, the
 * snapshots are kept in this browser (localStorage, per institution) and
 * can be viewed / downloaded as JSON. No query on this page touches a
 * non-existent table, so an institution admin sees real data with no
 * missing-table errors.
 */

interface AnalyticsReport {
  id: string;
  institution_id: string;
  report_name: string;
  report_type: string;
  report_category: string;
  generated_by?: string;
  generated_at: string;
  date_range_start: string;
  date_range_end: string;
  metrics_data: any;
  filters_applied: any;
  is_scheduled: boolean;
  schedule_frequency?: string;
  recipients: any[];
  file_url?: string;
}

interface LiveData {
  appointments: any[];
  payments: any[];
  prescriptions: any[];
  labTests: any[];
  patientCount: number;
  staffCount: number;
}

const EMPTY_LIVE: LiveData = {
  appointments: [],
  payments: [],
  prescriptions: [],
  labTests: [],
  patientCount: 0,
  staffCount: 0,
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;

/** PostgREST caps a single response (default 1000 rows) — page through with
 *  .range() so large institutions are not silently truncated. */
async function fetchPaged(build: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn("AnalyticsReporting: query failed", error.message);
      break;
    }
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

const isCollected = (status: string) =>
  ["paid", "completed", "successful", "success"].includes((status || "").toLowerCase());

/** 12 weekly buckets ending today. Returns oldest -> newest. */
function buildWeeklySeries(
  items: any[],
  dateOf: (item: any) => string | null | undefined,
  valueOf?: (item: any) => number
) {
  const DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: { week: string; count: number; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(today.getTime() - i * 7 * DAY);
    buckets.push({
      week: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: 0,
      total: 0,
    });
  }
  items.forEach((item) => {
    const raw = dateOf(item);
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    const weeksAgo = Math.floor((today.getTime() - d.getTime()) / (7 * DAY));
    if (weeksAgo < 0 || weeksAgo > 11) return;
    const bucket = buckets[11 - weeksAgo];
    bucket.count += 1;
    if (valueOf) bucket.total += valueOf(item) || 0;
  });
  return buckets;
}

const reportsStorageKey = (institutionId: string) =>
  `dococlock.analytics_reports.${institutionId}`;

function loadStoredReports(institutionId: string): AnalyticsReport[] {
  try {
    const raw = localStorage.getItem(reportsStorageKey(institutionId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeReports(institutionId: string, reports: AnalyticsReport[]) {
  try {
    localStorage.setItem(reportsStorageKey(institutionId), JSON.stringify(reports));
  } catch {
    /* storage unavailable — reports simply won't persist across reloads */
  }
}

export const AnalyticsReporting = () => {
  const navigate = useNavigate();
  const { institution, loading: institutionLoading } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [live, setLive] = useState<LiveData>(EMPTY_LIVE);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [viewedReport, setViewedReport] = useState<AnalyticsReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form states
  const [reportForm, setReportForm] = useState({
    report_name: "",
    report_type: "summary",
    report_category: "financial",
    date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_range_end: new Date().toISOString().split('T')[0],
    is_scheduled: false,
    schedule_frequency: "weekly",
  });

  useEffect(() => {
    if (institution) {
      fetchAnalyticsData();
    } else if (!institutionLoading) {
      // No institution context (and none coming) — stop the spinner so the
      // "Institution Required" card below can render.
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution?.id, institutionLoading]);

  /** Provider/user ids that belong to this institution, used to scope tables
   *  that have no institution_id column (payments, prescriptions). Sources:
   *  institution_personnel.user_id + institution_staff.provider_id, plus the
   *  institution owner (admin_id) and any provider seen on the institution's
   *  own appointments. */
  const resolveProviderIds = async (extra: string[] = []): Promise<string[]> => {
    if (!institution) return [];
    const ids = new Set<string>();
    if (institution.admin_id) ids.add(institution.admin_id);
    extra.forEach((id) => id && ids.add(id));

    const [personnelRes, staffRes] = await Promise.all([
      supabase.from("institution_personnel").select("user_id").eq("institution_id", institution.id),
      supabase.from("institution_staff").select("provider_id").eq("institution_id", institution.id).eq("is_active", true),
    ]);
    (personnelRes.data || []).forEach((r: any) => r.user_id && ids.add(r.user_id));
    (staffRes.data || []).forEach((r: any) => r.provider_id && ids.add(r.provider_id));
    return [...ids];
  };

  const fetchAnalyticsData = async () => {
    if (!institution) return;
    setLoading(true);
    try {
      setReports(loadStoredReports(institution.id));

      // 1. Institution-scoped appointments (direct institution_id).
      const appointmentsByInstitution = await fetchPaged((from, to) =>
        supabase
          .from("appointments")
          .select("id, patient_id, provider_id, status, date, created_at")
          .eq("institution_id", institution.id)
          .order("date", { ascending: true })
          .range(from, to)
      );

      // 2. Resolve the institution's providers, then pull appointments that
      //    carry one of them but no institution_id (marketplace bookings).
      const providerIds = await resolveProviderIds(
        appointmentsByInstitution.map((a: any) => a.provider_id)
      );
      let appointments = appointmentsByInstitution;
      if (providerIds.length > 0) {
        const byProvider = await fetchPaged((from, to) =>
          supabase
            .from("appointments")
            .select("id, patient_id, provider_id, status, date, created_at")
            .in("provider_id", providerIds)
            .order("date", { ascending: true })
            .range(from, to)
        );
        const seen = new Set(appointments.map((a: any) => a.id));
        appointments = [...appointments, ...byProvider.filter((a: any) => !seen.has(a.id))];
      }

      // 3. Payments + prescriptions have no institution_id — scope by provider.
      //    Lab tests and the patient registry scope by institution_id directly.
      const [payments, prescriptions, labTests, registryRes] = await Promise.all([
        providerIds.length > 0
          ? fetchPaged((from, to) =>
              supabase
                .from("payments")
                .select("id, amount, status, created_at, provider_id, patient_id, payment_method, currency")
                .in("provider_id", providerIds)
                .order("created_at", { ascending: true })
                .range(from, to)
            )
          : Promise.resolve([]),
        providerIds.length > 0
          ? fetchPaged((from, to) =>
              (supabase as any)
                .from("comprehensive_prescriptions")
                .select("id, provider_id, patient_id, status, created_at")
                .in("provider_id", providerIds)
                .order("created_at", { ascending: true })
                .range(from, to)
            )
          : Promise.resolve([]),
        fetchPaged((from, to) =>
          supabase
            .from("lab_tests")
            .select("id, institution_id, patient_id, status, created_at")
            .eq("institution_id", institution.id)
            .order("created_at", { ascending: true })
            .range(from, to)
        ),
        supabase
          .from("institution_patient_registry")
          .select("id", { count: "exact", head: true })
          .eq("institution_id", institution.id),
      ]);

      // Registered patients: registry count, falling back to the distinct
      // patients actually seen in this institution's appointments.
      let patientCount = registryRes.count ?? 0;
      if (registryRes.error || patientCount === 0) {
        const unique = new Set(appointments.map((a: any) => a.patient_id).filter(Boolean));
        if (unique.size > patientCount) patientCount = unique.size;
      }

      setLive({
        appointments,
        payments,
        prescriptions,
        labTests,
        patientCount,
        staffCount: providerIds.length,
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!institution) return;

    try {
      // Compute REAL metrics from the live aggregates already loaded for
      // this institution (appointments / payments / prescriptions / labs),
      // filtered to the requested date range.
      const startDate = reportForm.date_range_start;
      const endDate = reportForm.date_range_end;
      const inRange = (raw: string | null | undefined) => {
        if (!raw) return false;
        const day = String(raw).slice(0, 10);
        return day >= startDate && day <= endDate;
      };

      const appointments = live.appointments.filter((a: any) => inRange(a.date || a.created_at));
      const payments = live.payments.filter((p: any) => inRange(p.created_at));
      const prescriptions = live.prescriptions.filter((p: any) => inRange(p.created_at));
      const labTests = live.labTests.filter((t: any) => inRange(t.created_at));
      const collected = payments.filter((p: any) => isCollected(p.status));
      const totalRevenue = collected.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const metricsData = {
        period: { start: startDate, end: endDate },
        appointments: {
          total: appointments.length,
          completed: appointments.filter((a: any) => a.status === "completed").length,
          cancelled: appointments.filter((a: any) => a.status === "cancelled").length,
          scheduled: appointments.filter((a: any) => a.status === "scheduled").length,
        },
        revenue: {
          total: totalRevenue,
          currency: institution.currency || "ZMW",
          transaction_count: payments.length,
          collected_count: collected.length,
        },
        patients: {
          total_registered: live.patientCount,
        },
        prescriptions: {
          total: prescriptions.length,
        },
        lab_tests: {
          total: labTests.length,
        },
        generated_at: new Date().toISOString(),
      };

      const { data: userData } = await supabase.auth.getUser();
      const report: AnalyticsReport = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `report-${Date.now()}`,
        institution_id: institution.id,
        report_name: reportForm.report_name.trim() ||
          `${reportForm.report_category} ${reportForm.report_type} report`,
        report_type: reportForm.report_type,
        report_category: reportForm.report_category,
        generated_by: userData.user?.id,
        generated_at: new Date().toISOString(),
        date_range_start: startDate,
        date_range_end: endDate,
        metrics_data: metricsData,
        filters_applied: { date_range: { start: startDate, end: endDate } },
        is_scheduled: reportForm.is_scheduled,
        schedule_frequency: reportForm.is_scheduled ? reportForm.schedule_frequency : undefined,
        recipients: [],
      };

      const next = [report, ...reports];
      setReports(next);
      storeReports(institution.id, next);
      setShowReportDialog(false);
      toast.success("Report generated with real metrics");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    }
  };

  const handleDownloadReport = (report: AnalyticsReport) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.report_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "analytics-report"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "summary": return <BarChart3 className="h-4 w-4" />;
      case "detailed": return <FileText className="h-4 w-4" />;
      case "comparative": return <LineChart className="h-4 w-4" />;
      case "trend": return <TrendingUp className="h-4 w-4" />;
      default: return <PieChart className="h-4 w-4" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "summary": return "bg-primary-500";
      case "detailed": return "bg-success-500";
      case "comparative": return "bg-accent-500";
      case "trend": return "bg-warning-500";
      default: return "bg-graphite-500 dark:bg-slate-600";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "financial": return "bg-primary-500 text-white";
      case "operational": return "bg-success-500 text-white";
      case "clinical": return "bg-accent-500 text-white";
      case "patient": return "bg-warning-500 text-white";
      case "staff": return "bg-slate-500 text-white";
      default: return "bg-graphite-500 dark:bg-slate-600 text-white";
    }
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-primary-500" />
            <h2 className="text-xl font-semibold">Institution Required</h2>
            <p className="text-xs text-graphite-500 dark:text-slate-400">Please select an institution to access analytics and reporting.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-primary-500 hover:bg-primary-600">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currency = institution.currency || "ZMW";

  // ---- Live aggregates (real institution data) ----
  const collectedPayments = live.payments.filter((p: any) => isCollected(p.status));
  const totalRevenue = collectedPayments.reduce(
    (sum: number, p: any) => sum + (Number(p.amount) || 0), 0
  );
  const hasLiveData =
    live.appointments.length + live.payments.length + live.labTests.length +
      live.prescriptions.length > 0 || live.patientCount > 0;

  const scheduledReports = reports.filter((r) => r.is_scheduled).length;

  // Semantic theme palette for charts (primary / success / accent / warning / slate)
  const CATEGORY_COLORS: Record<string, string> = {
    financial: "#397DFF",
    operational: "#22C55E",
    clinical: "#F55C15",
    patient: "#F59E0B",
    staff: "#64748B",
  };
  const categoryActivity = [
    { name: "financial", value: live.payments.length },
    { name: "operational", value: live.appointments.length },
    { name: "clinical", value: live.labTests.length + live.prescriptions.length },
    { name: "patient", value: live.patientCount },
    { name: "staff", value: live.staffCount },
  ].map((entry) => ({ ...entry, fill: CATEGORY_COLORS[entry.name] ?? "#64748B" }));

  const appointmentsByStatus = Object.entries(
    live.appointments.reduce<Record<string, number>>((acc, a: any) => {
      const key = a.status || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  const activityOverTime = buildWeeklySeries(live.appointments, (a: any) => a.date || a.created_at)
    .map(({ week, count }) => ({ week, count }));
  const revenueOverTime = buildWeeklySeries(
    collectedPayments, (p: any) => p.created_at, (p: any) => Number(p.amount) || 0
  ).map(({ week, total }) => ({ week, revenue: total }));

  const revenueByMethod = Object.entries(
    collectedPayments.reduce<Record<string, number>>((acc, p: any) => {
      const key = p.payment_method || "other";
      acc[key] = (acc[key] ?? 0) + (Number(p.amount) || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const paymentStatusBars = [
    { name: "Collected", count: collectedPayments.length },
    {
      name: "Pending",
      count: live.payments.filter((p: any) =>
        ["pending", "processing", "initiated"].includes((p.status || "").toLowerCase())).length,
    },
    {
      name: "Failed / other",
      count: live.payments.filter((p: any) =>
        !isCollected(p.status) &&
        !["pending", "processing", "initiated"].includes((p.status || "").toLowerCase())).length,
    },
  ];

  const filteredReports = reports.filter((r) => {
    if (categoryFilter !== "all" && r.report_category !== categoryFilter) return false;
    if (searchQuery && !r.report_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">Analytics & Reporting</h1>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium truncate">Business Intelligence & Custom Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Generate Analytics Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Report Name</Label>
                    <Input
                      value={reportForm.report_name}
                      onChange={(e) => setReportForm({ ...reportForm, report_name: e.target.value })}
                      placeholder="e.g., Monthly Financial Summary"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Report Type</Label>
                      <Select
                        value={reportForm.report_type}
                        onValueChange={(value) => setReportForm({ ...reportForm, report_type: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="comparative">Comparative</SelectItem>
                          <SelectItem value="trend">Trend Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Category</Label>
                      <Select
                        value={reportForm.report_category}
                        onValueChange={(value) => setReportForm({ ...reportForm, report_category: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="clinical">Clinical</SelectItem>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Start Date</Label>
                      <Input
                        type="date"
                        value={reportForm.date_range_start}
                        onChange={(e) => setReportForm({ ...reportForm, date_range_start: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">End Date</Label>
                      <Input
                        type="date"
                        value={reportForm.date_range_end}
                        onChange={(e) => setReportForm({ ...reportForm, date_range_end: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Schedule Report</Label>
                      <input
                        type="checkbox"
                        checked={reportForm.is_scheduled}
                        onChange={(e) => setReportForm({ ...reportForm, is_scheduled: e.target.checked })}
                        className="mt-1"
                      />
                    </div>
                    {reportForm.is_scheduled && (
                      <div>
                        <Label className="text-xs font-bold">Schedule Frequency</Label>
                        <Select
                          value={reportForm.schedule_frequency}
                          onValueChange={(value) => setReportForm({ ...reportForm, schedule_frequency: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleGenerateReport} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold">
                    Generate Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        {/* KPI Cards — live institution aggregates */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Appointments</span>
                <Calendar className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-bold text-primary-500">{live.appointments.length}</div>
              <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Booked at this institution</div>
            </CardContent>
          </Card>
          <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Revenue Collected</span>
                <DollarSign className="h-4 w-4 text-success-500" />
              </div>
              <div className="text-2xl font-bold text-success-500">{currency} {totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">{collectedPayments.length} collected payments</div>
            </CardContent>
          </Card>
          <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Registered Patients</span>
                <Users className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-bold text-primary-500">{live.patientCount}</div>
              <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">In this institution's registry</div>
            </CardContent>
          </Card>
          <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Reports Generated</span>
                <FileText className="h-4 w-4 text-warning-500" />
              </div>
              <div className="text-2xl font-bold text-warning-500">{reports.length}</div>
              <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">{scheduledReports} scheduled</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Reports
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-2" /> Financial Analytics
            </TabsTrigger>
            <TabsTrigger value="operational" className="data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Operational Analytics
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {!hasLiveData ? (
              <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center space-y-2">
                  <BarChart3 className="h-8 w-8 mx-auto text-primary-500" />
                  <p className="text-sm font-semibold">No analytics yet</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    Appointments, payments and clinical activity for this institution will appear here as they happen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary-500" /> Appointments Over Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={2} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#397DFF" fill="#397DFF" fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-success-500" /> Appointments by Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={appointmentsByStatus}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#22C55E" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary-500" /> Activity by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryActivity} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {categoryActivity.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-primary-500" /> Category Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={categoryActivity.filter((e) => e.value > 0)} dataKey="value" nameKey="name" outerRadius={80} label>
                            {categoryActivity.filter((e) => e.value > 0).map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  type="search"
                  aria-label="Search reports"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-9 text-xs"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={fetchAnalyticsData}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-primary-500" />
                  <p className="text-sm font-semibold">No reports found</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    Generate your first analytics report to see it listed here.
                  </p>
                  <Button
                    onClick={() => setShowReportDialog(true)}
                    className="mt-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs min-h-[44px]"
                  >
                    <FileText className="h-4 w-4 mr-1.5" /> Generate report
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="border-canvas-silk dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${getReportTypeColor(report.report_type)} text-white flex items-center justify-center`}>
                          {getReportTypeIcon(report.report_type)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{report.report_name}</CardTitle>
                          <div className="text-xs text-graphite-500 dark:text-slate-400">
                            {new Date(report.generated_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {report.is_scheduled && (
                        <Badge className="bg-primary-500 text-white text-xs">Scheduled</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-graphite-500 dark:text-slate-400">Type</span>
                      <Badge variant="outline" className="text-xs">{report.report_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-graphite-500 dark:text-slate-400">Category</span>
                      <Badge className={getCategoryColor(report.report_category) + " text-xs"}>
                        {report.report_category}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-graphite-500 dark:text-slate-400">Date Range</span>
                      <span className="font-bold">
                        {report.date_range_start ? new Date(report.date_range_start).toLocaleDateString() : "—"} - {report.date_range_end ? new Date(report.date_range_end).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    {report.metrics_data?.appointments && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-graphite-500 dark:text-slate-400">Appointments in range</span>
                        <span className="font-bold">{report.metrics_data.appointments.total}</span>
                      </div>
                    )}
                    {report.metrics_data?.revenue && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-graphite-500 dark:text-slate-400">Revenue in range</span>
                        <span className="font-bold">
                          {report.metrics_data.revenue.currency} {Number(report.metrics_data.revenue.total || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                      <div className="text-xs text-graphite-500 dark:text-slate-400">
                        {(report.recipients || []).length} recipients
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="View report" onClick={() => setViewedReport(report)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Download report" onClick={() => handleDownloadReport(report)}>
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </TabsContent>

          {/* Financial Analytics Tab */}
          <TabsContent value="financial" className="space-y-4">
            {live.payments.length === 0 ? (
              <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center space-y-2">
                  <DollarSign className="h-8 w-8 mx-auto text-success-500" />
                  <p className="text-sm font-semibold">No payments yet</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    Financial analytics appear here once payments are recorded for this institution's providers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary-500" /> Collected Revenue by Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueByMethod}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => [`${currency} ${Number(v).toLocaleString()}`, "Collected"]} />
                            <Bar dataKey="value" fill="#397DFF" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary-500" /> Payments by Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={paymentStatusBars}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#22C55E" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-primary-500" /> Revenue Trend (last 12 weeks)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart data={revenueOverTime}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={2} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => [`${currency} ${Number(v).toLocaleString()}`, "Revenue"]} />
                          <Line type="monotone" dataKey="revenue" stroke="#397DFF" strokeWidth={2} dot={false} />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Operational Analytics Tab */}
          <TabsContent value="operational" className="space-y-4">
            {live.appointments.length + live.labTests.length + live.prescriptions.length === 0 ? (
              <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center space-y-2">
                  <Activity className="h-8 w-8 mx-auto text-primary-500" />
                  <p className="text-sm font-semibold">No operational data yet</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    Operational analytics appear here once appointments, lab tests or prescriptions are recorded for this institution.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary-500" /> Appointment Cadence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={activityOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={2} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#F55C15" strokeWidth={2} dot={false} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary-500" /> Appointments by Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={appointmentsByStatus}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#397DFF" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-canvas-silk dark:border-slate-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary-500" /> Clinical Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary-500">{live.labTests.length}</div>
                        <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Lab tests ordered</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success-500">{live.prescriptions.length}</div>
                        <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Prescriptions written</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-warning-500">{live.staffCount}</div>
                        <div className="text-xs text-graphite-500 dark:text-slate-400 font-bold mt-0.5">Providers & staff in scope</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View-report dialog: shows the stored snapshot's real metrics */}
      <Dialog open={!!viewedReport} onOpenChange={(open) => { if (!open) setViewedReport(null); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{viewedReport?.report_name}</DialogTitle>
          </DialogHeader>
          {viewedReport && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                {viewedReport.report_category} · {viewedReport.report_type} ·{" "}
                {new Date(viewedReport.date_range_start).toLocaleDateString()} –{" "}
                {new Date(viewedReport.date_range_end).toLocaleDateString()}
              </p>
              <pre className="max-h-[380px] overflow-auto rounded-lg bg-slate-50 dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 p-3 text-[11px] leading-relaxed">
                {JSON.stringify(viewedReport.metrics_data, null, 2)}
              </pre>
              <Button onClick={() => handleDownloadReport(viewedReport)} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold">
                <Download className="h-4 w-4 mr-2" /> Download JSON
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsReporting;

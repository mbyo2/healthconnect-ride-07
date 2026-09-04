import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Settings, Users, Calendar, UserRound,
  TrendingUp, FlaskConical, Pill, Heart, Stethoscope,
  Package, ShoppingCart, BarChart3, Truck, ClipboardList, Activity,
  Baby, Dumbbell, Ticket, Share2, Layers, ShieldCheck, Tv,
  DollarSign, Wrench, FileCode, Clock, CreditCard, Network,
  BookOpen, FileText, Calculator
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuickActions } from "@/components/institution/QuickActions";
import { RecentActivityFeed } from "@/components/institution/RecentActivityFeed";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// Specialized Components
import { PediatricCenter } from "@/components/specialized/PediatricCenter";
import { PhysiotherapyCenter } from "@/components/specialized/PhysiotherapyCenter";
import { DispensaryOperations } from "@/components/specialized/DispensaryOperations";
import { ERPPharmacyInventory } from "@/components/erp/ERPPharmacyInventory";
import { ERPAdministration } from "@/components/erp/ERPAdministration";
import { FHIRInteroperabilityHub } from "@/components/interoperability/FHIRInteroperabilityHub";
import { CentralizedQueueDesk } from "@/components/scheduling/CentralizedQueueDesk";
import { ClinicalProceduresDesk } from "@/components/clinical/ClinicalProceduresDesk";
import { LISRadiologySuite } from "@/components/laboratory/LISRadiologySuite";
import { CareManagementSuite } from "@/components/clinical/CareManagementSuite";
import { UnifiedPatientHub } from "@/components/patient/UnifiedPatientHub";
import AdvancedRevenueCycle from "@/components/rcm/AdvancedRevenueCycle";
import MultiCenterAuditSuite from "@/components/governance/MultiCenterAuditSuite";

// Per-type action configs
const TYPE_CONFIG: Record<string, {
  label: string; color: string; icon: React.ReactNode;
  primaryAction: { label: string; path: string; icon: React.ReactNode };
  quickLinks: { label: string; path: string; icon: React.ReactNode }[];
}> = {
  pharmacy: {
    label: "Pharmacy", color: "#0073ea", icon: <Pill className="h-5 w-5" />,
    primaryAction: { label: "Pharmacy Portal", path: "/pharmacy-portal", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "POS Billing", path: "/pharmacy-portal", icon: <ShoppingCart className="h-4 w-4" /> },
      { label: "Inventory", path: "/pharmacy-portal", icon: <Package className="h-4 w-4" /> },
      { label: "Deliveries", path: "/pharmacy-portal", icon: <Truck className="h-4 w-4" /> },
      { label: "Sales Report", path: "/pharmacy-portal", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  dispensary: {
    label: "Community Dispensary", color: "#00c875", icon: <Pill className="h-5 w-5" />,
    primaryAction: { label: "Dispensary POS", path: "/institution-dashboard?tab=dispensary", icon: <Pill className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Fast Dispense", path: "/institution-dashboard?tab=dispensary", icon: <Pill className="h-4 w-4" /> },
      { label: "Stock Ledger", path: "/institution-dashboard?tab=erp_stock", icon: <Package className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  pediatric_center: {
    label: "Pediatric Center", color: "#ec4899", icon: <Baby className="h-5 w-5" />,
    primaryAction: { label: "Child Health Center", path: "/institution-dashboard?tab=pediatrics", icon: <Baby className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Growth Curves", path: "/institution-dashboard?tab=pediatrics", icon: <Baby className="h-4 w-4" /> },
      { label: "Vaccines", path: "/institution-dashboard?tab=pediatrics", icon: <ShieldCheck className="h-4 w-4" /> },
      { label: "Dosage Calc", path: "/institution-dashboard?tab=pediatrics", icon: <Activity className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  physiotherapy: {
    label: "Physiotherapy & Rehab", color: "#6366f1", icon: <Dumbbell className="h-5 w-5" />,
    primaryAction: { label: "Rehab Center", path: "/institution-dashboard?tab=physio", icon: <Dumbbell className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "ROM Goniometry", path: "/institution-dashboard?tab=physio", icon: <Activity className="h-4 w-4" /> },
      { label: "Exercise Rx", path: "/institution-dashboard?tab=physio", icon: <Dumbbell className="h-4 w-4" /> },
      { label: "Sessions", path: "/institution-dashboard?tab=physio", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  laboratory: {
    label: "Laboratory", color: "#a25ddc", icon: <FlaskConical className="h-5 w-5" />,
    primaryAction: { label: "Lab Management", path: "/lab-management", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Test Requests", path: "/lab-management", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "LIS Suite", path: "/institution-dashboard?tab=lis_ris", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "Results", path: "/lab-management", icon: <Activity className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  hospital: {
    label: "Hospital", color: "#e44258", icon: <Heart className="h-5 w-5" />,
    primaryAction: { label: "Full HMS", path: "/hospital-management", icon: <Building2 className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "OPD Queue", path: "/hospital-management?tab=opd", icon: <Stethoscope className="h-4 w-4" /> },
      { label: "IPD / Beds", path: "/hospital-management?tab=ipd", icon: <Activity className="h-4 w-4" /> },
      { label: "Billing", path: "/hospital-management?tab=billing", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Enterprise Accounting", path: "/enterprise-accounting", icon: <BookOpen className="h-4 w-4" /> },
      { label: "ZRA Smart Invoice", path: "/zra-smart-invoice", icon: <FileText className="h-4 w-4" /> },
      { label: "PAYE Calculations", path: "/paye-calculations", icon: <Calculator className="h-4 w-4" /> },
      { label: "Medical Shift HR", path: "/medical-shift-hr", icon: <Clock className="h-4 w-4" /> },
      { label: "Multi-Center", path: "/multi-center", icon: <Network className="h-4 w-4" /> },
      { label: "Financial Controls", path: "/financial-controls", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Patient Flow", path: "/patient-flow", icon: <Activity className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  clinic: {
    label: "Clinic", color: "#00c875", icon: <Stethoscope className="h-5 w-5" />,
    primaryAction: { label: "HMS Portal", path: "/hospital-management", icon: <Building2 className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Appointments", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Financial Controls", path: "/financial-controls", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Patient Flow", path: "/patient-flow", icon: <Activity className="h-4 w-4" /> },
      { label: "Enhanced Inventory", path: "/enhanced-inventory", icon: <Package className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "ERP Stock", path: "/institution-dashboard?tab=erp_stock", icon: <Package className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  specialized_clinic: {
    label: "Specialised Clinic", color: "#00c875", icon: <Stethoscope className="h-5 w-5" />,
    primaryAction: { label: "HMS Portal", path: "/hospital-management", icon: <Building2 className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Appointments", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Procedure Management", path: "/procedure-management", icon: <Activity className="h-4 w-4" /> },
      { label: "Care Team", path: "/care-team", icon: <Users className="h-4 w-4" /> },
      { label: "Enhanced Diagnostics", path: "/enhanced-diagnostics", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Reports", path: "/institution/reports", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  nursing_home: {
    label: "Nursing Home", color: "#fdab3d", icon: <Heart className="h-5 w-5" />,
    primaryAction: { label: "Care Management", path: "/institution-dashboard?tab=care", icon: <Building2 className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Residents", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Care Beds", path: "/institution-dashboard?tab=care", icon: <Activity className="h-4 w-4" /> },
      { label: "Staff", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Appointments", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Reports", path: "/institution/reports", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
};

const DEFAULT_CONFIG = TYPE_CONFIG.clinic;

export const InstitutionDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { institution, loading: instLoading, isAdmin } = useInstitutionContext();
  const [counts, setCounts] = useState({ personnel: 0, appointments: 0, patients: 0, todayAppointments: 0, revenue: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tabName: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabName);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!institution) { setDataLoading(false); return; }

    const fetchDashboardData = async () => {
      try {
        const instId = institution.id;
        const today = format(new Date(), "yyyy-MM-dd");

        const [personnelRes, staffRes] = await Promise.all([
          supabase.from("institution_personnel").select("user_id", { count: "exact" }).eq("institution_id", instId),
          supabase.from("institution_staff").select("provider_id").eq("institution_id", instId).eq("is_active", true),
        ]);

        const personnelCount = personnelRes.count || 0;
        const providerIds = [
          ...(personnelRes.data?.map((p) => p.user_id) || []),
          ...(staffRes.data?.map((s) => s.provider_id) || []),
        ].filter((v, i, a) => a.indexOf(v) === i);

        let appointmentsCount = 0, todayCount = 0, appointmentActivities: any[] = [];
        if (providerIds.length > 0) {
          const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds);
          appointmentsCount = count || 0;
          const { count: todayC } = await supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).eq("date", today);
          todayCount = todayC || 0;
          const { data: recentAppts } = await supabase.from("appointments")
            .select("id, date, time, status, type, patient:profiles!patient_id(first_name, last_name)")
            .in("provider_id", providerIds).order("created_at", { ascending: false }).limit(10);
          appointmentActivities = (recentAppts || []).map((a: any) => ({
            id: a.id, type: "appointment" as const,
            title: `${a.patient?.first_name || ""} ${a.patient?.last_name || ""}`.trim() || "Patient",
            description: `${a.type?.replace(/_/g, " ")} - ${a.status}`,
            timestamp: `${a.date}T${a.time}`,
          }));
        }

        let uniquePatients = 0;
        if (providerIds.length > 0) {
          const { data: patientAppts } = await supabase.from("appointments").select("patient_id").in("provider_id", providerIds);
          uniquePatients = new Set((patientAppts || []).map((a: any) => a.patient_id)).size;
        }

        const months: { name: string; revenue: number; appointments: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const mStart = format(startOfMonth(d), "yyyy-MM-dd");
          const mEnd = format(endOfMonth(d), "yyyy-MM-dd");
          const mName = format(d, "MMM");
          let mCount = 0;
          if (providerIds.length > 0) {
            const { count: mc } = await supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).gte("date", mStart).lte("date", mEnd);
            mCount = mc || 0;
          }
          months.push({ name: mName, revenue: mCount * 150, appointments: mCount });
        }
        setChartData(months);
        setActivities(appointmentActivities);
        setCounts({ personnel: personnelCount || providerIds.length, appointments: appointmentsCount, patients: uniquePatients, todayAppointments: todayCount, revenue: months.reduce((s, m) => s + m.revenue, 0) });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [institution]);

  if (instLoading || dataLoading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-center space-y-3">
          <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
          <h2 className="text-xl font-extrabold">Setting Up Your Dashboard</h2>
          <p className="text-xs text-[#676879]">Your institution workspace is being prepared. Please refresh in a moment.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-md bg-[#0073ea] text-white text-xs font-bold">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[institution.type] || DEFAULT_CONFIG;

  const kpiCards = [
    { label: "Staff & Personnel", value: counts.personnel, sub: "Active members", color: "#0073ea", icon: <Users className="h-5 w-5" /> },
    { label: "Total Appointments", value: counts.appointments, sub: `${counts.todayAppointments} today`, color: "#a25ddc", icon: <Calendar className="h-5 w-5" /> },
    { label: "Unique Patients", value: counts.patients, sub: "All time", color: "#00c875", icon: <UserRound className="h-5 w-5" /> },
    { label: "Est. Revenue (6mo)", value: `${institution.currency || "ZMW"} ${(counts.revenue / 1000).toFixed(1)}k`, sub: "Activity-based", color: "#fdab3d", icon: <TrendingUp className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-xs" style={{ background: cfg.color }}>
              {cfg.icon}
            </div>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                {institution.name}
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${institution.is_verified ? "bg-[#00c875]" : "bg-[#fdab3d]"}`}>
                  {institution.is_verified ? "Verified" : "Pending"}
                </span>
              </h1>
              <p className="text-xs text-[#676879] font-medium">{cfg.label} Dashboard • ERPNext Integrated</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate("/kiosk")}
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
            >
              <Ticket className="h-3.5 w-3.5" /> Self-Service Kiosk
            </button>
            <button
              onClick={() => navigate("/queue-display")}
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
            >
              <Tv className="h-3.5 w-3.5" /> Public TV Screen
            </button>
            {isAdmin && (
              <button onClick={() => navigate("/institution/settings")} className="px-3 py-1.5 rounded-xl bg-[#f0f2f7] dark:bg-slate-800 font-bold text-xs flex items-center gap-1">
                <Settings className="h-3.5 w-3.5" /> Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Suite Tab Navigation */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#e6e9ef] dark:border-slate-800 scrollbar-none">
          {[
            { id: "overview", label: "Dashboard Overview", icon: Building2 },
            { id: "patients", label: "Patient Hub (Central MRN)", icon: UserRound },
            { id: "queue", label: "Queue & Calling Desk", icon: Ticket },
            { id: "pediatrics", label: "Pediatric Center", icon: Baby },
            { id: "physio", label: "Physiotherapy Center", icon: Dumbbell },
            { id: "dispensary", label: "Dispensary Operations", icon: Pill },
            { id: "care", label: "Care Management (OPD/IPD)", icon: Activity },
            { id: "erp_stock", label: "ERP Stock & Buying", icon: Package },
            { id: "erp_admin", label: "ERP Admin & Finance", icon: DollarSign },
            { id: "procedures", label: "Clinical Coding (ICD/CPT)", icon: Stethoscope },
            { id: "lis_ris", label: "LIS & RIS Imaging", icon: FlaskConical },
            { id: "fhir", label: "HL7 FHIR Interoperability", icon: Share2 },
            { id: "rcm", label: "Revenue Cycle & Insurance", icon: CreditCard },
            { id: "governance", label: "Multi-Center Governance", icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-[#676879] dark:text-slate-400 hover:bg-[#e8f1ff] hover:text-[#0073ea]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* 1. Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiCards.map((card) => (
                <div key={card.label} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-[#676879] uppercase">{card.label}</span>
                    <span style={{ color: card.color }}>{card.icon}</span>
                  </div>
                  <div className="text-2xl font-black font-mono" style={{ color: card.color }}>{card.value}</div>
                  <div className="text-[10px] text-[#676879] font-bold mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Type-specific Quick Navigation */}
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <p className="text-xs font-extrabold text-[#676879] uppercase mb-3">{cfg.label} Quick Access Modules</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {cfg.quickLinks.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-700 hover:border-[#0073ea] hover:bg-[#e8f1ff] dark:hover:bg-slate-800 transition-all group text-center"
                  >
                    <span className="h-8 w-8 rounded-lg bg-[#f0f2f7] dark:bg-slate-800 flex items-center justify-center text-[#676879] group-hover:text-[#0073ea] group-hover:bg-[#dbeafe] transition-colors">
                      {action.icon}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#0073ea]">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <QuickActions />
            </div>

            {/* Charts + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <h3 className="font-extrabold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Activity &amp; Revenue Trajectory (6 Months)
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [`${institution.currency || "ZMW"} ${value.toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill={cfg.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <RecentActivityFeed activities={activities} />
              </div>
            </div>
          </div>
        )}

        {/* 2. Patient Hub */}
        {activeTab === "patients" && <UnifiedPatientHub institutionId={institution.id} />}

        {/* 3. Queue & Live Calling Desk */}
        {activeTab === "queue" && <CentralizedQueueDesk institutionId={institution.id} />}

        {/* 4. Pediatric Center */}
        {activeTab === "pediatrics" && <PediatricCenter institutionId={institution.id} />}

        {/* 5. Physiotherapy Center */}
        {activeTab === "physio" && <PhysiotherapyCenter institutionId={institution.id} />}

        {/* 6. Dispensary Operations */}
        {activeTab === "dispensary" && <DispensaryOperations institutionId={institution.id} />}

        {/* 7. Care Management (OPD/IPD) */}
        {activeTab === "care" && <CareManagementSuite institutionId={institution.id} />}

        {/* 8. ERP Stock & Buying */}
        {activeTab === "erp_stock" && <ERPPharmacyInventory institutionId={institution.id} />}

        {/* 9. ERP Admin & Finance */}
        {activeTab === "erp_admin" && <ERPAdministration institutionId={institution.id} />}

        {/* 10. Clinical Coding (ICD/CPT) */}
        {activeTab === "procedures" && <ClinicalProceduresDesk institutionId={institution.id} />}

        {/* 11. LIS & RIS Imaging */}
        {activeTab === "lis_ris" && <LISRadiologySuite institutionId={institution.id} />}

        {/* 12. HL7 FHIR Interoperability */}
        {activeTab === "fhir" && <FHIRInteroperabilityHub patientId={institution.id} />}

        {/* 13. Revenue Cycle Management & Insurance */}
        {activeTab === "rcm" && (
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
            <AdvancedRevenueCycle />
          </div>
        )}

        {/* 14. Multi-Center Enterprise Governance & Cryptographic Audit */}
        {activeTab === "governance" && (
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
            <MultiCenterAuditSuite />
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionDashboard;


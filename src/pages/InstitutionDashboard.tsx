import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Settings, Users, Calendar, UserRound,
  TrendingUp, FlaskConical, Pill, Heart, Stethoscope,
  Package, ShoppingCart, BarChart3, Truck, ClipboardList, Activity,
  Baby, Dumbbell, Ticket, Share2, Layers, Tv,
  DollarSign, Wrench, FileCode, Clock, CreditCard, Network,
  BookOpen, FileText, Calculator, CheckCircle2, Hourglass, Droplet,
  Siren, BedDouble, HeartPulse, Scissors, Ambulance
} from "lucide-react";
import { SkeletonInstitutionDashboard } from "@/components/ui/skeleton-kit";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { InstitutionPageHeader } from "@/components/institution/InstitutionPageHeader";
import { archetypePalette } from "@/components/institution/archetypePalette";
import { QuickActions } from "@/components/institution/QuickActions";
import { RecentActivityFeed } from "@/components/institution/RecentActivityFeed";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { getFacilityArchetype, getTabRelevance, atypicalTabExplanation } from "@/config/facilityProfiles";
import { getEffectiveInstitutionModules, getModulePriceMap, formatModulePrice, type EffectiveModule, type ModulePrice } from "@/services/institutionModules";
import { getInstitutionSubscriptionGate, type SubscriptionGateState } from "@/services/subscriptionStatus";
import { SubscriptionExpiryBanner } from "@/components/subscription/SubscriptionExpiryBanner";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { getTabRule, type InstitutionTabKey } from "@/config/moduleTabMapping";
import { Lock } from "lucide-react";
import { PatientInstitutionManager } from "@/components/institution/PatientInstitutionManager";
import DuplicatePatients from "@/components/admin/DuplicatePatients";
import { DoctorFractionManager } from "@/components/billing/DoctorFractions";
import { LISMachineManager } from "@/components/lab/LISIntegration";
import { EmergencyTriage } from "@/components/hospital/EmergencyTriage";
import { ICU } from "@/components/hospital/ICU";
import { OTManagement } from "@/components/hospital/OTManagement";
import { AmbulanceStaffWorkflow } from "@/components/workflows/AmbulanceStaffWorkflow";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { format, subMonths, subDays, startOfMonth, startOfDay, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { MetricCard } from "@/components/shared/MetricCard";
import { TrendChart, SimpleBarChart, DonutChart } from "@/components/charts";
import { SuggestionBanner } from "@/components/guidance";

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
import { BloodBank } from "@/components/hospital/BloodBank";
import { FacilityJourneyCard } from "@/components/hospital/FacilityJourneyCard";
import { CareManagementSuite } from "@/components/clinical/CareManagementSuite";
import { UnifiedPatientHub } from "@/components/patient/UnifiedPatientHub";
import AdvancedRevenueCycle from "@/components/rcm/AdvancedRevenueCycle";
import MultiCenterAuditSuite from "@/components/governance/MultiCenterAuditSuite";

// Per-archetype action configs — keyed by facility ARCHETYPE (see
// facilityProfiles.ts), never by raw type strings, so every MOH Zambia
// level and private type resolves to a tailored dashboard.
interface ArchetypeConfig {
  label: string; color: string; icon: React.ReactNode;
  primaryAction: { label: string; path: string; icon: React.ReactNode };
  quickLinks: { label: string; path: string; icon: React.ReactNode }[];
}

const TYPE_CONFIG: Record<string, ArchetypeConfig> = {
  solo_practice: {
    label: "Solo Practice", color: archetypePalette.solo_practice, icon: <Stethoscope className="h-5 w-5" />,
    primaryAction: { label: "Day List", path: "/institution/appointments", icon: <Calendar className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Day List", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Prescriptions", path: "/prescriptions", icon: <Pill className="h-4 w-4" /> },
      { label: "Video Consults", path: "/video-consultations", icon: <Activity className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  pharmacy: {
    label: "Pharmacy", color: archetypePalette.pharmacy, icon: <Pill className="h-5 w-5" />,
    primaryAction: { label: "Pharmacy Portal", path: "/pharmacy-portal", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "POS Billing", path: "/pharmacy-portal", icon: <ShoppingCart className="h-4 w-4" /> },
      { label: "Fast Dispense", path: "/institution-dashboard?tab=dispensary", icon: <Pill className="h-4 w-4" /> },
      { label: "Inventory", path: "/pharmacy-portal", icon: <Package className="h-4 w-4" /> },
      { label: "Deliveries", path: "/pharmacy-portal", icon: <Truck className="h-4 w-4" /> },
      { label: "Sales Report", path: "/pharmacy-portal", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  wholesale_pharmacy: {
    label: "Wholesale Distribution", color: archetypePalette.wholesale_pharmacy, icon: <Truck className="h-5 w-5" />,
    primaryAction: { label: "Stock Control", path: "/pharmacy-inventory", icon: <Package className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Warehouse Stock", path: "/pharmacy-inventory", icon: <Package className="h-4 w-4" /> },
      { label: "Supply Orders", path: "/marketplace", icon: <ShoppingCart className="h-4 w-4" /> },
      { label: "ERP Stock", path: "/institution-dashboard?tab=erp_stock", icon: <Layers className="h-4 w-4" /> },
      { label: "Revenue", path: "/wallet", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Staff", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  diagnostics: {
    label: "Laboratory & Diagnostics", color: archetypePalette.diagnostics, icon: <FlaskConical className="h-5 w-5" />,
    primaryAction: { label: "Lab Management", path: "/lab-management", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Test Requests", path: "/lab-management", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "LIS Suite", path: "/institution-dashboard?tab=lis_ris", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "Results", path: "/lab-management", icon: <Activity className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  general_hospital: {
    label: "Hospital", color: archetypePalette.general_hospital, icon: <Heart className="h-5 w-5" />,
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
    label: "Clinic", color: archetypePalette.clinic, icon: <Stethoscope className="h-5 w-5" />,
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
  specialty_hospital: {
    label: "Specialised Facility", color: archetypePalette.specialty_hospital, icon: <Stethoscope className="h-5 w-5" />,
    primaryAction: { label: "HMS Portal", path: "/hospital-management", icon: <Building2 className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Appointments", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Procedure Management", path: "/procedure-management", icon: <Activity className="h-4 w-4" /> },
      { label: "Care Team", path: "/care-team", icon: <Users className="h-4 w-4" /> },
      { label: "Enhanced Diagnostics", path: "/enhanced-diagnostics", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "Pediatric Center", path: "/institution-dashboard?tab=pediatrics", icon: <Baby className="h-4 w-4" /> },
      { label: "Rehab Center", path: "/institution-dashboard?tab=physio", icon: <Dumbbell className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Reports", path: "/institution/reports", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  long_term_care: {
    label: "Long-Term Care", color: archetypePalette.long_term_care, icon: <Heart className="h-5 w-5" />,
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
  dialysis_centre: {
    label: "Dialysis Centre", color: archetypePalette.dialysis_centre, icon: <Activity className="h-5 w-5" />,
    primaryAction: { label: "Dialysis Schedule", path: "/institution/appointments", icon: <Calendar className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Dialysis Schedule", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Lab Results", path: "/lab-management", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "Prescriptions", path: "/prescriptions", icon: <Pill className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  dental_clinic: {
    label: "Dental Clinic", color: archetypePalette.dental_clinic, icon: <Stethoscope className="h-5 w-5" />,
    primaryAction: { label: "Day List", path: "/institution/appointments", icon: <Calendar className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Day List", path: "/institution/appointments", icon: <Calendar className="h-4 w-4" /> },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Prescriptions", path: "/prescriptions", icon: <Pill className="h-4 w-4" /> },
      { label: "Imaging", path: "/institution-dashboard?tab=lis_ris", icon: <Activity className="h-4 w-4" /> },
      { label: "Billing", path: "/wallet", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
  trauma_centre: {
    label: "Trauma & Emergency", color: archetypePalette.trauma_centre, icon: <Siren className="h-5 w-5" />,
    primaryAction: { label: "Emergency Triage", path: "/institution-dashboard?tab=emergency", icon: <Siren className="h-3.5 w-3.5" /> },
    quickLinks: [
      { label: "Emergency Triage", path: "/institution-dashboard?tab=emergency", icon: <Siren className="h-4 w-4" /> },
      { label: "Ambulance Dispatch", path: "/institution-dashboard?tab=ambulance", icon: <Truck className="h-4 w-4" /> },
      { label: "Operating Theatre", path: "/institution-dashboard?tab=theatre", icon: <Activity className="h-4 w-4" /> },
      { label: "IPD / Beds", path: "/institution-dashboard?tab=ipd", icon: <BedDouble className="h-4 w-4" /> },
      { label: "Imaging", path: "/institution-dashboard?tab=lis_ris", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "Blood Bank", path: "/institution-dashboard?tab=blood_bank", icon: <Droplet className="h-4 w-4" /> },
      { label: "Patients", path: "/institution/patients", icon: <UserRound className="h-4 w-4" /> },
      { label: "Personnel", path: "/institution/personnel", icon: <Users className="h-4 w-4" /> },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
};

const DEFAULT_CONFIG = TYPE_CONFIG.clinic;

/** Month-over-month trend from a 6-point series (real data, never static). */
function monthTrend(series: number[]): { value: number; isPositive: boolean } | undefined {
  if (series.length < 2) return undefined;
  const prev = series[series.length - 2] || 0;
  const last = series[series.length - 1] || 0;
  if (prev === 0) return last > 0 ? { value: 100, isPositive: true } : undefined;
  const pct = Math.round(((last - prev) / prev) * 1000) / 10;
  return { value: Math.abs(pct), isPositive: pct >= 0 };
}

export const InstitutionDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { institution, loading: instLoading, isAdmin } = useInstitutionContext();
  const [counts, setCounts] = useState({ personnel: 0, appointments: 0, patients: 0, todayAppointments: 0, revenue: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  // Dashboard fetch failure surface: without this, a failed fetch rendered
  // a dashboard of zeros indistinguishable from a new facility (audit F6).
  const [dataError, setDataError] = useState(false);
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  // Precise facility identity + effective modules (DB-driven). The exact
  // type chosen at signup (type_code) drives the archetype, the header
  // label and the module set — not the coarse enum in `type`. The module
  // set is the tier charter overlaid with per-institution admin entitlements
  // (see institutionModules service): admins can grant/suspend modules per
  // institution without a code change.
  const [preciseTypeLabel, setPreciseTypeLabel] = useState<string | null>(null);
  const [charter, setCharter] = useState<EffectiveModule[]>([]);
  const [modulePrices, setModulePrices] = useState<Record<string, ModulePrice>>({});
  // Subscription-expiry enforcement: effective status of the institution's
  // subscription (admin user's row). Drives the renewal banner and, via
  // getEffectiveInstitutionModules' subscriptionGate option, suspension of
  // PAID add-on modules when a paid subscription has lapsed. Fail-open:
  // no row / free / trial never blocks (see subscriptionStatus.ts).
  const [subscriptionGate, setSubscriptionGate] = useState<SubscriptionGateState | null>(null);
  // Real chart data (never static placeholders): weekly visit flow + visit-type mix.
  const [weeklyFlow, setWeeklyFlow] = useState<{ name: string; visits: number }[]>([]);
  const [visitMix, setVisitMix] = useState<{ name: string; value: number; color: string }[]>([]);

  // Module deep-links for chartered modules that are live in the app.
  const MODULE_PATHS: Record<string, string> = {
    patient_registration: "/institution/patients",
    appointments: "/institution/appointments",
    telehealth: "/video-dashboard",
    opd: "/hospital-management?tab=opd",
    prescriptions: "/prescriptions",
    laboratory: "/lab-management",
    pharmacy: "/pharmacy-portal",
    pharmacy_inventory: "/pharmacy-inventory",
    billing: "/hospital-management?tab=billing",
    hr_staff: "/institution/personnel",
    staff_management: "/institution/personnel",
    reports: "/institution/reports",
    ipd_wards: "/hospital-management?tab=ipd",
    emergency: "/hospital-management?tab=opd",
  };

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tabName: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabName);
    setSearchParams(next, { replace: true });
  };

  // Module entitlement enforcement: tabs locked unless their charter module is live
  const { canAccess, lockedTabs } = useModuleAccess(charter);

  // Redirect away from a locked tab (e.g. deep link to a revoked module)
  useEffect(() => {
    if (charter.length > 0 && activeTab !== "overview" && !canAccess(activeTab as InstitutionTabKey)) {
      setActiveTab("overview");
    }
  }, [charter, activeTab]);

  useEffect(() => {
    if (!institution) { setDataLoading(false); return; }

    const fetchDashboardData = async () => {
      try {
        setDataError(false);
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

        let appointmentsCount = 0, todayCount = 0, uniquePatients = 0;
        let appointmentActivities: any[] = [];
        const paidByMonth = new Map<string, number>();
        const monthCounts = [0, 0, 0, 0, 0, 0];

        if (providerIds.length > 0) {
          const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
          const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
          // Oldest → newest so index 0 = 5 months ago, index 5 = current month.
          const monthRanges = [5, 4, 3, 2, 1, 0].map((i) => {
            const d = subMonths(new Date(), i);
            return {
              name: format(d, "MMM"),
              start: format(startOfMonth(d), "yyyy-MM-dd"),
              end: format(endOfMonth(d), "yyyy-MM-dd"),
            };
          });

          // All independent reads fire together — one round trip batch instead
          // of ~12 sequential awaits.
          const [
            totalCount, todayApptCount, recentAppts,
            patientAppts, paidRows, flowRows, ...perMonthCounts
          ] = await Promise.all([
            supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).then((r) => r.count || 0),
            supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).eq("date", today).then((r) => r.count || 0),
            supabase.from("appointments")
              .select("id, date, time, status, type, patient:profiles!patient_id(first_name, last_name)")
              .in("provider_id", providerIds).order("created_at", { ascending: false }).limit(10)
              .then((r) => r.data || []),
            supabase.from("appointments").select("patient_id").in("provider_id", providerIds).limit(5000).then((r) => r.data || []),
            supabase.from("payments").select("amount, created_at").in("provider_id", providerIds).in("status", ["paid", "completed"]).gte("created_at", sixMonthsAgo).limit(2000).then((r) => r.data || []),
            supabase.from("appointments").select("date, type").in("provider_id", providerIds).gte("date", ninetyDaysAgo).limit(5000).then((r) => r.data || []),
            ...monthRanges.map((m) =>
              supabase.from("appointments").select("*", { count: "exact", head: true }).in("provider_id", providerIds).gte("date", m.start).lte("date", m.end).then((r) => r.count || 0)
            ),
          ]);

          appointmentsCount = totalCount;
          todayCount = todayApptCount;
          uniquePatients = new Set((patientAppts as any[]).map((a: any) => a.patient_id)).size;
          appointmentActivities = (recentAppts as any[]).map((a: any) => ({
            id: a.id, type: "appointment" as const,
            title: `${a.patient?.first_name || ""} ${a.patient?.last_name || ""}`.trim() || "Patient",
            description: `${String(a.type || "visit").replace(/_/g, " ")} - ${a.status}`,
            timestamp: `${a.date}T${a.time || "00:00"}`,
          }));

          (paidRows as any[]).forEach((p: any) => {
            const key = format(new Date(p.created_at), "MMM");
            paidByMonth.set(key, (paidByMonth.get(key) || 0) + (Number(p.amount) || 0));
          });
          perMonthCounts.forEach((c, i) => { monthCounts[i] = c; });

          // Weekly patient flow (last 7 days) + visit-type mix (last 90 days)
          // bucketed client-side from one query — real data, never static.
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const weekBuckets = [0, 0, 0, 0, 0, 0, 0];
          const weekStart = startOfDay(subDays(new Date(), 6));
          const typeBuckets = new Map<string, number>();
          (flowRows as any[]).forEach((r: any) => {
            const d = new Date(`${r.date}T00:00:00`);
            if (!isNaN(d.getTime()) && d >= weekStart) weekBuckets[d.getDay()] += 1;
            const t = String(r.type || "general").replace(/_/g, " ");
            typeBuckets.set(t, (typeBuckets.get(t) || 0) + 1);
          });
          setWeeklyFlow([1, 2, 3, 4, 5, 6, 0].map((i) => ({ name: dayNames[i], visits: weekBuckets[i] })));
          const TYPE_COLORS = ["#0066f5", "#00a86b", "#f59e0b", "#f55c15", "#737373", "#88b8fc"];
          setVisitMix(
            [...typeBuckets.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([name, value], i) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value,
                color: TYPE_COLORS[i % TYPE_COLORS.length],
              }))
          );
        }

        const months: { name: string; revenue: number; appointments: number }[] = [5, 4, 3, 2, 1, 0].map((i) => {
          const d = subMonths(new Date(), i);
          const mName = format(d, "MMM");
          return { name: mName, revenue: paidByMonth.get(mName) || 0, appointments: monthCounts[5 - i] };
        });
        setChartData(months);
        setActivities(appointmentActivities);
        setCounts({ personnel: personnelCount || providerIds.length, appointments: appointmentsCount, patients: uniquePatients, todayAppointments: todayCount, revenue: months.reduce((s, m) => s + m.revenue, 0) });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDataError(true);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [institution, fetchRetryCount]);

  // Load the precise facility type + its effective modules from the DB.
  // Effective = tier charter overlaid with this institution's admin-granted
  // entitlements (modular HMS: platform admins toggle modules per facility).
  useEffect(() => {
    if (!institution) return;
    let cancelled = false;
    (async () => {
      try {
        const [gate, priceMap] = await Promise.all([
          getInstitutionSubscriptionGate(supabase as any, institution.id).catch(() => null),
          getModulePriceMap(supabase as any).catch(() => ({} as Record<string, ModulePrice>)),
        ]);
        const { label, modules } = await getEffectiveInstitutionModules(
          supabase as any,
          institution.id,
          institution.type_code,
          { subscriptionGate: gate, modulePrices: priceMap }
        );
        if (cancelled) return;
        if (label) setPreciseTypeLabel(label);
        setCharter(modules);
        setModulePrices(priceMap);
        setSubscriptionGate(gate);
      } catch {
        /* modules are progressive enhancement — dashboard works without them */
      }
    })();
    return () => { cancelled = true; };
  }, [institution]);

  if (instLoading || dataLoading) {
    return (
      <div className="pb-16">
        <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-6" role="status" aria-label="Loading institution dashboard">
          <SkeletonInstitutionDashboard />
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-primary-500" />
          <h2 className="text-xl font-semibold text-foreground">Setting Up Your Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't load an institution workspace for this account. If you just
            registered a facility, refresh in a moment. If you're joining as staff,
            ask your institution administrator to send you a staff invitation.
          </p>
          <Button onClick={() => window.location.reload()} className="mx-auto">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Resolve by facility archetype from the PRECISE signup choice
  // (type_code), falling back to the coarse enum. Wholesale distributors
  // get their own config.
  const preciseType = (institution.type_code || institution.type || "").toLowerCase();
  const cfg =
    preciseType === 'wholesale_pharmacy'
      ? TYPE_CONFIG.wholesale_pharmacy
      : TYPE_CONFIG[getFacilityArchetype(preciseType)] || DEFAULT_CONFIG;
  const headerLabel = preciseTypeLabel || cfg.label;

  const kpiCards = [
    { label: "Staff & Personnel", value: counts.personnel, sub: "Active members", color: "primary", icon: <Users className="h-5 w-5" /> },
    { label: "Total Appointments", value: counts.appointments, sub: `${counts.todayAppointments} today`, color: "accent", icon: <Calendar className="h-5 w-5" /> },
    { label: "Unique Patients", value: counts.patients, sub: "All time", color: "success", icon: <UserRound className="h-5 w-5" /> },
    { label: "Revenue Collected (6mo)", value: `${institution.currency || "ZMW"} ${(counts.revenue / 1000).toFixed(1)}k`, sub: "Payments ledger", color: "warning", icon: <TrendingUp className="h-5 w-5" /> },
  ];

  // Mobile quick actions (PayPal app anatomy): the same actions the
  // desktop header card carries as buttons, as pale-circle actions.
  const mobileQuickActions = [
    {
      label: "Kiosk",
      ariaLabel: "Open self-service kiosk (new tab)",
      icon: <Ticket className="h-6 w-6" />,
      onClick: () => window.open(`/kiosk?institution=${institution.id}`, "_blank", "noopener"),
    },
    {
      label: "TV Screen",
      ariaLabel: "Open public TV display (new tab)",
      icon: <Tv className="h-6 w-6" />,
      onClick: () => window.open(`/queue-display?institution=${institution.id}`, "_blank", "noopener"),
    },
    {
      label: "Patients",
      ariaLabel: "Open the Patient Hub tab",
      icon: <UserRound className="h-6 w-6" />,
      onClick: () => setActiveTab("patients"),
    },
    isAdmin
      ? {
          label: "Settings",
          ariaLabel: "Open institution settings",
          icon: <Settings className="h-6 w-6" />,
          onClick: () => navigate("/institution/settings"),
        }
      : {
          label: "Bookings",
          ariaLabel: "Open institution appointments",
          icon: <Calendar className="h-6 w-6" />,
          onClick: () => navigate("/institution/appointments"),
        },
  ];

  return (
    <div className="pb-40 min-[1025px]:pb-16">
      {/* ─── Mobile head (PayPal APP anatomy, CEO screenshots 2026-11-11):
          bold greeting-style header (institution name + one grey subline
          — the badge pile-up stays on the desktop header card only),
          ONE sky hero card for today, then pale-circle quick actions.
          All three scroll away; only the tab bar sticks. md+ keeps the
          InstitutionPageHeader card exactly as it was. ─── */}
      <div className="md:hidden px-1 pb-5 space-y-5">
        <div>
          <h1 className="text-greeting text-foreground">{institution.name}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d")} · {institution.is_verified ? "Verified facility" : "Pending verification"} · {headerLabel} Dashboard
          </p>
        </div>

        <section
          aria-label="Today at your facility"
          className="rounded-[24px] bg-[#60CDFF] dark:bg-card border border-[#60CDFF] dark:border-border p-5 text-slate-950 dark:text-foreground"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-slate-900/70 dark:text-muted-foreground">
              Appointments today
            </p>
            <span className="h-9 w-9 rounded-full bg-white/30 dark:bg-muted flex items-center justify-center shrink-0" aria-hidden>
              {cfg.icon}
            </span>
          </div>
          <p className="text-heronum mt-2">{counts.todayAppointments}</p>
          <p className="text-[13px] text-slate-900/70 dark:text-muted-foreground mt-1.5">
            {counts.patients} patients · {counts.appointments} appointments · {institution.currency || "ZMW"} {(counts.revenue / 1000).toFixed(1)}k collected (6mo)
          </p>
        </section>

        <div className="flex items-start justify-between px-1">
          {mobileQuickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              aria-label={action.ariaLabel}
              className="flex flex-col items-center gap-1.5 w-16 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
            >
              <span className="h-14 w-14 rounded-full bg-pill text-pill-foreground flex items-center justify-center">
                {action.icon}
              </span>
              <span className="text-[12px] font-medium text-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Header + module tabs stick as ONE unit below the global header.
          They used to be two separate sticky bars at the same top offset
          (header card via .doc-page-header at z-40, tablist at z-20), so on
          scroll the tab pills slid under the stuck header card and were
          clipped in half (CEO phone screenshot, 2026-11-11). One wrapper
          sticks; the inner header is made static via [position:static]. */}
      <div className="sticky top-[var(--doc-sticky-top,0px)] z-40 bg-background">
      {/* Header */}
      <InstitutionPageHeader
        className="py-5 [position:static] max-md:hidden"
        icon={cfg.icon}
        iconClassName="bg-primary-500"
        iconStyle={{ background: cfg.color }}
        title={institution.name}
        badges={
          <>
            <StatusBadge tone={institution.is_verified ? "positive" : "warning"}>
              {institution.is_verified ? "Verified" : "Pending"}
            </StatusBadge>
            {isAdmin && (
              <StatusBadge tone="info">
                Super Admin
              </StatusBadge>
            )}
          </>
        }
        subtitle={
          <>
            {headerLabel} Dashboard{!institution.is_verified ? " — pending verification (full HMS is already set up)" : ""}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm"
              onClick={() => window.open(`/kiosk?institution=${institution.id}`, "_blank", "noopener")}
              className="gap-1.5"
              aria-label="Open self-service kiosk (new tab)"
            >
              <Ticket className="h-3.5 w-3.5" /> Self-Service Kiosk
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => window.open(`/queue-display?institution=${institution.id}`, "_blank", "noopener")}
              className="gap-1.5"
              aria-label="Open public TV display (new tab)"
            >
              <Tv className="h-3.5 w-3.5" /> Public TV Screen
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/institution/settings")} className="gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Settings
              </Button>
            )}
          </>
        }
      />

        {/* Main Suite Tab Navigation */}
        <div className="pt-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-2 border-b border-border scrollbar-none" role="tablist" aria-label="Institution modules">
          {[
            { id: "overview", label: "Dashboard Overview", icon: Building2 },
            { id: "patients", label: "Patient Hub (Central MRN)", icon: UserRound },
            { id: "queue", label: "Queue & Calling Desk", icon: Ticket },
            { id: "emergency", label: "Emergency & Triage", icon: Siren },
            { id: "icu", label: "ICU", icon: HeartPulse },
            { id: "theatre", label: "Operating Theatre", icon: Scissors },
            { id: "ambulance", label: "Ambulance Dispatch", icon: Ambulance },
            { id: "pediatrics", label: "Pediatric Center", icon: Baby },
            { id: "physio", label: "Physiotherapy Center", icon: Dumbbell },
            { id: "dispensary", label: "Dispensary Operations", icon: Pill },
            { id: "care", label: "Care Management (OPD/IPD)", icon: Activity },
            { id: "erp_stock", label: "ERP Stock & Buying", icon: Package },
            { id: "erp_admin", label: "ERP Admin & Finance", icon: DollarSign },
            { id: "procedures", label: "Clinical Coding (ICD/CPT)", icon: Stethoscope },
            { id: "lis_ris", label: "LIS & RIS Imaging", icon: FlaskConical },
            { id: "bloodbank", label: "Blood Bank", icon: Droplet },
            { id: "fhir", label: "HL7 FHIR Interoperability", icon: Share2 },
            { id: "rcm", label: "Revenue Cycle & Insurance", icon: CreditCard },
            { id: "governance", label: "Multi-Center Governance", icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const accessible = canAccess(tab.id as InstitutionTabKey);
            const rule = getTabRule(tab.id as InstitutionTabKey);
            // Facility-type relevance: atypical modules are de-emphasised
            // (dimmed + explained) but remain fully usable — nothing is hidden.
            const relevance = getTabRelevance(preciseType, tab.id);
            const atypicalNote = atypicalTabExplanation(preciseType, tab.id);
            const isAtypical = relevance === "atypical" && !isActive;
            if (!accessible) {
              // Locked tab — show greyed with lock icon, clicking shows why
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={false}
                  aria-disabled={true}
                  title={`Requires module: ${rule?.requiredModules.join(" or ") || "—"} (not enabled for this facility)`}
                  onClick={() => {
                    toast.error(
                      `"${tab.label}" is not enabled for this facility.`,
                      { description: `Required module: ${rule?.requiredModules.join(" or ") || "—"}. Contact your administrator to enable it.` }
                    );
                  }}
                  className="px-4 py-2.5 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors bg-muted/50 border border-border text-muted-foreground/50 cursor-not-allowed max-md:bg-transparent max-md:border-transparent"
                >
                  <Lock className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            }
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                title={atypicalNote || undefined}
                className={`px-4 py-2.5 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-pill text-pill-foreground font-semibold md:bg-primary md:text-primary-foreground md:font-medium"
                    : isAtypical
                      ? "bg-card border border-dashed border-border text-muted-foreground/60 hover:bg-muted hover:text-foreground hover:border-solid max-md:bg-transparent max-md:border-transparent"
                      : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground max-md:bg-transparent max-md:border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {isAtypical && (
                  <span className="text-xs font-medium opacity-70" aria-hidden="true">•</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      </div>

      {/* Dashboard data load failure — plain-language banner with retry
          (previously a failed fetch silently rendered a dashboard of zeros). */}
      {dataError && (
        <div className="pt-4">
          <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3">
            <p className="text-sm font-medium text-error-700 dark:text-error-300">
              We couldn't load your dashboard data. The numbers below may be incomplete — please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFetchRetryCount((c) => c + 1)}
              className="self-start sm:self-auto"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Subscription renewal notice — only for effectively expired /
          past-due subscriptions; renders nothing otherwise. */}
      {subscriptionGate && (
        <div className="pt-4">
          <SubscriptionExpiryBanner gate={subscriptionGate} isAdmin={isAdmin} />
        </div>
      )}

      {/* Tab Contents */}
      <div className="pt-6 space-y-6">
        {/* 1. Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI stats — mobile: ONE hairline list (PayPal app anatomy:
                pale icon square, label + grey subline, bold value right),
                not stacked cards. sm+ keeps the MetricCard grid. The list
                mirrors the four cards' exact values. */}
            <div className="sm:hidden rounded-2xl border border-border bg-card px-4 divide-y divide-border">
              {[
                { label: "Staff & Personnel", value: counts.personnel.toString(), sub: "Active members", icon: <Users className="h-5 w-5" /> },
                { label: "Total Appointments", value: counts.appointments.toString(), sub: `${counts.todayAppointments} scheduled today`, icon: <Calendar className="h-5 w-5" /> },
                { label: "Unique Patients", value: counts.patients.toString(), sub: "All time", icon: <UserRound className="h-5 w-5" /> },
                { label: "Revenue Collected", value: `${institution.currency || "ZMW"} ${(counts.revenue / 1000).toFixed(1)}k`, sub: "Last 6 months", icon: <TrendingUp className="h-5 w-5" /> },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 py-3.5 min-h-16">
                  <span className="h-10 w-10 rounded-xl bg-pill text-pill-foreground flex items-center justify-center shrink-0" aria-hidden>
                    {row.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{row.label}</p>
                    <p className="text-[13px] text-muted-foreground">{row.sub}</p>
                  </div>
                  <span className="text-lg font-extrabold text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Staff & Personnel"
                value={counts.personnel.toString()}
                subtitle="Active members"
                icon={Users}
              />
              <MetricCard
                title="Total Appointments"
                value={counts.appointments.toString()}
                subtitle={`${counts.todayAppointments} scheduled today`}
                icon={Calendar}
                trend={monthTrend(chartData.map((m) => m.appointments))}
              />
              <MetricCard
                title="Unique Patients"
                value={counts.patients.toString()}
                subtitle="All time"
                icon={UserRound}
              />
              <MetricCard
                title="Revenue Collected"
                value={`${institution.currency || "ZMW"} ${(counts.revenue / 1000).toFixed(1)}k`}
                subtitle="Last 6 months"
                icon={TrendingUp}
                trend={monthTrend(chartData.map((m) => m.revenue))}
              />
            </div>

            {/* Patient journey for this facility type */}
            <FacilityJourneyCard facilityType={preciseType} />

            {/* Admin Quick Tip */}
            {isAdmin && counts.appointments === 0 && (
              <SuggestionBanner
                title="Get Started with Your Institution"
                description="Complete your institution setup by adding staff members and enabling appointment booking for patients."
                variant="info"
                icon={Building2}
                actions={[
                  { label: 'Add Staff', onClick: () => navigate('/institution/personnel'), variant: 'primary' },
                  { label: 'Settings', onClick: () => navigate('/institution/settings'), variant: 'secondary' },
                ]}
              />
            )}

            {/* Type-specific Quick Navigation */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">{cfg.label} quick access</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {cfg.quickLinks.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors group text-center"
                  >
                    <span className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      {action.icon}
                    </span>
                    <span className="text-xs font-medium text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modules for this facility (DB-driven + per-institution admin grants).
                Live modules open; planned modules are available on request and
                can be activated for the facility at any time — this is how a
                small institution grows its module set over time. Admin-granted
                modules show a "New" badge; suspended modules are hidden. */}
            {charter.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {headerLabel} modules
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {charter.filter((m) => m.effective === "live").length} live now,{" "}
                  {charter.filter((m) => m.effective === "planned").length} available to add.
                  {charter.some((m) => m.source === "admin_grant") && (
                    <> · <span className="text-primary-600 font-medium">includes modules added for your facility by the platform team</span></>
                  )}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {charter.filter((m) => m.effective !== "disabled").map((m) => {
                    const isLive = m.effective === "live";
                    const isGranted = m.source === "admin_grant";
                    const path = MODULE_PATHS[m.module_key];
                    const priceLabel = formatModulePrice(modulePrices[m.module_key]);
                    const badge = isGranted ? "New" : isLive ? "Live" : priceLabel ? `Available · ${priceLabel}` : "Available";
                    const inner = (
                      <>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          {isLive ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success-500 shrink-0" />
                          ) : (
                            <Hourglass className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{m.module_name}</span>
                        </span>
                        <span className={`text-xs font-medium ${isLive ? "text-success-600 dark:text-success-400" : "text-primary-600 dark:text-primary-400"}`}>
                          {badge}
                        </span>
                      </>
                    );
                    const cls =
                      "flex items-center justify-between gap-2 p-2.5 rounded-lg border text-left transition-colors " +
                      (isLive
                        ? "border-border hover:bg-muted"
                        : "border-border bg-muted/50 opacity-80 hover:opacity-100 cursor-pointer");
                    const title = m.description
                      ? isGranted ? `${m.description} — added for your facility by the platform team` : isLive ? m.description : `${m.description} — available on request, open Modules & Add-ons in Settings`
                      : m.module_name;
                    // Live modules with a route open directly; planned modules
                    // go to Settings → Modules & Add-ons so the facility can
                    // request activation and grow over time. Non-admins can't
                    // open Settings (RouteGuard), so they get guidance instead
                    // of a silent redirect bounce.
                    const handleModuleClick = () => {
                      if (isLive && path) { navigate(path); return; }
                      if (isAdmin) { navigate("/institution/settings"); return; }
                      toast.info("Ask your institution admin to request this module in Settings → Modules & Add-ons.");
                    };
                    return (
                      <button key={m.module_key} onClick={handleModuleClick} className={cls} title={title}>
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-lg border border-border bg-card p-4">
              <QuickActions />
            </div>

            {/* Charts + Activity - Enhanced */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue & Appointments Trend */}
              <div className="vf-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary-500" /> 
                      Revenue & Activity Trends
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Last 6 months performance</p>
                  </div>
                </div>
                <SimpleBarChart
                  data={chartData}
                  bars={[
                    { dataKey: 'revenue', name: 'Revenue', color: cfg.color },
                    { dataKey: 'appointments', name: 'Appointments', color: '#00a86b' },
                  ]}
                  height={250}
                />
              </div>

              {/* Activity Feed */}
              <div className="vf-card overflow-hidden">
                <RecentActivityFeed activities={activities} />
              </div>
            </div>

            {/* Additional Charts Row — real appointment data, never placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Patient Flow by Day */}
              <div className="vf-card p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Weekly Patient Flow
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Appointments per day — last 7 days</p>
                </div>
                <SimpleBarChart
                  data={weeklyFlow}
                  bars={[
                    { dataKey: 'visits', name: 'Patient Visits', color: '#0066f5' },
                  ]}
                  height={250}
                />
              </div>

              {/* Department/Service Distribution */}
              <div className="vf-card p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Service Distribution
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Appointments by type — last 90 days</p>
                </div>
                {visitMix.length > 0 ? (
                  <DonutChart
                    data={visitMix}
                    height={250}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">
                    No appointment data yet — the mix appears once visits are booked.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Patient Hub */}
        {activeTab === "patients" && (
          <div className="space-y-6">
            <UnifiedPatientHub institutionId={institution.id} />
            <PatientInstitutionManager institutionId={institution.id} />
            <DuplicatePatients />
          </div>
        )}

        {/* 3. Queue & Live Calling Desk */}
        {activeTab === "queue" && <CentralizedQueueDesk institutionId={institution.id} />}

        {/* 3b. Emergency & Triage (hero module) */}
        {activeTab === "emergency" && <EmergencyTriage hospital={institution} />}

        {/* 3c. ICU (hero module) */}
        {activeTab === "icu" && <ICU hospital={institution} />}

        {/* 3d. Operating Theatre (hero module) */}
        {activeTab === "theatre" && <OTManagement hospital={institution} />}

        {/* 3e. Ambulance Dispatch (hero module) */}
        {activeTab === "ambulance" && <AmbulanceStaffWorkflow />}

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
        {activeTab === "lis_ris" && (
          <div className="space-y-6">
            <LISRadiologySuite institutionId={institution.id} />
            <LISMachineManager institutionId={institution.id} />
          </div>
        )}

        {/* 11b. Blood Bank */}
        {activeTab === "bloodbank" && <BloodBank hospital={institution} />}

        {/* 12. HL7 FHIR Interoperability */}
        {activeTab === "fhir" && <FHIRInteroperabilityHub institutionId={institution.id} />}

        {/* 13. Revenue Cycle Management & Insurance */}
        {activeTab === "rcm" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <AdvancedRevenueCycle />
            </div>
            <DoctorFractionManager institutionId={institution.id} />
          </div>
        )}

        {/* 14. Multi-Center Enterprise Governance & Cryptographic Audit */}
        {activeTab === "governance" && (
          <div className="rounded-lg border border-border bg-card p-6">
            <MultiCenterAuditSuite institutionId={institution.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionDashboard;


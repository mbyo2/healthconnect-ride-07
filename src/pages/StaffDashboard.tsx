import { useUserRoles } from "@/context/UserRolesContext";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useStaffMetrics, StaffMetricKey } from "@/hooks/useStaffMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonDashboardBody, SkeletonLine } from "@/components/ui/skeleton-kit";
import {
  Users, Calendar, Clock, Phone, Ticket, CreditCard, FileText,
  BarChart3, Settings, Wrench, Package, Truck, Siren, Heart,
  ClipboardList, UserCheck, DollarSign, TrendingUp, Headset,
  Building2, Stethoscope, Activity, Bell, Building
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/** Single accent for every role — Doc'O Clock blue. Semantic status colors
 *  are used only where a status is actually conveyed. No rainbow per-role accents. */
const ACCENT = "bg-primary-500";

interface RoleConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  metrics: { label: string; icon: React.ReactNode; metricKey: StaffMetricKey; format?: "number" | "currency" }[];
  quickActions: { label: string; path: string; icon: React.ReactNode; description: string }[];
  tabs: { id: string; label: string; icon: React.ReactNode }[];
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  receptionist: {
    title: "Reception Desk",
    subtitle: "Patient check-in, appointments & front office",
    icon: <Bell className="h-6 w-6" />,
    metrics: [
      { label: "Today's Appointments", icon: <Calendar className="h-5 w-5" />, metricKey: "appointments_today" },
      { label: "In Queue", icon: <Ticket className="h-5 w-5" />, metricKey: "queue_waiting" },
      { label: "Checked In", icon: <UserCheck className="h-5 w-5" />, metricKey: "checked_in" },
    ],
    quickActions: [
      { label: "Check In Patient", path: "/institution-dashboard?tab=queue", icon: <UserCheck className="h-5 w-5" />, description: "Register walk-in or appointment arrival" },
      { label: "Book Appointment", path: "/search", icon: <Calendar className="h-5 w-5" />, description: "Find doctors & schedule patient visit" },
      { label: "Queue Desk", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-5 w-5" />, description: "Manage live queue" },
      { label: "Patient Search", path: "/institution/patients", icon: <Users className="h-5 w-5" />, description: "Find patient records" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "appointments", label: "Appointments", icon: <Calendar className="h-4 w-4" /> },
      { id: "queue", label: "Queue", icon: <Ticket className="h-4 w-4" /> },
      { id: "patients", label: "Patients", icon: <Users className="h-4 w-4" /> },
    ],
  },
  billing_staff: {
    title: "Billing & Revenue",
    subtitle: "Invoices, payments & financial reports",
    icon: <CreditCard className="h-6 w-6" />,
    metrics: [
      { label: "Pending Invoices", icon: <FileText className="h-5 w-5" />, metricKey: "invoices_pending" },
      { label: "Today's Revenue", icon: <DollarSign className="h-5 w-5" />, metricKey: "revenue_today", format: "currency" },
      { label: "Overdue", icon: <Clock className="h-5 w-5" />, metricKey: "invoices_overdue" },
    ],
    quickActions: [
      { label: "Create Invoice", path: "/hospital-management?tab=billing", icon: <FileText className="h-5 w-5" />, description: "Generate patient invoice" },
      { label: "Record Payment", path: "/hospital-management?tab=billing", icon: <CreditCard className="h-5 w-5" />, description: "Log payment received" },
      { label: "Revenue Reports", path: "/hospital-management?tab=billing", icon: <TrendingUp className="h-5 w-5" />, description: "View financial analytics" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
      { id: "payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
  hr_manager: {
    title: "Human Resources",
    subtitle: "Staff management, shifts & payroll",
    icon: <Users className="h-6 w-6" />,
    metrics: [
      { label: "Total Staff", icon: <Users className="h-5 w-5" />, metricKey: "staff_total" },
      { label: "On Shift", icon: <Clock className="h-5 w-5" />, metricKey: "on_shift_today" },
      { label: "On Leave", icon: <Calendar className="h-5 w-5" />, metricKey: "on_leave_today" },
    ],
    quickActions: [
      { label: "Staff Directory", path: "/institution/personnel", icon: <Users className="h-5 w-5" />, description: "View all staff members" },
      { label: "Shift Schedule", path: "/medical-shift-hr", icon: <Clock className="h-5 w-5" />, description: "Manage work shifts" },
      { label: "Add Staff", path: "/institution/personnel", icon: <UserCheck className="h-5 w-5" />, description: "Onboard new employee" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "staff", label: "Staff", icon: <Users className="h-4 w-4" /> },
      { id: "shifts", label: "Shifts", icon: <Clock className="h-4 w-4" /> },
    ],
  },
  cxo: {
    title: "Executive Dashboard",
    subtitle: "Strategic overview & key metrics",
    icon: <TrendingUp className="h-6 w-6" />,
    metrics: [
      { label: "Total Revenue", icon: <DollarSign className="h-5 w-5" />, metricKey: "revenue_total", format: "currency" },
      { label: "Patient Volume", icon: <Users className="h-5 w-5" />, metricKey: "patient_volume" },
      { label: "Staff Count", icon: <Building2 className="h-5 w-5" />, metricKey: "staff_total" },
    ],
    quickActions: [
      { label: "Institution Overview", path: "/institution-dashboard", icon: <Building2 className="h-5 w-5" />, description: "Full facility dashboard" },
      { label: "Reports", path: "/institution-dashboard?tab=reports", icon: <BarChart3 className="h-5 w-5" />, description: "Analytics & insights" },
      { label: "Settings", path: "/institution/settings", icon: <Settings className="h-5 w-5" />, description: "Configure institution" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  support: {
    title: "Support Desk",
    subtitle: "Customer support & ticket management",
    icon: <Headset className="h-6 w-6" />,
    metrics: [
      { label: "Open Tickets", icon: <Ticket className="h-5 w-5" />, metricKey: "tickets_open" },
      { label: "Resolved Today", icon: <UserCheck className="h-5 w-5" />, metricKey: "resolved_today" },
      { label: "Avg Response", icon: <Clock className="h-5 w-5" />, metricKey: "avg_response" },
    ],
    quickActions: [
      { label: "Help Centre", path: "/help", icon: <Ticket className="h-5 w-5" />, description: "Support resources & requests" },
      { label: "Patient Search", path: "/institution/patients", icon: <Users className="h-5 w-5" />, description: "Find patient records" },
      { label: "Messages", path: "/chat", icon: <Phone className="h-5 w-5" />, description: "Support conversations" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "tickets", label: "Tickets", icon: <Ticket className="h-4 w-4" /> },
    ],
  },
  ambulance_staff: {
    title: "Ambulance Dispatch",
    subtitle: "Emergency transport coordination",
    icon: <Truck className="h-6 w-6" />,
    metrics: [
      { label: "Active Dispatches", icon: <Siren className="h-5 w-5" />, metricKey: "dispatches_active" },
      { label: "Available Units", icon: <Truck className="h-5 w-5" />, metricKey: "units_available" },
      { label: "Completed Today", icon: <UserCheck className="h-5 w-5" />, metricKey: "dispatches_completed_today" },
    ],
    quickActions: [
      { label: "Dispatch", path: "/emergency-response", icon: <Siren className="h-5 w-5" />, description: "New emergency dispatch" },
      { label: "Fleet Status", path: "/emergency-response", icon: <Truck className="h-5 w-5" />, description: "View all units" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "dispatch", label: "Dispatch", icon: <Siren className="h-4 w-4" /> },
    ],
  },
  triage_staff: {
    title: "Triage Station",
    subtitle: "Patient assessment & prioritization",
    icon: <Heart className="h-6 w-6" />,
    metrics: [
      { label: "Waiting", icon: <Clock className="h-5 w-5" />, metricKey: "triage_waiting" },
      { label: "Critical", icon: <Siren className="h-5 w-5" />, metricKey: "triage_critical" },
      { label: "Assessed Today", icon: <ClipboardList className="h-5 w-5" />, metricKey: "assessed_today" },
    ],
    quickActions: [
      { label: "Triage Queue", path: "/opd", icon: <ClipboardList className="h-5 w-5" />, description: "Assess waiting patients" },
      { label: "Vitals Entry", path: "/opd", icon: <Activity className="h-5 w-5" />, description: "Record vital signs" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "queue", label: "Queue", icon: <Clock className="h-4 w-4" /> },
    ],
  },
  ot_staff: {
    title: "Operating Theatre",
    subtitle: "Surgical scheduling & theatre management",
    icon: <Stethoscope className="h-6 w-6" />,
    metrics: [
      { label: "Today's Surgeries", icon: <Calendar className="h-5 w-5" />, metricKey: "surgeries_today" },
      { label: "In Progress", icon: <Activity className="h-5 w-5" />, metricKey: "surgeries_in_progress" },
      { label: "Available Theatres", icon: <Building2 className="h-5 w-5" />, metricKey: "theatres_available" },
    ],
    quickActions: [
      { label: "Theatre Schedule", path: "/theatre", icon: <Calendar className="h-5 w-5" />, description: "View OT bookings" },
      { label: "Book Theatre", path: "/theatre", icon: <Clock className="h-5 w-5" />, description: "Schedule surgery" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
    ],
  },
  maintenance_manager: {
    title: "Maintenance",
    subtitle: "Facility upkeep & equipment management",
    icon: <Wrench className="h-6 w-6" />,
    metrics: [
      { label: "Open Requests", icon: <Wrench className="h-5 w-5" />, metricKey: "maintenance_open" },
      { label: "In Progress", icon: <Clock className="h-5 w-5" />, metricKey: "maintenance_in_progress" },
      { label: "Completed", icon: <UserCheck className="h-5 w-5" />, metricKey: "maintenance_completed" },
    ],
    quickActions: [
      { label: "Work Orders", path: "/hospital-management?tab=maintenance", icon: <Wrench className="h-5 w-5" />, description: "Manage maintenance requests" },
      { label: "New Request", path: "/hospital-management?tab=maintenance", icon: <FileText className="h-5 w-5" />, description: "Log maintenance issue" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "requests", label: "Requests", icon: <Wrench className="h-4 w-4" /> },
    ],
  },
  inventory_manager: {
    title: "Inventory Control",
    subtitle: "Stock management & supply chain",
    icon: <Package className="h-5 w-5" />,
    metrics: [
      { label: "Total Items", icon: <Package className="h-5 w-5" />, metricKey: "inventory_total" },
      { label: "Low Stock", icon: <Clock className="h-5 w-5" />, metricKey: "inventory_low_stock" },
      { label: "Out of Stock", icon: <Siren className="h-5 w-5" />, metricKey: "inventory_out_of_stock" },
    ],
    quickActions: [
      { label: "Inventory", path: "/enhanced-inventory", icon: <Package className="h-5 w-5" />, description: "View stock levels" },
      { label: "Stock In", path: "/enhanced-inventory", icon: <TrendingUp className="h-5 w-5" />, description: "Receive new stock" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "stock", label: "Stock", icon: <Package className="h-4 w-4" /> },
    ],
  },
  finance_manager: {
    title: "Finance Office",
    subtitle: "Revenue, accounting & financial oversight",
    icon: <DollarSign className="h-6 w-6" />,
    metrics: [
      { label: "Total Revenue", icon: <DollarSign className="h-5 w-5" />, metricKey: "revenue_total", format: "currency" },
      { label: "Today's Revenue", icon: <TrendingUp className="h-5 w-5" />, metricKey: "revenue_today", format: "currency" },
      { label: "Overdue Invoices", icon: <Clock className="h-5 w-5" />, metricKey: "invoices_overdue" },
    ],
    quickActions: [
      { label: "Billing & Invoices", path: "/hospital-management?tab=billing", icon: <FileText className="h-5 w-5" />, description: "Invoices, payments & collections" },
      { label: "Accounting", path: "/enterprise-accounting", icon: <BarChart3 className="h-5 w-5" />, description: "Enterprise accounts & ledgers" },
      { label: "Financial Reports", path: "/institution/reports", icon: <TrendingUp className="h-5 w-5" />, description: "Revenue & financial analytics" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
    ],
  },
};

const STAFF_ROLES = Object.keys(ROLE_CONFIGS);

function formatMetric(value: number | null, format: "number" | "currency" = "number"): string {
  if (value === null) return "—";
  if (format === "currency") return `K ${value.toLocaleString()}`;
  return value.toLocaleString();
}

export default function StaffDashboard() {
  const { availableRoles, loading: rolesLoading } = useUserRoles();
  const { profile } = useAuth();
  const { institutionId, loading: instLoading } = useInstitutionContext();
  const { metrics, loading: metricsLoading } = useStaffMetrics(institutionId);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  if (rolesLoading) {
    return (
      <div>
        <div className="px-6 py-8">
          <div className="flex items-center gap-4" aria-hidden>
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-6 w-56 max-w-full" />
              <SkeletonLine className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </div>
        <div className="pb-10" role="status" aria-label="Loading staff dashboard">
          <SkeletonDashboardBody />
        </div>
      </div>
    );
  }

  // Find the staff role from available roles, fallback to profile
  const staffRole = availableRoles.find(r => STAFF_ROLES.includes(r.toLowerCase()))
    || STAFF_ROLES.find(r => r === (profile?.role || "").toLowerCase())
    || "receptionist";

  const config = ROLE_CONFIGS[staffRole];
  const metricsBusy = instLoading || metricsLoading;

  return (
    <div>
      <div className="doc-page-header px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            {config.icon}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{config.title}</h1>
            <p className="text-xs text-muted-foreground font-medium">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Sticky offset = global-header offset (4.5rem) + this page's own
          sticky header card height (py-4 32px + title/subtitle lines 44px
          + border 1px = 77px). At the old shared offset the tab bar stuck
          at the same place as the header card and the two overlapped —
          the same clip defect fixed on InstitutionDashboard 2026-11-11. */}
      <div className="bg-background border-b border-border sticky top-[calc(4.5rem+77px)] z-40 scroll-mt-20">
        <div>
          <div className="flex gap-1 overflow-x-auto">
            {config.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // If tab matches a quick action (e.g., "Reports" tab -> Reports action), navigate there
                  const matchingAction = config.quickActions.find(
                    (action) => action.label.toLowerCase() === tab.label.toLowerCase()
                  );
                  if (matchingAction && tab.id !== "overview") {
                    navigate(matchingAction.path);
                  } else if (tab.id === "appointments") {
                    navigate("/institution-dashboard?tab=appointments");
                  } else if (tab.id === "queue") {
                    navigate("/institution-dashboard?tab=queue");
                  } else if (tab.id === "patients") {
                    navigate("/institution/patients");
                  } else if (tab.id === "staff") {
                    navigate("/institution/personnel");
                  } else if (tab.id === "shifts") {
                    navigate("/medical-shift-hr");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-6">
        {!instLoading && !institutionId && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning-500/30 bg-warning-500/10 px-4 py-3">
            <Building className="h-5 w-5 text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning-700 dark:text-warning-300">No institution linked</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your account is not linked to an institution yet, so live metrics are unavailable.
                Ask your administrator to link your account to see real numbers here.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {config.metrics.map((metric, idx) => {
            const value = institutionId ? metrics[metric.metricKey] : null;
            return (
              <div key={idx} className="bg-card border border-border rounded-lg p-6 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/10 text-primary-600 rounded-lg">
                    {metric.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    {metricsBusy ? (
                      <SkeletonLine className="h-8 w-20 mt-1" />
                    ) : (
                      <>
                        <p
                          className={`text-2xl font-semibold ${value === null ? "text-muted-foreground dark:text-muted-foreground" : "text-foreground dark:text-white"}`}
                          title={value === null ? "Live tracking for this metric is not available yet" : undefined}
                        >
                          {formatMetric(value, metric.format)}
                        </p>
                        {value === null && (
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                            {!institutionId ? "No institution linked" : "Not tracked yet"}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="bg-card border border-border rounded-lg p-6 shadow-xs hover:shadow-md transition-shadow text-left"
            >
              <div className="p-2 bg-primary-500/10 text-primary-600 rounded-lg w-fit mb-3">
                {action.icon}
              </div>
              <h3 className="font-semibold text-foreground dark:text-white">{action.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

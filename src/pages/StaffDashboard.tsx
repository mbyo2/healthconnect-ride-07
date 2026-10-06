import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Users, Calendar, Clock, Phone, Ticket, CreditCard, FileText,
  BarChart3, Settings, Wrench, Package, Truck, Siren, Heart,
  ClipboardList, UserCheck, DollarSign, TrendingUp, Headset,
  Building2, Stethoscope, Activity, Bell
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MetricCard } from "@/components/shared/MetricCard";
import { toast } from "sonner";

interface RoleConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  metrics: { label: string; icon: React.ReactNode; query: string }[];
  quickActions: { label: string; path: string; icon: React.ReactNode; description: string }[];
  tabs: { id: string; label: string; icon: React.ReactNode }[];
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  receptionist: {
    title: "Reception Desk",
    subtitle: "Patient check-in, appointments & front office",
    icon: <Bell className="h-6 w-6" />,
    color: "bg-blue-500",
    metrics: [
      { label: "Today's Appointments", icon: <Calendar className="h-5 w-5" />, query: "appointments_today" },
      { label: "In Queue", icon: <Ticket className="h-5 w-5" />, query: "queue_waiting" },
      { label: "Checked In", icon: <UserCheck className="h-5 w-5" />, query: "checked_in" },
    ],
    quickActions: [
      { label: "Check In Patient", path: "/institution-dashboard?tab=queue", icon: <UserCheck className="h-5 w-5" />, description: "Register walk-in or appointment arrival" },
      { label: "Book Appointment", path: "/appointments", icon: <Calendar className="h-5 w-5" />, description: "Schedule patient visit" },
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
    subtitle: "Invoices, payments & insurance claims",
    icon: <CreditCard className="h-6 w-6" />,
    color: "bg-green-500",
    metrics: [
      { label: "Pending Invoices", icon: <FileText className="h-5 w-5" />, query: "pending_invoices" },
      { label: "Today's Revenue", icon: <DollarSign className="h-5 w-5" />, query: "today_revenue" },
      { label: "Insurance Claims", icon: <ClipboardList className="h-5 w-5" />, query: "insurance_claims" },
    ],
    quickActions: [
      { label: "New Invoice", path: "/billing", icon: <FileText className="h-5 w-5" />, description: "Create patient invoice" },
      { label: "Record Payment", path: "/billing", icon: <DollarSign className="h-5 w-5" />, description: "Log payment received" },
      { label: "Insurance Claims", path: "/billing", icon: <ClipboardList className="h-5 w-5" />, description: "Manage NHIMA & private claims" },
      { label: "Reports", path: "/billing", icon: <BarChart3 className="h-5 w-5" />, description: "Revenue reports" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
      { id: "payments", label: "Payments", icon: <DollarSign className="h-4 w-4" /> },
      { id: "claims", label: "Insurance", icon: <ClipboardList className="h-4 w-4" /> },
    ],
  },
  hr_manager: {
    title: "Human Resources",
    subtitle: "Staff management, leave & payroll",
    icon: <Users className="h-6 w-6" />,
    color: "bg-purple-500",
    metrics: [
      { label: "Total Staff", icon: <Users className="h-5 w-5" />, query: "total_staff" },
      { label: "On Leave", icon: <Clock className="h-5 w-5" />, query: "on_leave" },
      { label: "Open Positions", icon: <UserCheck className="h-5 w-5" />, query: "open_positions" },
    ],
    quickActions: [
      { label: "Staff Directory", path: "/institution-dashboard?tab=personnel", icon: <Users className="h-5 w-5" />, description: "View all staff" },
      { label: "Leave Requests", path: "/institution-dashboard?tab=personnel", icon: <Clock className="h-5 w-5" />, description: "Approve leave" },
      { label: "Add Staff", path: "/institution-dashboard?tab=personnel", icon: <UserCheck className="h-5 w-5" />, description: "Onboard new employee" },
      { label: "Payroll", path: "/institution-dashboard?tab=personnel", icon: <DollarSign className="h-5 w-5" />, description: "Salary management" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "staff", label: "Staff", icon: <Users className="h-4 w-4" /> },
      { id: "leave", label: "Leave", icon: <Clock className="h-4 w-4" /> },
      { id: "payroll", label: "Payroll", icon: <DollarSign className="h-4 w-4" /> },
    ],
  },
  cxo: {
    title: "Executive Dashboard",
    subtitle: "Strategic overview, KPIs & analytics",
    icon: <TrendingUp className="h-6 w-6" />,
    color: "bg-indigo-500",
    metrics: [
      { label: "Monthly Revenue", icon: <DollarSign className="h-5 w-5" />, query: "monthly_revenue" },
      { label: "Patient Volume", icon: <Users className="h-5 w-5" />, query: "patient_volume" },
      { label: "Satisfaction", icon: <Heart className="h-5 w-5" />, query: "satisfaction" },
    ],
    quickActions: [
      { label: "Analytics", path: "/institution-dashboard", icon: <BarChart3 className="h-5 w-5" />, description: "Performance metrics" },
      { label: "Financial Reports", path: "/billing", icon: <FileText className="h-5 w-5" />, description: "Revenue & costs" },
      { label: "Staff Overview", path: "/institution-dashboard?tab=personnel", icon: <Users className="h-5 w-5" />, description: "Team performance" },
      { label: "Strategy", path: "/institution-dashboard", icon: <TrendingUp className="h-5 w-5" />, description: "Growth planning" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "financials", label: "Financials", icon: <DollarSign className="h-4 w-4" /> },
      { id: "operations", label: "Operations", icon: <Activity className="h-4 w-4" /> },
      { id: "reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  support: {
    title: "Support Desk",
    subtitle: "Help desk, tickets & user assistance",
    icon: <Headset className="h-6 w-6" />,
    color: "bg-orange-500",
    metrics: [
      { label: "Open Tickets", icon: <Ticket className="h-5 w-5" />, query: "open_tickets" },
      { label: "Resolved Today", icon: <UserCheck className="h-5 w-5" />, query: "resolved_today" },
      { label: "Avg Response", icon: <Clock className="h-5 w-5" />, query: "avg_response" },
    ],
    quickActions: [
      { label: "New Ticket", path: "/support", icon: <Ticket className="h-5 w-5" />, description: "Log support request" },
      { label: "Knowledge Base", path: "/support", icon: <FileText className="h-5 w-5" />, description: "Help articles" },
      { label: "Live Chat", path: "/chat", icon: <Phone className="h-5 w-5" />, description: "Chat with users" },
      { label: "System Status", path: "/support", icon: <Activity className="h-5 w-5" />, description: "Platform health" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "tickets", label: "Tickets", icon: <Ticket className="h-4 w-4" /> },
      { id: "knowledge", label: "Knowledge Base", icon: <FileText className="h-4 w-4" /> },
      { id: "chat", label: "Live Chat", icon: <Phone className="h-4 w-4" /> },
    ],
  },
  ambulance_staff: {
    title: "Ambulance Dispatch",
    subtitle: "Emergency transport & vehicle management",
    icon: <Siren className="h-6 w-6" />,
    color: "bg-red-500",
    metrics: [
      { label: "Active Dispatches", icon: <Siren className="h-5 w-5" />, query: "active_dispatches" },
      { label: "Available Units", icon: <Truck className="h-5 w-5" />, query: "available_units" },
      { label: "Today's Trips", icon: <Activity className="h-5 w-5" />, query: "todays_trips" },
    ],
    quickActions: [
      { label: "New Dispatch", path: "/ambulance", icon: <Siren className="h-5 w-5" />, description: "Dispatch ambulance" },
      { label: "Track Units", path: "/ambulance", icon: <Truck className="h-5 w-5" />, description: "Vehicle locations" },
      { label: "Trip History", path: "/ambulance", icon: <Clock className="h-5 w-5" />, description: "Past transports" },
      { label: "Emergency Call", path: "/ambulance", icon: <Phone className="h-5 w-5" />, description: "Call 991" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "dispatch", label: "Dispatch", icon: <Siren className="h-4 w-4" /> },
      { id: "units", label: "Units", icon: <Truck className="h-4 w-4" /> },
      { id: "history", label: "History", icon: <Clock className="h-4 w-4" /> },
    ],
  },
  triage_staff: {
    title: "Triage Station",
    subtitle: "Patient intake, vitals & prioritization",
    icon: <Heart className="h-6 w-6" />,
    color: "bg-pink-500",
    metrics: [
      { label: "Waiting Triage", icon: <Users className="h-5 w-5" />, query: "waiting_triage" },
      { label: "Urgent Cases", icon: <Siren className="h-5 w-5" />, query: "urgent_cases" },
      { label: "Completed", icon: <UserCheck className="h-5 w-5" />, query: "triage_completed" },
    ],
    quickActions: [
      { label: "New Triage", path: "/triage", icon: <Heart className="h-5 w-5" />, description: "Assess patient" },
      { label: "Record Vitals", path: "/triage", icon: <Activity className="h-5 w-5" />, description: "BP, temp, pulse" },
      { label: "Queue", path: "/institution-dashboard?tab=queue", icon: <Ticket className="h-5 w-5" />, description: "Manage queue" },
      { label: "Emergency", path: "/triage", icon: <Siren className="h-5 w-5" />, description: "Urgent cases" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "intake", label: "Intake", icon: <Users className="h-4 w-4" /> },
      { id: "vitals", label: "Vitals", icon: <Activity className="h-4 w-4" /> },
      { id: "urgent", label: "Urgent", icon: <Siren className="h-4 w-4" /> },
    ],
  },
  ot_staff: {
    title: "Operating Theatre",
    subtitle: "Surgery schedule & theatre management",
    icon: <Stethoscope className="h-6 w-6" />,
    color: "bg-teal-500",
    metrics: [
      { label: "Today's Surgeries", icon: <Calendar className="h-5 w-5" />, query: "todays_surgeries" },
      { label: "Theatres Free", icon: <Building2 className="h-5 w-5" />, query: "theatres_free" },
      { label: "In Recovery", icon: <Heart className="h-5 w-5" />, query: "in_recovery" },
    ],
    quickActions: [
      { label: "Surgery Schedule", path: "/theatre", icon: <Calendar className="h-5 w-5" />, description: "View OT bookings" },
      { label: "Book Theatre", path: "/theatre", icon: <Building2 className="h-5 w-5" />, description: "Reserve OT slot" },
      { label: "Checklist", path: "/theatre", icon: <ClipboardList className="h-5 w-5" />, description: "Surgical safety" },
      { label: "Recovery", path: "/theatre", icon: <Heart className="h-5 w-5" />, description: "Post-op care" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
      { id: "theatres", label: "Theatres", icon: <Building2 className="h-4 w-4" /> },
      { id: "checklist", label: "Checklist", icon: <ClipboardList className="h-4 w-4" /> },
    ],
  },
  maintenance_manager: {
    title: "Maintenance",
    subtitle: "Equipment, facilities & work orders",
    icon: <Wrench className="h-6 w-6" />,
    color: "bg-amber-500",
    metrics: [
      { label: "Open Work Orders", icon: <Wrench className="h-5 w-5" />, query: "open_orders" },
      { label: "Equipment Down", icon: <Settings className="h-5 w-5" />, query: "equipment_down" },
      { label: "Completed", icon: <UserCheck className="h-5 w-5" />, query: "completed_orders" },
    ],
    quickActions: [
      { label: "New Work Order", path: "/maintenance", icon: <Wrench className="h-5 w-5" />, description: "Log repair request" },
      { label: "Equipment", path: "/maintenance", icon: <Settings className="h-5 w-5" />, description: "Asset register" },
      { label: "Preventive", path: "/maintenance", icon: <Calendar className="h-5 w-5" />, description: "Scheduled maintenance" },
      { label: "Facilities", path: "/maintenance", icon: <Building2 className="h-5 w-5" />, description: "Building management" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "orders", label: "Work Orders", icon: <Wrench className="h-4 w-4" /> },
      { id: "equipment", label: "Equipment", icon: <Settings className="h-4 w-4" /> },
      { id: "schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
    ],
  },
  inventory_manager: {
    title: "Inventory Control",
    subtitle: "Stock, supplies & procurement",
    icon: <Package className="h-6 w-6" />,
    color: "bg-cyan-500",
    metrics: [
      { label: "Low Stock Items", icon: <Package className="h-5 w-5" />, query: "low_stock" },
      { label: "Pending Orders", icon: <Truck className="h-5 w-5" />, query: "pending_orders" },
      { label: "Stock Value", icon: <DollarSign className="h-5 w-5" />, query: "stock_value" },
    ],
    quickActions: [
      { label: "Stock Levels", path: "/inventory", icon: <Package className="h-5 w-5" />, description: "Current inventory" },
      { label: "New Order", path: "/inventory", icon: <Truck className="h-5 w-5" />, description: "Purchase supplies" },
      { label: "Suppliers", path: "/inventory", icon: <Building2 className="h-5 w-5" />, description: "Vendor management" },
      { label: "Reports", path: "/inventory", icon: <BarChart3 className="h-5 w-5" />, description: "Stock reports" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "stock", label: "Stock", icon: <Package className="h-4 w-4" /> },
      { id: "orders", label: "Orders", icon: <Truck className="h-4 w-4" /> },
      { id: "suppliers", label: "Suppliers", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
};

export const StaffDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<Record<string, number | string>>({});

  const userRole = (profile?.role || user?.user_metadata?.role || "").toLowerCase();
  const config = ROLE_CONFIGS[userRole] || ROLE_CONFIGS["receptionist"];

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Load role-specific metrics (placeholder values for now, real queries can be added)
        const mockMetrics: Record<string, number | string> = {};
        config.metrics.forEach((m) => {
          mockMetrics[m.query] = 0;
        });
        setMetrics(mockMetrics);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [user, userRole]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className={`${config.color} text-white px-6 py-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              {config.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-white/80">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {config.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "overview" && (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {config.metrics.map((metric, idx) => (
                <MetricCard
                  key={idx}
                  title={metric.label}
                  value={metrics[metric.query] ?? 0}
                  icon={metric.icon}
                />
              ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {config.quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow text-left"
                >
                  <div className={`p-2 ${config.color} text-white rounded-lg w-fit mb-3`}>
                    {action.icon}
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{action.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab !== "overview" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center">
            <div className={`p-3 ${config.color} text-white rounded-lg w-fit mx-auto mb-4`}>
              {config.tabs.find((t) => t.id === activeTab)?.icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {config.tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              This section is under development. Use Quick Actions above to access related features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;

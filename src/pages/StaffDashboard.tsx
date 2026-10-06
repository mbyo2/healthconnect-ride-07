import { useUserRoles } from "@/context/UserRolesContext";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  Users, Calendar, Clock, Phone, Ticket, CreditCard, FileText,
  BarChart3, Settings, Wrench, Package, Truck, Siren, Heart,
  ClipboardList, UserCheck, DollarSign, TrendingUp, Headset,
  Building2, Stethoscope, Activity, Bell
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface RoleConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  metrics: { label: string; icon: React.ReactNode }[];
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
      { label: "Today's Appointments", icon: <Calendar className="h-5 w-5" /> },
      { label: "In Queue", icon: <Ticket className="h-5 w-5" /> },
      { label: "Checked In", icon: <UserCheck className="h-5 w-5" /> },
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
    subtitle: "Invoices, payments & financial reports",
    icon: <CreditCard className="h-6 w-6" />,
    color: "bg-green-500",
    metrics: [
      { label: "Pending Invoices", icon: <FileText className="h-5 w-5" /> },
      { label: "Today's Revenue", icon: <DollarSign className="h-5 w-5" /> },
      { label: "Overdue", icon: <Clock className="h-5 w-5" /> },
    ],
    quickActions: [
      { label: "Create Invoice", path: "/institution-dashboard?tab=billing", icon: <FileText className="h-5 w-5" />, description: "Generate patient invoice" },
      { label: "Record Payment", path: "/institution-dashboard?tab=billing", icon: <CreditCard className="h-5 w-5" />, description: "Log payment received" },
      { label: "Revenue Reports", path: "/institution-dashboard?tab=reports", icon: <TrendingUp className="h-5 w-5" />, description: "View financial analytics" },
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
    color: "bg-purple-500",
    metrics: [
      { label: "Total Staff", icon: <Users className="h-5 w-5" /> },
      { label: "On Shift", icon: <Clock className="h-5 w-5" /> },
      { label: "On Leave", icon: <Calendar className="h-5 w-5" /> },
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
    color: "bg-indigo-500",
    metrics: [
      { label: "Total Revenue", icon: <DollarSign className="h-5 w-5" /> },
      { label: "Patient Volume", icon: <Users className="h-5 w-5" /> },
      { label: "Staff Count", icon: <Building2 className="h-5 w-5" /> },
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
    color: "bg-orange-500",
    metrics: [
      { label: "Open Tickets", icon: <Ticket className="h-5 w-5" /> },
      { label: "Resolved Today", icon: <UserCheck className="h-5 w-5" /> },
      { label: "Avg Response", icon: <Clock className="h-5 w-5" /> },
    ],
    quickActions: [
      { label: "View Tickets", path: "/support", icon: <Ticket className="h-5 w-5" />, description: "Manage support requests" },
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
    color: "bg-red-500",
    metrics: [
      { label: "Active Dispatches", icon: <Siren className="h-5 w-5" /> },
      { label: "Available Units", icon: <Truck className="h-5 w-5" /> },
      { label: "Completed Today", icon: <UserCheck className="h-5 w-5" /> },
    ],
    quickActions: [
      { label: "Dispatch", path: "/ambulance", icon: <Siren className="h-5 w-5" />, description: "New emergency dispatch" },
      { label: "Fleet Status", path: "/ambulance", icon: <Truck className="h-5 w-5" />, description: "View all units" },
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
    color: "bg-pink-500",
    metrics: [
      { label: "Waiting", icon: <Clock className="h-5 w-5" /> },
      { label: "Critical", icon: <Siren className="h-5 w-5" /> },
      { label: "Assessed Today", icon: <ClipboardList className="h-5 w-5" /> },
    ],
    quickActions: [
      { label: "Triage Queue", path: "/triage", icon: <ClipboardList className="h-5 w-5" />, description: "Assess waiting patients" },
      { label: "Vitals Entry", path: "/triage", icon: <Activity className="h-5 w-5" />, description: "Record vital signs" },
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
    color: "bg-teal-500",
    metrics: [
      { label: "Today's Surgeries", icon: <Calendar className="h-5 w-5" /> },
      { label: "In Progress", icon: <Activity className="h-5 w-5" /> },
      { label: "Available Theatres", icon: <Building2 className="h-5 w-5" /> },
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
    color: "bg-yellow-600",
    metrics: [
      { label: "Open Requests", icon: <Wrench className="h-5 w-5" /> },
      { label: "In Progress", icon: <Clock className="h-5 w-5" /> },
      { label: "Completed", icon: <UserCheck className="h-5 w-5" /> },
    ],
    quickActions: [
      { label: "Work Orders", path: "/maintenance", icon: <Wrench className="h-5 w-5" />, description: "Manage maintenance requests" },
      { label: "New Request", path: "/maintenance", icon: <FileText className="h-5 w-5" />, description: "Log maintenance issue" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "requests", label: "Requests", icon: <Wrench className="h-4 w-4" /> },
    ],
  },
  inventory_manager: {
    title: "Inventory Control",
    subtitle: "Stock management & supply chain",
    icon: <Package className="h-6 w-6" />,
    color: "bg-cyan-500",
    metrics: [
      { label: "Total Items", icon: <Package className="h-5 w-5" /> },
      { label: "Low Stock", icon: <Clock className="h-5 w-5" /> },
      { label: "Out of Stock", icon: <Siren className="h-5 w-5" /> },
    ],
    quickActions: [
      { label: "Inventory", path: "/inventory", icon: <Package className="h-5 w-5" />, description: "View stock levels" },
      { label: "Stock In", path: "/inventory", icon: <TrendingUp className="h-5 w-5" />, description: "Receive new stock" },
    ],
    tabs: [
      { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "stock", label: "Stock", icon: <Package className="h-4 w-4" /> },
    ],
  },
};

const STAFF_ROLES = Object.keys(ROLE_CONFIGS);

export default function StaffDashboard() {
  const { availableRoles, loading: rolesLoading } = useUserRoles();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  if (rolesLoading) return <LoadingScreen />;
  
  // Find the staff role from available roles, fallback to profile
  const staffRole = availableRoles.find(r => STAFF_ROLES.includes(r.toLowerCase())) 
    || STAFF_ROLES.find(r => r === (profile?.role || "").toLowerCase())
    || "receptionist";
  
  const config = ROLE_CONFIGS[staffRole];
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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

      <div className="bg-white dark:bg-gray-800 border-b sticky top-[64px] z-40 scroll-mt-20">
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {config.metrics.map((metric, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${config.color} text-white rounded-lg`}>
                  {metric.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{metric.label}</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-md transition-shadow text-left"
            >
              <div className={`p-2 ${config.color} text-white rounded-lg w-fit mb-3`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{action.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

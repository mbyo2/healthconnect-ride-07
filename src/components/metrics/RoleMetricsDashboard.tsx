import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  Calendar, CalendarCheck, Users, Wallet, Star, TrendingUp,
  Pill, FlaskConical, Building2, Activity, Clock, CheckCircle2,
  AlertTriangle, Heart, FileText, DollarSign, UserCheck, BedDouble,
} from "lucide-react";
import { MetricsCard } from "./MetricsCard";
import { ChartCard, TrendAreaChart, MetricsBarChart, MetricsDonutChart, TrendLineChart } from "./MetricsCharts";
import { format, subDays } from "date-fns";

// ── Shared data hooks ──────────────────────────────────────────────

function useAppointmentStats(userId: string | undefined, role: "provider" | "patient") {
  return useQuery({
    queryKey: [`${role}-appointment-stats`, userId],
    queryFn: async () => {
      if (!userId) return null;
      const col = role === "provider" ? "provider_id" : "patient_id";
      const { data, error } = await supabase
        .from("appointments")
        .select("id, status, date, created_at")
        .eq(col, userId);
      if (error) throw error;
      const rows = data || [];
      const today = format(new Date(), "yyyy-MM-dd");
      return {
        total: rows.length,
        upcoming: rows.filter(a => a.date >= today && ["scheduled", "confirmed", "pending"].includes(a.status)).length,
        completed: rows.filter(a => a.status === "completed").length,
        cancelled: rows.filter(a => a.status === "cancelled").length,
        noShow: rows.filter(a => a.status === "no_show").length,
        todayCount: rows.filter(a => a.date === today).length,
        // Last 7 days trend
        trend: Array.from({ length: 7 }, (_, i) => {
          const d = subDays(new Date(), 6 - i);
          const ds = format(d, "yyyy-MM-dd");
          return {
            name: format(d, "EEE"),
            appointments: rows.filter(a => a.date === ds).length,
          };
        }),
        // Status breakdown for donut
        statusBreakdown: [
          { name: "Completed", value: rows.filter(a => a.status === "completed").length },
          { name: "Upcoming", value: rows.filter(a => ["scheduled", "confirmed", "pending"].includes(a.status)).length },
          { name: "Cancelled", value: rows.filter(a => a.status === "cancelled").length },
          { name: "No-show", value: rows.filter(a => a.status === "no_show").length },
        ],
      };
    },
    enabled: !!userId,
  });
}

function useProviderStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["provider-metrics-stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("provider_statistics" as any)
        .select("*")
        .eq("provider_id", userId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!userId,
  });
}

function useWalletBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["wallet-balance-metrics", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("wallets" as any)
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as any)?.balance || 0;
    },
    enabled: !!userId,
  });
}

// ── Provider Metrics (Doctor, Nurse, Clinician) ────────────────────
// Priority: 1) Today's schedule 2) Patients 3) Earnings 4) Ratings 5) Trends

export function ProviderMetricsDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { data: apptStats, isLoading: apptLoading } = useAppointmentStats(user?.id, "provider");
  const { data: providerStats } = useProviderStats(user?.id);
  const { data: earnings } = useWalletBalance(user?.id);

  const completionRate = apptStats && apptStats.total > 0
    ? ((apptStats.completed / apptStats.total) * 100).toFixed(1)
    : "0";

  if (apptLoading) {
    return <MetricsSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Priority 1: Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Today's Appointments"
          value={apptStats?.todayCount || 0}
          icon={CalendarCheck}
          iconColor="text-primary-500"
          subtitle="Scheduled for today"
        />
        <MetricsCard
          label="Total Patients"
          value={providerStats?.total_patients || 0}
          icon={Users}
          iconColor="text-purple-500"
          subtitle="Unique patients seen"
        />
        <MetricsCard
          label="Earnings"
          value={formatCurrency(earnings || 0)}
          icon={Wallet}
          iconColor="text-success-500"
          subtitle="Available balance"
        />
        <MetricsCard
          label="Avg Rating"
          value={providerStats?.average_rating?.toFixed(1) || "—"}
          icon={Star}
          iconColor="text-warning-500"
          subtitle={`${providerStats?.total_reviews || 0} reviews`}
        />
      </div>

      {/* Priority 2: Trends and breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Appointments — Last 7 Days" description="Daily appointment volume">
          <TrendAreaChart data={apptStats?.trend || []} dataKey="appointments" />
        </ChartCard>
        <ChartCard title="Appointment Status" description="Breakdown by status">
          <MetricsDonutChart data={apptStats?.statusBreakdown || []} />
        </ChartCard>
      </div>

      {/* Priority 3: Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={CheckCircle2}
          iconColor="text-success-500"
        />
        <MetricsCard
          label="Upcoming"
          value={apptStats?.upcoming || 0}
          icon={Clock}
          iconColor="text-primary-500"
        />
        <MetricsCard
          label="No-shows"
          value={apptStats?.noShow || 0}
          icon={AlertTriangle}
          iconColor="text-error-500"
        />
        <MetricsCard
          label="Cancelled"
          value={apptStats?.cancelled || 0}
          icon={Calendar}
          iconColor="text-muted-foreground"
        />
      </div>
    </div>
  );
}

// ── Patient Metrics ────────────────────────────────────────────────
// Priority: 1) Upcoming appointments 2) Health 3) Prescriptions 4) Spending

export function PatientMetricsDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { data: apptStats, isLoading: apptLoading } = useAppointmentStats(user?.id, "patient");
  const { data: balance } = useWalletBalance(user?.id);

  const { data: prescriptionCount } = useQuery({
    queryKey: ["patient-prescription-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("prescriptions" as any)
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: vitalsCount } = useQuery({
    queryKey: ["patient-vitals-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("vital_signs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  if (apptLoading) {
    return <MetricsSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Priority 1: Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Upcoming Appointments"
          value={apptStats?.upcoming || 0}
          icon={CalendarCheck}
          iconColor="text-primary-500"
          subtitle={apptStats?.todayCount ? `${apptStats.todayCount} today` : "None today"}
        />
        <MetricsCard
          label="Active Prescriptions"
          value={prescriptionCount || 0}
          icon={Pill}
          iconColor="text-purple-500"
        />
        <MetricsCard
          label="Health Records"
          value={vitalsCount || 0}
          icon={Heart}
          iconColor="text-rose-500"
          subtitle="Vital sign entries"
        />
        <MetricsCard
          label="Wallet Balance"
          value={formatCurrency(balance || 0)}
          icon={Wallet}
          iconColor="text-success-500"
        />
      </div>

      {/* Priority 2: Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Appointments — Last 7 Days" description="Your recent visit activity">
          <TrendAreaChart data={apptStats?.trend || []} dataKey="appointments" color="#8b5cf6" />
        </ChartCard>
        <ChartCard title="Visit History" description="By status">
          <MetricsDonutChart data={apptStats?.statusBreakdown || []} />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Pharmacy Metrics ───────────────────────────────────────────────
// Priority: 1) Pending prescriptions 2) Inventory alerts 3) Revenue 4) Volume

export function PharmacyMetricsDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { data: revenue } = useWalletBalance(user?.id);

  const { data: pendingRx } = useQuery({
    queryKey: ["pharmacy-pending-rx", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("prescriptions" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["pharmacy-low-stock", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("pharmacy_inventory" as any)
        .select("id", { count: "exact", head: true })
        .eq("pharmacy_id", user.id)
        .lt("quantity", 10);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: dispensedTrend } = useQuery({
    queryKey: ["pharmacy-dispensed-trend", user?.id],
    queryFn: async () => {
      // Last 7 days of dispensed prescriptions
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { name: format(d, "EEE"), date: format(d, "yyyy-MM-dd"), dispensed: 0 };
      });
      return days;
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Pending Prescriptions"
          value={pendingRx || 0}
          icon={FileText}
          iconColor="text-warning-500"
          subtitle="Awaiting dispensing"
        />
        <MetricsCard
          label="Low Stock Alerts"
          value={lowStock || 0}
          icon={AlertTriangle}
          iconColor="text-error-500"
          subtitle="Items below 10 units"
        />
        <MetricsCard
          label="Revenue"
          value={formatCurrency(revenue || 0)}
          icon={DollarSign}
          iconColor="text-success-500"
        />
        <MetricsCard
          label="Dispensed (7d)"
          value={dispensedTrend?.reduce((s, d) => s + d.dispensed, 0) || 0}
          icon={Pill}
          iconColor="text-primary-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Dispensing Volume — Last 7 Days" description="Prescriptions dispensed daily">
          <MetricsBarChart data={dispensedTrend || []} dataKey="dispensed" color="#10b981" />
        </ChartCard>
        <ChartCard title="Inventory Health" description="Stock status overview">
          <MetricsDonutChart data={[
            { name: "In Stock", value: 100 - (lowStock || 0) },
            { name: "Low Stock", value: lowStock || 0 },
          ]} />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Lab Metrics ────────────────────────────────────────────────────
// Priority: 1) Pending orders 2) Turnaround 3) Volume 4) Revenue

export function LabMetricsDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { data: revenue } = useWalletBalance(user?.id);

  const { data: pendingOrders } = useQuery({
    queryKey: ["lab-pending-orders", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("lab_tests" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  const { data: completedToday } = useQuery({
    queryKey: ["lab-completed-today", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await supabase
        .from("lab_tests" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("created_at", today);
      return count || 0;
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Pending Orders"
          value={pendingOrders || 0}
          icon={FlaskConical}
          iconColor="text-warning-500"
          subtitle="Awaiting processing"
        />
        <MetricsCard
          label="Completed Today"
          value={completedToday || 0}
          icon={CheckCircle2}
          iconColor="text-success-500"
        />
        <MetricsCard
          label="Revenue"
          value={formatCurrency(revenue || 0)}
          icon={DollarSign}
          iconColor="text-success-500"
        />
        <MetricsCard
          label="Avg Turnaround"
          value="—"
          icon={Clock}
          iconColor="text-primary-500"
          subtitle="Hours (coming soon)"
        />
      </div>
    </div>
  );
}

// ── Institution Admin Metrics ──────────────────────────────────────
// Priority: 1) Patient census 2) Appointments 3) Staff 4) Revenue

export function InstitutionMetricsDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const { data: stats } = useQuery({
    queryKey: ["institution-metrics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Get institution for this admin
      const { data: inst } = await supabase
        .from("healthcare_institutions")
        .select("id")
        .eq("admin_id", user.id)
        .maybeSingle();
      if (!inst) return null;

      const today = format(new Date(), "yyyy-MM-dd");
      const { count: todayAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", (inst as any).id)
        .eq("date", today);

      const { count: totalStaff } = await supabase
        .from("user_roles" as any)
        .select("id", { count: "exact", head: true })
        .eq("institution_id", (inst as any).id);

      return {
        todayAppointments: todayAppts || 0,
        totalStaff: totalStaff || 0,
        institutionId: (inst as any).id,
      };
    },
    enabled: !!user?.id,
  });

  const { data: revenue } = useWalletBalance(user?.id);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Today's Appointments"
          value={stats?.todayAppointments || 0}
          icon={CalendarCheck}
          iconColor="text-primary-500"
        />
        <MetricsCard
          label="Total Staff"
          value={stats?.totalStaff || 0}
          icon={UserCheck}
          iconColor="text-purple-500"
        />
        <MetricsCard
          label="Revenue"
          value={formatCurrency(revenue || 0)}
          icon={DollarSign}
          iconColor="text-success-500"
        />
        <MetricsCard
          label="Bed Occupancy"
          value="—"
          icon={BedDouble}
          iconColor="text-primary-500"
          subtitle="Coming soon"
        />
      </div>
    </div>
  );
}

// ── Admin Metrics ──────────────────────────────────────────────────
// Priority: 1) Platform growth 2) Revenue 3) Active users 4) System health

export function AdminMetricsDashboard() {
  const { data: userCount } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: providerCount } = useQuery({
    queryKey: ["admin-total-providers"],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_roles" as any)
        .select("id", { count: "exact", head: true })
        .in("role", ["doctor", "nurse", "specialist"]);
      return count || 0;
    },
  });

  const { data: appointmentCount } = useQuery({
    queryKey: ["admin-total-appointments"],
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: institutionCount } = useQuery({
    queryKey: ["admin-total-institutions"],
    queryFn: async () => {
      const { count } = await supabase
        .from("healthcare_institutions")
        .select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  // User growth trend (last 7 days) - using profiles created_at
  const { data: growthTrend } = useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { name: format(d, "EEE"), users: 0 };
      });
      // TODO: Fill with real cumulative data
      return days;
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Total Users"
          value={userCount || 0}
          icon={Users}
          iconColor="text-primary-500"
          subtitle="Registered on platform"
        />
        <MetricsCard
          label="Providers"
          value={providerCount || 0}
          icon={Stethoscope}
          iconColor="text-purple-500"
          subtitle="Verified clinicians"
        />
        <MetricsCard
          label="Institutions"
          value={institutionCount || 0}
          icon={Building2}
          iconColor="text-success-500"
        />
        <MetricsCard
          label="Appointments"
          value={appointmentCount || 0}
          icon={Calendar}
          iconColor="text-warning-500"
          subtitle="All time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="User Growth — Last 7 Days" description="New registrations">
          <TrendLineChart data={growthTrend || []} dataKey="users" color="#0ea5e9" />
        </ChartCard>
        <ChartCard title="Platform Distribution" description="Users by type">
          <MetricsDonutChart data={[
            { name: "Patients", value: (userCount || 0) - (providerCount || 0) },
            { name: "Providers", value: providerCount || 0 },
          ]} />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Role router ────────────────────────────────────────────────────

import { Stethoscope } from "lucide-react";

export function RoleMetricsDashboard() {
  const { availableRoles, isHealthPersonnel, isAdmin, isPatient } = useUserRoles();

  const isPharmacy = availableRoles.some(r =>
    ["pharmacy", "wholesale_pharmacy", "pharmacist", "pharmacy_technologist"].includes(r)
  );
  const isLab = availableRoles.some(r =>
    ["lab", "lab_technician", "pathologist", "phlebotomist"].includes(r)
  );
  const isInstitution = availableRoles.some(r =>
    ["institution_admin", "institution_staff"].includes(r)
  );

  // Priority order: Admin > Institution > Pharmacy > Lab > Provider > Patient
  if (isAdmin) return <AdminMetricsDashboard />;
  if (isInstitution) return <InstitutionMetricsDashboard />;
  if (isPharmacy) return <PharmacyMetricsDashboard />;
  if (isLab) return <LabMetricsDashboard />;
  if (isHealthPersonnel) return <ProviderMetricsDashboard />;
  if (isPatient) return <PatientMetricsDashboard />;

  // Fallback: patient view
  return <PatientMetricsDashboard />;
}

function MetricsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {[1, 2].map(i => (
          <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

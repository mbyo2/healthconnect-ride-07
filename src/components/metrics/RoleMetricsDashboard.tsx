// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { useState } from "react";
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

  const { data: weeklyTrend, isLoading: trendLoading } = useQuery({
    queryKey: ["lab-weekly-trend", user?.id],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data } = await supabase
        .from("lab_tests" as any)
        .select("created_at, status")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: true });
      const rows = (data as any[]) || [];
      const byDay: Record<string, { date: string; completed: number; pending: number }> = {};
      rows.forEach((r: any) => {
        const day = r.created_at?.substring(0, 10) || '';
        if (!byDay[day]) byDay[day] = { date: day, completed: 0, pending: 0 };
        if (r.status === 'completed') byDay[day].completed++;
        else byDay[day].pending++;
      });
      return Object.values(byDay);
    },
  });

  const { data: statusBreakdown } = useQuery({
    queryKey: ["lab-status-breakdown", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lab_tests" as any)
        .select("status");
      const rows = (data as any[]) || [];
      const counts: Record<string, number> = {};
      rows.forEach((r: any) => {
        counts[r.status || 'unknown'] = (counts[r.status || 'unknown'] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Tests — Last 7 Days" description="Completed vs pending">
          {trendLoading ? (
            <div className="h-48 rounded-lg bg-muted animate-pulse" />
          ) : (
            <TrendAreaChart data={weeklyTrend || []} dataKey="completed" />
          )}
        </ChartCard>
        <ChartCard title="Orders by Status" description="Current breakdown">
          <MetricsDonutChart data={statusBreakdown || []} />
        </ChartCard>
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

  // User growth trend (last 7 days) - real signup counts from profiles.created_at
  const { data: growthTrend } = useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: async () => {
      const startOfWeek = subDays(new Date(), 6);
      startOfWeek.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startOfWeek.toISOString());
      // On error, return empty so the chart shows an honest "No data yet" state
      if (error || !data) return [];

      // Bucket real signups by day
      const counts = new Map<string, number>();
      for (const row of data) {
        if (!row.created_at) continue;
        const day = format(new Date(row.created_at), "yyyy-MM-dd");
        counts.set(day, (counts.get(day) || 0) + 1);
      }

      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const key = format(d, "yyyy-MM-dd");
        return { name: format(d, "EEE"), users: counts.get(key) || 0 };
      });
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

// ── Nurse Metrics ──────────────────────────────────────────────────
// Priority: 1) Triage/vitals today 2) Queue 3) Vaccinations 4) ANC visits

export function NurseMetricsDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: vitals, isLoading: vitalsLoading } = useQuery({
    queryKey: ['nurse-vitals', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase.from('vital_signs' as any)
        .select('id, created_at')
        .gte('created_at', fromISO).lte('created_at', `${toISO}T23:59:59`)
        .order('created_at', { ascending: true });
      const rows = (data as any[]) || [];
      // Daily trend
      const byDay: Record<string, number> = {};
      rows.forEach((r: any) => {
        const day = r.created_at?.substring(0, 10) || '';
        byDay[day] = (byDay[day] || 0) + 1;
      });
      const trend = Object.entries(byDay).map(([date, count]) => ({ date, vitals: count }));
      return { count: rows.length, trend };
    },
  });
  const { data: vaccinations } = useQuery({
    queryKey: ['nurse-vaccinations', fromISO, toISO],
    queryFn: async () => {
      const { count } = await supabase.from('immunizations' as any)
        .select('id', { count: 'exact', head: true })
        .not('administered_date', 'is', null)
        .gte('administered_date', fromISO).lte('administered_date', toISO);
      return count || 0;
    },
  });
  const { data: anc } = useQuery({
    queryKey: ['nurse-anc', fromISO, toISO],
    queryFn: async () => {
      const { count } = await supabase.from('anc_visits' as any)
        .select('id', { count: 'exact', head: true })
        .gte('visit_date', fromISO).lte('visit_date', toISO);
      return count || 0;
    },
  });
  const { data: queueWaiting } = useQuery({
    queryKey: ['nurse-queue'],
    queryFn: async () => {
      const { count } = await supabase.from('queue_tokens' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'waiting');
      return count || 0;
    },
  });

  if (vitalsLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const activityBreakdown = [
    { name: 'Vitals', value: vitals?.count || 0 },
    { name: 'Vaccinations', value: vaccinations || 0 },
    { name: 'ANC Visits', value: anc || 0 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Vitals Recorded" value={vitals?.count || 0} icon={Activity} iconColor="text-primary-500" subtitle={`${fromISO} → ${toISO}`} />
        <MetricsCard label="Vaccinations Given" value={vaccinations || 0} icon={CheckCircle2} iconColor="text-success-500" />
        <MetricsCard label="ANC Visits" value={anc || 0} icon={Heart} iconColor="text-pink-500" />
        <MetricsCard label="Queue Waiting" value={queueWaiting || 0} icon={Clock} iconColor="text-warning-500" subtitle="Right now" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Vitals Trend" description="Daily vitals recorded">
          <TrendAreaChart data={vitals?.trend || []} dataKey="vitals" />
        </ChartCard>
        <ChartCard title="Activity Breakdown" description="By activity type">
          <MetricsDonutChart data={activityBreakdown} />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Receptionist / Front-Office Metrics ────────────────────────────
// Priority: 1) Check-ins today 2) Queue 3) No-shows 4) Appointments

export function ReceptionistMetricsDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: checkins } = useQuery({
    queryKey: ['recep-checkins', fromISO, toISO],
    queryFn: async () => {
      const { count } = await supabase.from('queue_tokens' as any)
        .select('id', { count: 'exact', head: true })
        .gte('check_in_time', fromISO).lte('check_in_time', `${toISO}T23:59:59`);
      return count || 0;
    },
  });
  const { data: noShows } = useQuery({
    queryKey: ['recep-noshow', fromISO, toISO],
    queryFn: async () => {
      const { count } = await supabase.from('appointments' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'no_show')
        .gte('date', fromISO).lte('date', toISO);
      return count || 0;
    },
  });
  const { data: appointments } = useQuery({
    queryKey: ['recep-appts', fromISO, toISO],
    queryFn: async () => {
      const { count } = await supabase.from('appointments' as any)
        .select('id', { count: 'exact', head: true })
        .gte('date', fromISO).lte('date', toISO);
      return count || 0;
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Check-ins" value={checkins || 0} icon={UserCheck} iconColor="text-primary-500" subtitle={`${fromISO} → ${toISO}`} />
        <MetricsCard label="Appointments" value={appointments || 0} icon={CalendarCheck} iconColor="text-success-500" />
        <MetricsCard label="No-Shows" value={noShows || 0} icon={AlertTriangle} iconColor="text-destructive" />
        <MetricsCard label="No-Show Rate" value={appointments ? `${Math.round(((noShows || 0) / appointments) * 100)}%` : '—'} icon={TrendingUp} iconColor="text-warning-500" />
      </div>
    </div>
  );
}

// ── Finance / Billing Metrics ──────────────────────────────────────
// Priority: 1) Revenue 2) Collected 3) Outstanding 4) Claims

export function FinanceMetricsDashboard() {
  const { formatPrice } = useCurrency();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['finance-invoices', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase.from('hospital_billing' as any)
        .select('total_amount, balance, payment_status')
        .gte('created_at', fromISO).lte('created_at', `${toISO}T23:59:59`);
      const rows = (data as any[]) || [];
      return {
        billed: rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0),
        outstanding: rows.reduce((s, r) => s + (Number(r.balance) || 0), 0),
        count: rows.length,
      };
    },
  });
  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['finance-claims', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase.from('insurance_claims' as any)
        .select('claim_amount, status')
        .gte('created_at', fromISO).lte('created_at', `${toISO}T23:59:59`);
      const rows = (data as any[]) || [];
      return {
        total: rows.reduce((s, r) => s + (Number(r.claim_amount) || 0), 0),
        pending: rows.filter((r) => r.status === 'submitted').length,
      };
    },
  });

  if (invoicesLoading || claimsLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const billed = invoices?.billed || 0;
  const outstanding = invoices?.outstanding || 0;
  const collected = billed - outstanding;

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Total Billed" value={formatPrice(billed)} icon={DollarSign} iconColor="text-primary-500" subtitle={`${invoices?.count || 0} invoices`} />
        <MetricsCard label="Collected" value={formatPrice(collected)} icon={CheckCircle2} iconColor="text-success-500" subtitle={billed ? `${Math.round((collected / billed) * 100)}% of billed` : ''} />
        <MetricsCard label="Outstanding" value={formatPrice(outstanding)} icon={AlertTriangle} iconColor="text-destructive" />
        <MetricsCard label="Claims Pending" value={claims?.pending || 0} icon={FileText} iconColor="text-warning-500" subtitle={formatPrice(claims?.total || 0)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Collection Rate" description="Collected vs outstanding">
          <MetricsDonutChart data={[
            { name: 'Collected', value: collected },
            { name: 'Outstanding', value: outstanding },
          ]} />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Shared dashboard filter bar ────────────────────────────────────

function DashboardFilters({ from, to, setFrom, setTo }: {
  from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-border bg-card">
      <span className="text-xs font-semibold text-muted-foreground mr-1">Period:</span>
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background"
        aria-label="From date"
      />
      <span className="text-xs text-muted-foreground">→</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background"
        aria-label="To date"
      />
      {(from || to) && (
        <button
          onClick={() => { setFrom(''); setTo(''); }}
          className="text-xs font-medium text-primary-500 hover:underline ml-1"
        >
          Reset
        </button>
      )}
    </div>
  );
}

// ── Super Admin Metrics (PLATFORM-WIDE) ────────────────────────────
// Distinct from Admin: sees EVERYTHING across all institutions.

export function SuperAdminMetricsDashboard() {
  const { formatPrice } = useCurrency();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats', from, to],
    queryFn: async () => {
      const [inst, users, subs] = await Promise.all([
        supabase.from('healthcare_institutions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('institution_subscriptions' as any).select('status').eq('status', 'active'),
      ]);
      return {
        institutions: inst.count || 0,
        users: users.count || 0,
        activeSubs: ((subs.data as any[]) || []).length,
      };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Institutions" value={stats?.institutions || 0} icon={Building2} iconColor="text-primary-500" subtitle="Platform-wide" />
        <MetricsCard label="Total Users" value={stats?.users || 0} icon={Users} iconColor="text-success-500" subtitle="All roles" />
        <MetricsCard label="Active Subscriptions" value={stats?.activeSubs || 0} icon={CheckCircle2} iconColor="text-warning-500" />
        <MetricsCard label="Platform Scope" value="Global" icon={Activity} iconColor="text-purple-500" subtitle="All countries" />
      </div>
    </div>
  );
}

// ── CXO / Executive Metrics ────────────────────────────────────────

export function CXOMetricsDashboard() {
  const { formatPrice } = useCurrency();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: kpis } = useQuery({
    queryKey: ['cxo-kpis', fromISO, toISO],
    queryFn: async () => {
      const [inv, appts, adm] = await Promise.all([
        supabase.from('hospital_billing' as any).select('total_amount').gte('created_at', fromISO).lte('created_at', `${toISO}T23:59:59`),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('date', fromISO).lte('date', toISO),
        supabase.from('hospital_admissions' as any).select('id', { count: 'exact', head: true }).gte('admission_date', fromISO).lte('admission_date', toISO),
      ]);
      const revenue = ((inv.data as any[]) || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
      return { revenue, appointments: appts.count || 0, admissions: adm.count || 0 };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Revenue" value={formatPrice(kpis?.revenue || 0)} icon={DollarSign} iconColor="text-success-500" subtitle={`${fromISO} → ${toISO}`} />
        <MetricsCard label="Appointments" value={kpis?.appointments || 0} icon={CalendarCheck} iconColor="text-primary-500" />
        <MetricsCard label="Admissions" value={kpis?.admissions || 0} icon={BedDouble} iconColor="text-warning-500" />
        <MetricsCard label="Growth" value="—" icon={TrendingUp} iconColor="text-purple-500" subtitle="vs prior period" />
      </div>
    </div>
  );
}

// ── Radiologist Metrics ────────────────────────────────────────────

export function RadiologistMetricsDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: stats } = useQuery({
    queryKey: ['radio-stats', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase.from('imaging_orders' as any)
        .select('status').gte('ordered_at', fromISO).lte('ordered_at', `${toISO}T23:59:59`);
      const rows = (data as any[]) || [];
      return {
        total: rows.length,
        pending: rows.filter((r) => r.status === 'ordered').length,
        completed: rows.filter((r) => r.status === 'completed').length,
      };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Imaging Orders" value={stats?.total || 0} icon={Activity} iconColor="text-primary-500" />
        <MetricsCard label="Pending" value={stats?.pending || 0} icon={Clock} iconColor="text-warning-500" />
        <MetricsCard label="Completed" value={stats?.completed || 0} icon={CheckCircle2} iconColor="text-success-500" />
        <MetricsCard label="Completion" value={stats?.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '—'} icon={TrendingUp} iconColor="text-purple-500" />
      </div>
    </div>
  );
}

// ── HR Manager Metrics ─────────────────────────────────────────────

export function HRMetricsDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: async () => {
      const [staff, shifts] = await Promise.all([
        supabase.from('institution_staff' as any).select('id, role').eq('is_active', true),
        supabase.from('medical_shifts' as any).select('id, shift_date').gte('shift_date', format(subDays(new Date(), 7), 'yyyy-MM-dd')),
      ]);
      const staffRows = (staff.data as any[]) || [];
      const shiftRows = (shifts.data as any[]) || [];
      
      // Staff by role
      const byRole: Record<string, number> = {};
      staffRows.forEach((s: any) => {
        const role = s.role || 'unknown';
        byRole[role] = (byRole[role] || 0) + 1;
      });
      const roleBreakdown = Object.entries(byRole)
        .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      
      // Shifts trend (last 7 days)
      const byDay: Record<string, number> = {};
      shiftRows.forEach((s: any) => {
        const day = s.shift_date?.substring(0, 10) || '';
        byDay[day] = (byDay[day] || 0) + 1;
      });
      const shiftTrend = Object.entries(byDay).map(([date, shifts]) => ({ date, shifts }));
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayShifts = shiftRows.filter((s: any) => s.shift_date?.substring(0, 10) === today).length;
      
      return { 
        activeStaff: staffRows.length, 
        todayShifts,
        roleBreakdown,
        shiftTrend,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Active Staff" value={stats?.activeStaff || 0} icon={Users} iconColor="text-primary-500" />
        <MetricsCard label="Shifts Today" value={stats?.todayShifts || 0} icon={Calendar} iconColor="text-success-500" />
        <MetricsCard label="On Leave" value="—" icon={Clock} iconColor="text-warning-500" subtitle="Coming soon" />
        <MetricsCard label="Open Roles" value="—" icon={UserCheck} iconColor="text-purple-500" subtitle="Coming soon" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard title="Staff by Role" description="Distribution across roles">
          <MetricsDonutChart data={stats?.roleBreakdown || []} />
        </ChartCard>
        <ChartCard title="Shifts — Last 7 Days" description="Daily shift volume">
          <TrendAreaChart data={stats?.shiftTrend || []} dataKey="shifts" />
        </ChartCard>
      </div>
    </div>
  );
}

// ── OT (Theatre) Staff Metrics ─────────────────────────────────────

export function OTMetricsDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: stats } = useQuery({
    queryKey: ['ot-stats', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase.from('procedure_executions' as any)
        .select('id, status').gte('execution_date', fromISO).lte('execution_date', toISO);
      const rows = (data as any[]) || [];
      return {
        total: rows.length,
        completed: rows.filter((r) => r.status === 'completed').length,
      };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Procedures" value={stats?.total || 0} icon={Activity} iconColor="text-primary-500" subtitle={`${fromISO} → ${toISO}`} />
        <MetricsCard label="Completed" value={stats?.completed || 0} icon={CheckCircle2} iconColor="text-success-500" />
        <MetricsCard label="Theatre Utilization" value="—" icon={TrendingUp} iconColor="text-warning-500" subtitle="Coming soon" />
        <MetricsCard label="Avg Duration" value="—" icon={Clock} iconColor="text-purple-500" subtitle="Coming soon" />
      </div>
    </div>
  );
}

// ── Inventory Manager Metrics ──────────────────────────────────────

export function InventoryMetricsDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('pharmacy_inventory' as any).select('quantity, reorder_level');
      const rows = (data as any[]) || [];
      return {
        totalItems: rows.length,
        lowStock: rows.filter((r) => (r.quantity || 0) <= (r.reorder_level || 10)).length,
        outOfStock: rows.filter((r) => (r.quantity || 0) <= 0).length,
      };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Stock Items" value={stats?.totalItems || 0} icon={Pill} iconColor="text-primary-500" />
        <MetricsCard label="Low Stock" value={stats?.lowStock || 0} icon={AlertTriangle} iconColor="text-warning-500" />
        <MetricsCard label="Out of Stock" value={stats?.outOfStock || 0} icon={AlertTriangle} iconColor="text-destructive" />
        <MetricsCard label="Stock Value" value="—" icon={DollarSign} iconColor="text-success-500" subtitle="Coming soon" />
      </div>
    </div>
  );
}

// ── Triage Staff Metrics ───────────────────────────────────────────

export function TriageMetricsDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['triage-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [waiting, triaged] = await Promise.all([
        supabase.from('queue_tokens' as any).select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
        supabase.from('vital_signs' as any).select('id', { count: 'exact', head: true }).gte('created_at', today),
      ]);
      return { waiting: waiting.count || 0, triagedToday: triaged.count || 0 };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Waiting for Triage" value={stats?.waiting || 0} icon={Clock} iconColor="text-warning-500" subtitle="Right now" />
        <MetricsCard label="Triaged Today" value={stats?.triagedToday || 0} icon={CheckCircle2} iconColor="text-success-500" />
        <MetricsCard label="Avg Wait" value="—" icon={Activity} iconColor="text-primary-500" subtitle="Coming soon" />
        <MetricsCard label="Emergency" value="—" icon={AlertTriangle} iconColor="text-destructive" subtitle="Coming soon" />
      </div>
    </div>
  );
}

// ── Ambulance Staff Metrics ────────────────────────────────────────

export function AmbulanceMetricsDashboard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromISO = from || format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const toISO = to || format(new Date(), 'yyyy-MM-dd');

  const { data: stats } = useQuery({
    queryKey: ['ambulance-stats', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase.from('ambulance_trips' as any)
        .select('status').gte('created_at', fromISO).lte('created_at', `${toISO}T23:59:59`);
      const rows = (data as any[]) || [];
      return { total: rows.length, completed: rows.filter((r) => r.status === 'completed').length };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Trips" value={stats?.total || 0} icon={Activity} iconColor="text-primary-500" subtitle={`${fromISO} → ${toISO}`} />
        <MetricsCard label="Completed" value={stats?.completed || 0} icon={CheckCircle2} iconColor="text-success-500" />
        <MetricsCard label="Avg Response" value="—" icon={Clock} iconColor="text-warning-500" subtitle="Coming soon" />
        <MetricsCard label="Vehicles Active" value="—" icon={CheckCircle2} iconColor="text-purple-500" subtitle="Coming soon" />
      </div>
    </div>
  );
}

// ── Maintenance Manager Metrics ────────────────────────────────────

export function MaintenanceMetricsDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['maintenance-stats'],
    queryFn: async () => {
      const [assets, tickets] = await Promise.all([
        supabase.from('asset_register' as any).select('status'),
        supabase.from('maintenance_tickets' as any).select('status').neq('status', 'resolved'),
      ]);
      const assetRows = (assets.data as any[]) || [];
      return {
        totalAssets: assetRows.length,
        operational: assetRows.filter((a) => a.status === 'operational').length,
        openTickets: ((tickets.data as any[]) || []).length,
      };
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard label="Total Assets" value={stats?.totalAssets || 0} icon={Activity} iconColor="text-primary-500" />
        <MetricsCard label="Operational" value={stats?.operational || 0} icon={CheckCircle2} iconColor="text-success-500" />
        <MetricsCard label="Open Tickets" value={stats?.openTickets || 0} icon={AlertTriangle} iconColor="text-warning-500" />
        <MetricsCard label="Downtime" value="—" icon={Clock} iconColor="text-destructive" subtitle="Coming soon" />
      </div>
    </div>
  );
}

export function RoleMetricsDashboard() {
  const { availableRoles, isHealthPersonnel, isAdmin, isPatient } = useUserRoles();

  const isSuperAdmin = availableRoles.includes("super_admin");
  const isPharmacy = availableRoles.some(r =>
    ["pharmacy", "wholesale_pharmacy", "pharmacist", "pharmacy_technologist"].includes(r)
  );
  const isLab = availableRoles.some(r =>
    ["lab", "lab_technician", "pathologist", "phlebotomist"].includes(r)
  );
  // Institution admin is DISTINCT from platform admin — facility-scoped only.
  const isInstitutionAdmin = availableRoles.includes("institution_admin");
  const isInstitutionStaff = availableRoles.includes("institution_staff");
  const isNurse = availableRoles.some(r =>
    ["nurse", "midwife", "nurse_assistant"].includes(r)
  );
  const isReceptionist = availableRoles.some(r =>
    ["receptionist", "front_office", "medical_records_officer"].includes(r)
  );
  const isFinance = availableRoles.some(r =>
    ["finance_manager", "accountant", "billing_staff", "cashier"].includes(r)
  );
  const isCXO = availableRoles.includes("cxo");
  const isRadiologist = availableRoles.includes("radiologist");
  const isHR = availableRoles.includes("hr_manager");
  const isOT = availableRoles.includes("ot_staff");
  const isInventory = availableRoles.includes("inventory_manager");
  const isTriage = availableRoles.includes("triage_staff");
  const isAmbulance = availableRoles.includes("ambulance_staff");
  const isMaintenance = availableRoles.includes("maintenance_manager");
  const isSupport = availableRoles.includes("support");

  // Priority: SuperAdmin (platform-wide) > Admin (platform) > CXO >
  // InstitutionAdmin (facility) > Finance > Pharmacy > Lab > Radiologist >
  // Nurse > Triage > Receptionist > OT > Inventory > Ambulance >
  // Maintenance > HR > Support > Provider > Patient
  if (isSuperAdmin) return <SuperAdminMetricsDashboard />;
  if (isAdmin) return <AdminMetricsDashboard />;
  if (isCXO) return <CXOMetricsDashboard />;
  if (isInstitutionAdmin) return <InstitutionMetricsDashboard />;
  if (isInstitutionStaff) return <InstitutionMetricsDashboard />;
  if (isFinance) return <FinanceMetricsDashboard />;
  if (isPharmacy) return <PharmacyMetricsDashboard />;
  if (isLab) return <LabMetricsDashboard />;
  if (isRadiologist) return <RadiologistMetricsDashboard />;
  if (isNurse) return <NurseMetricsDashboard />;
  if (isTriage) return <TriageMetricsDashboard />;
  if (isReceptionist) return <ReceptionistMetricsDashboard />;
  if (isOT) return <OTMetricsDashboard />;
  if (isInventory) return <InventoryMetricsDashboard />;
  if (isAmbulance) return <AmbulanceMetricsDashboard />;
  if (isMaintenance) return <MaintenanceMetricsDashboard />;
  if (isHR) return <HRMetricsDashboard />;
  if (isSupport) return <AdminMetricsDashboard />;
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

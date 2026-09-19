import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/UserManagement";
import { SecurityAuditLogs } from "@/components/admin/SecurityAuditLogs";
import { TestAccountSetup } from "@/components/admin/TestAccountSetup";
import { RevenueAnalyticsDashboard } from "@/components/admin/RevenueAnalyticsDashboard";
import { InstitutionApplications } from "@/components/admin/InstitutionApplications";
import { ProviderApplications } from "@/components/admin/ProviderApplications";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { PromoCodeManager } from "@/components/admin/PromoCodeManager";
import { CommissionSettings } from "@/components/admin/CommissionSettings";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/MetricCard";
import { QuickActions } from "@/components/shared/QuickActions";
import { TrendChart, SimpleBarChart, DonutChart, StatsCard } from "@/components/charts";
import { SuggestionBanner, RecommendationCard } from "@/components/guidance";
import {
  Shield, Users, Activity, DollarSign, Building2, Stethoscope,
  UserCog, Ticket, Percent, Lock, Sparkles, RefreshCw, TrendingUp,
  AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CLINICIAN_ROLES } from "@/config/roleConfig";
import { format, subMonths, startOfMonth } from "date-fns";

const TABS = [
  { value: "overview", label: "Overview", icon: Sparkles },
  { value: "users", label: "Users", icon: Users },
  { value: "roles", label: "Roles", icon: UserCog },
  { value: "providers", label: "Providers", icon: Stethoscope },
  { value: "applications", label: "Institutions", icon: Building2 },
  { value: "revenue", label: "Revenue", icon: DollarSign },
  { value: "commissions", label: "Commissions", icon: Percent },
  { value: "promos", label: "Promos", icon: Ticket },
  { value: "security", label: "Security", icon: Lock },
  { value: "audit", label: "Audit Logs", icon: Activity },
  { value: "test", label: "Test Setup", icon: Shield },
];

export const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setTab = (v: string) => setSearchParams({ tab: v });

  // Platform-wide overview — every number below comes from live tables.
  const { data: platform } = useQuery({
    queryKey: ['admin-platform-overview'],
    queryFn: async () => {
      const [profilesRes, instRes, payRes, secRes, provAppsRes] = await Promise.all([
        supabase.from('profiles').select('id, role, created_at').limit(5000),
        supabase.from('healthcare_institutions').select('id, is_verified, created_at').limit(2000),
        supabase.from('payments').select('amount, status, created_at').in('status', ['paid', 'completed']).limit(5000),
        supabase.from('security_events').select('id, created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).limit(1000),
        supabase.from('health_personnel_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return {
        profiles: (profilesRes.data || []) as any[],
        institutions: (instRes.data || []) as any[],
        payments: (payRes.data || []) as any[],
        securityWeek: secRes.data || [],
        pendingProviders: provAppsRes.count ?? 0,
      };
    },
  });

  const overview = useMemo(() => {
    const profiles = platform?.profiles || [];
    const institutions = platform?.institutions || [];
    const payments = platform?.payments || [];
    const isClinician = (r: string) => (ALL_CLINICIAN_ROLES as readonly string[]).includes(r);
    const patients = profiles.filter((p) => p.role === 'patient');
    const providers = profiles.filter((p) => isClinician(p.role));
    const admins = profiles.filter((p) => ['admin', 'super_admin'].includes(p.role));

    // Last-6-months growth per cohort from real created_at timestamps.
    const months: { name: string; start: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      months.push({ name: format(d, 'MMM'), start: d });
    }
    const inMonth = (ts: string | null, idx: number) => {
      if (!ts) return false;
      const t = new Date(ts).getTime();
      const start = months[idx].start.getTime();
      const end = idx + 1 < months.length ? months[idx + 1].start.getTime() : Date.now() + 1;
      return t >= start && t < end;
    };
    const userGrowthData = months.map((m, i) => ({
      name: m.name,
      patients: patients.filter((p) => inMonth(p.created_at, i)).length,
      providers: providers.filter((p) => inMonth(p.created_at, i)).length,
      institutions: institutions.filter((x: any) => inMonth(x.created_at, i)).length,
    }));

    const revenueData = months.map((m, i) => ({
      name: m.name,
      revenue: Math.round(
        payments.filter((p: any) => inMonth(p.created_at, i)).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
      ),
    }));

    const userTypeDistribution = [
      { name: 'Patients', value: patients.length, color: '#397dff' },
      { name: 'Providers', value: providers.length, color: '#22C55E' },
      { name: 'Institutions', value: institutions.length, color: '#f55c15' },
      { name: 'Admins', value: admins.length, color: '#F59E0B' },
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const securityMetrics = Array.from({ length: 7 }, (_, k) => {
      const d = new Date(Date.now() - (6 - k) * 86400000);
      const key = d.toDateString();
      return {
        name: dayNames[d.getDay()],
        incidents: (platform?.securityWeek || []).filter((e: any) => e.created_at && new Date(e.created_at).toDateString() === key).length,
      };
    });

    const monthStart = startOfMonth(new Date()).toISOString();
    return {
      userGrowthData,
      revenueData,
      userTypeDistribution,
      securityMetrics,
      totalUsers: profiles.length,
      providerCount: providers.length,
      monthRevenue: Math.round(
        payments.filter((p: any) => p.created_at && p.created_at >= monthStart).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
      ),
      incidentsWeek: (platform?.securityWeek || []).length,
      pendingProviders: platform?.pendingProviders || 0,
      pendingInstitutions: institutions.filter((x: any) => !x.is_verified).length,
    };
  }, [platform]);

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                Executive Admin Dashboard
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
              </h1>
              <p className="text-sm text-graphite-500 font-medium tracking-wide">
                System-wide governance, security audit logs, platform revenue & accreditation controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-pill text-xs font-medium text-white bg-success-500">
              Active System Governance
            </span>
          </div>
        </div>
      </div>

      {/* Main Board Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
          <div className="overflow-x-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-[#e6e9ef] dark:border-slate-800">
            <TabsList className="inline-flex w-auto min-w-full flex-wrap h-auto gap-1 bg-transparent p-1">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="text-xs font-extrabold px-3.5 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white flex items-center gap-1.5 transition-all"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs">
            <TabsContent value="overview">
              <div className="space-y-5">
                {/* Header */}
                <div>
                  <h2 className="font-display text-xl font-medium text-midnight mb-1">
                    Platform Overview
                  </h2>
                  <p className="text-sm text-graphite-500">
                    Real-time metrics, trends, and actionable insights for Doc' O Clock
                  </p>
                </div>

                {/* Alert Banner */}
                <SuggestionBanner
                  title="System Health Check Required"
                  description="Schedule routine database maintenance and security audit for optimal performance."
                  variant="warning"
                  icon={AlertTriangle}
                  actions={[
                    { label: 'Schedule Now', onClick: () => setTab('security'), variant: 'primary' },
                    { label: 'View Details', onClick: () => setTab('audit'), variant: 'secondary' },
                  ]}
                />

                {/* Key Metrics — live platform counts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Users"
                    value={overview.totalUsers.toString()}
                    subtitle="Registered accounts"
                    icon={Users}
                  />
                  <MetricCard
                    title="Platform Revenue"
                    value={`K${overview.monthRevenue.toLocaleString()}`}
                    subtitle="Collected this month"
                    icon={DollarSign}
                  />
                  <MetricCard
                    title="Verified Providers"
                    value={overview.providerCount.toString()}
                    subtitle="All clinical cadres"
                    icon={Stethoscope}
                  />
                  <MetricCard
                    title="Security Incidents"
                    value={overview.incidentsWeek.toString()}
                    subtitle="Last 7 days"
                    icon={Shield}
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* User Growth Trend */}
                  <div className="vf-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display text-sm font-medium text-midnight">
                          User Growth Trends
                        </h3>
                        <p className="text-xs text-graphite-500 mt-1">
                          Patient, provider, and institution growth over time
                        </p>
                      </div>
                      <button className="text-primary-500 hover:text-primary-600 text-xs font-medium">
                        View Details
                      </button>
                    </div>
                    <TrendChart
                      data={overview.userGrowthData}
                      lines={[
                        { dataKey: 'patients', name: 'Patients', color: '#397dff' },
                        { dataKey: 'providers', name: 'Providers', color: '#22C55E' },
                        { dataKey: 'institutions', name: 'Institutions', color: '#f55c15' },
                      ]}
                      height={280}
                    />
                  </div>

                  {/* Collected Revenue */}
                  <div className="vf-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display text-sm font-medium text-midnight">
                          Collected Revenue
                        </h3>
                        <p className="text-xs text-graphite-500 mt-1">
                          Paid & completed payments per month
                        </p>
                      </div>
                      <button
                        onClick={() => setTab('revenue')}
                        className="text-primary-500 hover:text-primary-600 text-xs font-medium"
                      >
                        Full Report
                      </button>
                    </div>
                    <SimpleBarChart
                      data={overview.revenueData}
                      bars={[
                        { dataKey: 'revenue', name: 'Collected (ZMW)', color: '#22C55E' },
                      ]}
                      height={280}
                    />
                  </div>

                  {/* User Distribution */}
                  <div className="vf-card p-5">
                    <div className="mb-4">
                      <h3 className="font-display text-sm font-medium text-midnight">
                        User Type Distribution
                      </h3>
                      <p className="text-xs text-graphite-500 mt-1">
                        Breakdown of user roles across the platform
                      </p>
                    </div>
                    <DonutChart data={overview.userTypeDistribution} height={280} />
                  </div>

                  {/* Security Incidents */}
                  <div className="vf-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display text-sm font-medium text-midnight">
                          Security Incidents
                        </h3>
                        <p className="text-xs text-graphite-500 mt-1">
                          Last 7 days incident tracking
                        </p>
                      </div>
                      <button 
                        onClick={() => setTab('security')}
                        className="text-primary-500 hover:text-primary-600 text-xs font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <SimpleBarChart
                      data={overview.securityMetrics}
                      bars={[
                        { dataKey: 'incidents', name: 'Incidents', color: '#EF4444' },
                      ]}
                      height={280}
                    />
                  </div>
                </div>

                {/* Action Items */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <RecommendationCard
                    title="Review Pending Provider Applications"
                    description={`${overview.pendingProviders} healthcare providers and ${overview.pendingInstitutions} institutions are awaiting verification and approval.`}
                    reason="Processing delays may impact provider onboarding and platform growth"
                    icon={Stethoscope}
                    priority={overview.pendingProviders > 0 || overview.pendingInstitutions > 0 ? "high" : "low"}
                    tags={['Urgent', 'Onboarding']}
                    action={{
                      label: 'Review Applications',
                      onClick: () => setTab('providers'),
                    }}
                  />

                  <RecommendationCard
                    title="Update Security Policies"
                    description="Annual security policy review is due for compliance requirements."
                    reason="Stay compliant with healthcare data protection standards"
                    icon={Lock}
                    priority="medium"
                    tags={['Compliance', 'Security']}
                    action={{
                      label: 'Review Policies',
                      onClick: () => setTab('security'),
                    }}
                  />
                </div>

                {/* Quick Actions */}
                <QuickActions
                  title="Quick Admin Actions"
                  actions={[
                    {
                      label: 'Manage Users',
                      icon: Users,
                      onClick: () => setTab('users'),
                      variant: 'primary',
                    },
                    {
                      label: 'View Revenue',
                      icon: DollarSign,
                      onClick: () => setTab('revenue'),
                      variant: 'secondary',
                    },
                    {
                      label: 'Security Dashboard',
                      icon: Shield,
                      onClick: () => setTab('security'),
                      variant: 'secondary',
                    },
                    {
                      label: 'Audit Logs',
                      icon: Activity,
                      onClick: () => setTab('audit'),
                      variant: 'secondary',
                    },
                  ]}
                />
              </div>
            </TabsContent>
            <TabsContent value="users"><UserManagement /></TabsContent>
            <TabsContent value="roles"><RoleManagement /></TabsContent>
            <TabsContent value="providers"><ProviderApplications /></TabsContent>
            <TabsContent value="applications"><InstitutionApplications /></TabsContent>
            <TabsContent value="revenue"><RevenueAnalyticsDashboard /></TabsContent>
            <TabsContent value="commissions"><CommissionSettings /></TabsContent>
            <TabsContent value="promos"><PromoCodeManager /></TabsContent>
            <TabsContent value="security"><SecurityDashboard /></TabsContent>
            <TabsContent value="audit"><SecurityAuditLogs /></TabsContent>
            <TabsContent value="test">
              <div className="space-y-2">
                <h3 className="font-extrabold text-base">Test Account Diagnostics</h3>
                <p className="text-xs text-[#676879]">Create test credentials for development and QA validation</p>
                <TestAccountSetup />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

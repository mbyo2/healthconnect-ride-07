import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, DollarSign, Building2, TrendingUp, Users, ShieldCheck, Loader2, BedDouble, FileText, ChevronRight } from 'lucide-react';
import { useCXODashboard } from '@/hooks/useCXODashboard';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';

interface ActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

interface ActionGroup {
  title: string;
  primary: ActionItem;
  secondary: ActionItem[];
}

export const CXOWorkflow = () => {
  const { metrics, loading } = useCXODashboard();
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;

  const groups: ActionGroup[] = [
    {
      title: 'Analytics',
      primary: { title: 'MIS Reports', description: 'Revenue, occupancy & performance', icon: icon(BarChart3), route: '/institution/reports' },
      secondary: [],
    },
    {
      title: 'Finance',
      primary: { title: 'Financial Overview', description: 'P&L, revenue analytics', icon: icon(DollarSign), route: '/wallet' },
      secondary: [],
    },
    {
      title: 'Operations',
      primary: { title: 'Operations', description: 'Multi-location management', icon: icon(Building2), route: '/hospital-management' },
      secondary: [],
    },
    {
      title: 'Governance',
      primary: { title: 'Compliance', description: 'Audit & regulatory reports', icon: icon(ShieldCheck), route: '/compliance-audit' },
      secondary: [],
    },
  ];

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `K${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `K${(n / 1_000).toFixed(0)}`;
    return `K${n.toFixed(0)}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Building2 className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Executive Workspace</p>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Executive Dashboard</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Today at a Glance */}
          <section>
            <h2 className="mb-4 text-[18px] font-semibold text-foreground">Today at a glance</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => handleNavigation('/wallet', 'Financial Overview')}
                className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <DollarSign className="h-5 w-5 opacity-80" />
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </div>
                <p className="mt-3 text-[28px] font-bold leading-none">{fmt(metrics.revenueMTD)}</p>
                <p className="mt-1 text-[15px] font-medium">Revenue (MTD)</p>
                <p className="text-[13px] opacity-80">Month to date</p>
              </button>

              <button
                onClick={() => handleNavigation('/institution/reports', 'MIS Reports')}
                className="rounded-2xl border border-border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <p className={`mt-3 text-[28px] font-bold leading-none ${metrics.growthPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {metrics.growthPercent >= 0 ? '+' : ''}{metrics.growthPercent}%
                </p>
                <p className="mt-1 text-[15px] font-medium text-foreground">Growth</p>
                <p className="text-[13px] text-muted-foreground">vs last month</p>
              </button>

              <button
                onClick={() => handleNavigation('/appointments', 'Appointments')}
                className="rounded-2xl border border-border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <Users className="h-5 w-5 text-blue-500" />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-[28px] font-bold leading-none text-foreground">{metrics.todayAppointments}</p>
                <p className="mt-1 text-[15px] font-medium text-foreground">Today's appointments</p>
                <p className="text-[13px] text-muted-foreground">{metrics.patientVolume} patients this month</p>
              </button>
            </div>
          </section>

          {/* Watch list */}
          <section>
            <h2 className="mb-4 text-[18px] font-semibold text-foreground">Watch list</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-destructive" />
                  <p className="text-[13px] font-medium text-muted-foreground">Outstanding</p>
                </div>
                <p className="mt-2 text-[28px] font-bold leading-none text-destructive">{fmt(metrics.outstandingBalance)}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Unpaid invoices</p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-blue-500" />
                  <p className="text-[13px] font-medium text-muted-foreground">Bed occupancy</p>
                </div>
                <p className="mt-2 text-[28px] font-bold leading-none text-foreground">{metrics.bedOccupancy}%</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{metrics.occupiedBeds}/{metrics.totalBeds} beds</p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-500" />
                  <p className="text-[13px] font-medium text-muted-foreground">Pending claims</p>
                </div>
                <p className="mt-2 text-[28px] font-bold leading-none text-amber-600 dark:text-amber-400">{metrics.pendingClaims}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Insurance claims</p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  <p className="text-[13px] font-medium text-muted-foreground">Staff</p>
                </div>
                <p className="mt-2 text-[28px] font-bold leading-none text-foreground">{metrics.staffCount}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Active employees</p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Grouped Actions */}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-[18px] font-semibold text-foreground">{group.title}</h2>
          <div className="rounded-2xl border border-border bg-white shadow-sm dark:bg-slate-900">
            <button
              onClick={() => handleNavigation(group.primary.route, group.primary.title)}
              className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-muted/60 active:bg-muted/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                {group.primary.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-foreground">{group.primary.title}</p>
                <p className="truncate text-[13px] text-muted-foreground">{group.primary.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          </div>
        </section>
      ))}
    </div>
  );
};

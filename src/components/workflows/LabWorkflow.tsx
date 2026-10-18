import React, { useEffect, useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner, InstitutionApprovalBanner } from "@/components/dashboard/StatusBanners";
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity, FileText, Search, Settings, BarChart3,
  Users, ClipboardList, TestTube, AlertTriangle, Wallet, Timer,
  ChevronRight
} from 'lucide-react';

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

export const LabWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [criticalResults, setCriticalResults] = useState<number | null>(null);
  const [samplesToday, setSamplesToday] = useState<number | null>(null);

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  useEffect(() => {
    const loadGlance = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { count: pending } = await supabase
          .from('lab_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingOrders(pending ?? 0);

        const { count: critical } = await supabase
          .from('lab_results')
          .select('id', { count: 'exact', head: true })
          .eq('is_abnormal', true)
          .is('verified_at', null);
        setCriticalResults(critical ?? 0);

        const { count: samples } = await supabase
          .from('sample_collections')
          .select('id', { count: 'exact', head: true })
          .gte('collected_at', startOfDay.toISOString());
        setSamplesToday(samples ?? 0);
      } catch {
        setPendingOrders(0);
        setCriticalResults(0);
        setSamplesToday(0);
      }
    };
    loadGlance();
  }, []);

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;

  const groups: ActionGroup[] = [
    {
      title: 'Lab Operations',
      primary: { title: 'Lab Dashboard', description: 'Pending tests, stats & workload overview', icon: icon(Activity), route: '/lab-management' },
      secondary: [
        { title: 'Test Requests', description: 'View and process lab test orders', icon: icon(ClipboardList), route: '/lab-management' },
        { title: 'Sample Tracking', description: 'Track sample collection and processing', icon: icon(TestTube), route: '/lab-management' },
        { title: 'Results & Reports', description: 'Enter results and generate reports', icon: icon(FileText), route: '/institution/patients' },
        { title: 'Patient Lookup', description: 'Search patient records and history', icon: icon(Search), route: '/search' },
      ],
    },
    {
      title: 'Quality & Safety',
      primary: { title: 'Critical Results', description: 'Abnormal values & reflex test triggers', icon: icon(AlertTriangle), route: '/lab-management' },
      secondary: [
        { title: 'Pending Sample Alerts', description: 'Samples pending >1hr flagged for action', icon: icon(Timer), route: '/lab-management' },
        { title: 'Quality Control', description: 'QC logs, calibration & NABL compliance', icon: icon(ClipboardList), route: '/lab-management' },
      ],
    },
    {
      title: 'Management',
      primary: { title: 'TAT Analytics', description: 'Turnaround time & performance metrics', icon: icon(BarChart3), route: '/lab-management' },
      secondary: [
        { title: 'Staff', description: 'Lab technician management', icon: icon(Users), route: '/lab-management' },
        ...(!isInstitutionAffiliated ? [{ title: 'Earnings & Wallet', description: 'Revenue & payment management', icon: icon(Wallet), route: '/wallet' }] : []),
        { title: 'Settings', description: 'Lab preferences and configuration', icon: icon(Settings), route: '/settings' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <InstitutionApprovalBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Activity className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Laboratory Management</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Laboratory Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => handleNavigation('/lab-management', 'Pending Test Orders')}
            className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <ClipboardList className="h-5 w-5 opacity-80" />
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{pendingOrders ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium">Pending test orders</p>
            <p className="text-[13px] opacity-80">Awaiting processing</p>
          </button>

          <button
            onClick={() => handleNavigation('/lab-management', 'Critical Results')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{criticalResults ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Critical results</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Abnormal, awaiting review</p>
          </button>

          <button
            onClick={() => handleNavigation('/lab-management', 'Samples Collected Today')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <TestTube className="h-5 w-5 text-emerald-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{samplesToday ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Samples collected today</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Specimens logged</p>
          </button>
        </div>
      </section>

      {/* Grouped Actions */}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">{group.title}</h2>
          <div className="rounded-2xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Primary action */}
            <button
              onClick={() => handleNavigation(group.primary.route, group.primary.title)}
              className="flex w-full items-center gap-4 border-b border-canvas-silk p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                {group.primary.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-slate-900 dark:text-white">{group.primary.title}</p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{group.primary.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            {/* Secondary actions */}
            <div className="divide-y divide-canvas-silk dark:divide-slate-800">
              {group.secondary.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.route, item.title)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

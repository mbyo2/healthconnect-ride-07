import React, { useEffect, useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { supabase } from '@/integrations/supabase/client';
import {
  Stethoscope, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Brain, Wallet, AlertTriangle,
  Shield, Bug, Pill, Video, Activity, Megaphone, Code2, Bell,
  ChevronRight, Clock, Mic
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

export const DoctorWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  useEffect(() => {
    const loadGlance = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        const { count: appts } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', user.id)
          .eq('date', today)
          .neq('status', 'cancelled');
        setTodayCount(appts ?? 0);

        const { count: pending } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', user.id)
          .eq('status', 'pending');
        setPendingCount(pending ?? 0);
      } catch {
        setTodayCount(0);
        setPendingCount(0);
      }
    };
    loadGlance();
  }, []);

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;

  const groups: ActionGroup[] = [
    {
      title: 'Clinical',
      primary: { title: 'Patient Queue', description: "Today's consultations & upcoming visits", icon: icon(ClipboardList), route: '/appointments' },
      secondary: [
        { title: 'My Schedule', description: 'Availability & calendar', icon: icon(Calendar), route: '/provider-calendar' },
        { title: 'Patient Records', description: 'Case sheets, vitals & history', icon: icon(Stethoscope), route: '/institution/patients' },
        { title: 'Write Prescriptions', description: 'Digital Rx with safety alerts', icon: icon(FileText), route: '/prescriptions' },
        { title: 'Video Consultations', description: 'Telemedicine & remote care', icon: icon(Video), route: '/video-consultations' },
      ],
    },
    {
      title: 'Communication',
      primary: { title: 'Patient Chat', description: 'Secure messaging with patients', icon: icon(MessageSquare), route: '/chat' },
      secondary: [
        { title: 'My Patients', description: 'Connected patient network', icon: icon(Users), route: '/connections' },
        { title: 'Appointment Reminders', description: 'Automated SMS & email', icon: icon(Bell), route: '/appointments' },
        { title: 'Patient Waitlist', description: 'Manage waitlisted patients', icon: icon(Clock), route: '/provider-dashboard' },
      ],
    },
    {
      title: 'Practice',
      primary: isInstitutionAffiliated
        ? { title: 'Health Analytics', description: 'Patient trends & outcomes', icon: icon(Activity), route: '/health-analytics' }
        : { title: 'Earnings & Wallet', description: 'Consultation revenue & payouts', icon: icon(Wallet), route: '/wallet' },
      secondary: [
        ...(!isInstitutionAffiliated ? [{ title: 'Health Analytics', description: 'Patient trends & outcomes', icon: icon(Activity), route: '/health-analytics' }] : []),
        { title: 'Professional Profile', description: 'Credentials & bio', icon: icon(Stethoscope), route: '/profile' },
        { title: 'Promote Practice', description: 'Sponsored listings & growth', icon: icon(Megaphone), route: '/provider-dashboard' },
        { title: 'Booking Widget', description: 'Embed booking on your site', icon: icon(Code2), route: '/provider-dashboard' },
      ],
    },
    {
      title: 'Clinical Tools',
      primary: { title: 'AI Clinical Assistant', description: 'AI-powered diagnostic support', icon: icon(Brain), route: '/ai-diagnostics' },
      secondary: [
        { title: 'Ambient Scribe', description: 'AI consultation notes — you review & approve', icon: icon(Mic), route: '/ambient-scribe' },
        { title: 'Allergy & Drug Safety', description: 'Interaction & allergy checks', icon: icon(Shield), route: '/prescriptions' },
        { title: 'Medication Management', description: 'Active meds & refills', icon: icon(Pill), route: '/medications' },
        { title: 'Infection Management', description: 'HAI tracking & stewardship', icon: icon(Bug), route: '/institution/patients' },
        { title: 'Emergency Protocols', description: 'Emergency response tools', icon: icon(AlertTriangle), route: '/emergency' },
        { title: 'Insurance Verification', description: 'Verify patient insurance', icon: icon(Shield), route: '/appointments' },
        { title: 'Settings', description: 'Practice preferences', icon: icon(Settings), route: '/settings' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Stethoscope className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Doctor Clinical Workspace</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Physician Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => handleNavigation('/appointments', 'Patient Queue')}
            className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5 opacity-80" />
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{todayCount ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium">Today's appointments</p>
            <p className="text-[13px] opacity-80">Open patient queue</p>
          </button>

          <button
            onClick={() => handleNavigation('/appointments', 'Pending Actions')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{pendingCount ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Pending actions</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Bookings awaiting confirmation</p>
          </button>

          <button
            onClick={() => handleNavigation(isInstitutionAffiliated ? '/health-analytics' : '/wallet', 'Earnings')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-emerald-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">
              {isInstitutionAffiliated ? <Activity className="h-7 w-7" /> : '···'}
            </p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">
              {isInstitutionAffiliated ? 'Practice analytics' : 'Earnings & wallet'}
            </p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              {isInstitutionAffiliated ? 'View trends & outcomes' : 'Revenue, payouts & history'}
            </p>
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

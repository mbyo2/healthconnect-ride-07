import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, Users, Calendar, FileText, Settings,
  BarChart3, Bed, Heart, Pill, DollarSign, ClipboardList,
  Thermometer, Activity, AlertTriangle, Bug, Shield, Bell, CreditCard,
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

export const NursingHomeWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { institutionId } = useInstitutionAffiliation();
  const [activeResidents, setActiveResidents] = useState<number | null>(null);
  const [occupiedBeds, setOccupiedBeds] = useState<number | null>(null);
  const [openIncidents, setOpenIncidents] = useState<number | null>(null);

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  useEffect(() => {
    const loadGlance = async () => {
      try {
        if (!institutionId) {
          setActiveResidents(0);
          setOccupiedBeds(0);
          setOpenIncidents(0);
          return;
        }

        const { count: residents } = await supabase
          .from('hospital_admissions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', institutionId)
          .eq('status', 'admitted');
        setActiveResidents(residents ?? 0);

        const { count: beds } = await supabase
          .from('hospital_beds')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', institutionId)
          .eq('status', 'occupied');
        setOccupiedBeds(beds ?? 0);

        const { count: incidents } = await supabase
          .from('infection_records')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', institutionId)
          .eq('status', 'open');
        setOpenIncidents(incidents ?? 0);
      } catch {
        setActiveResidents(0);
        setOccupiedBeds(0);
        setOpenIncidents(0);
      }
    };
    loadGlance();
  }, [institutionId]);

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;

  const groups: ActionGroup[] = [
    {
      title: 'Residents',
      primary: { title: 'Resident Registry', description: 'Admissions, discharges & resident profiles', icon: icon(Users), route: '/institution/patients' },
      secondary: [
        { title: 'Daily Care Plans', description: 'Individual care plans & daily activity logs', icon: icon(Heart), route: '/institution/patients' },
        { title: 'Vitals Monitoring', description: 'Track resident vitals, BP, sugar & weight', icon: icon(Thermometer), route: '/institution/patients' },
        { title: 'Medication Rounds', description: 'Medication schedules & administration tracking', icon: icon(Pill), route: '/medications' },
        { title: 'Allergy Alerts', description: 'Resident allergy checks before administration', icon: icon(Shield), route: '/institution/patients' },
        { title: 'Discharge Planning', description: 'Multi-department discharge checklists', icon: icon(ClipboardList), route: '/hospital-management' },
      ],
    },
    {
      title: 'Safety',
      primary: { title: 'Incident Reports', description: 'Falls, emergencies & incident documentation', icon: icon(AlertTriangle), route: '/emergency' },
      secondary: [
        { title: 'Infection Control', description: 'Infection tracking & preventive measures', icon: icon(Bug), route: '/hospital-management' },
        { title: 'Compliance', description: 'Regulatory docs & certifications', icon: icon(FileText), route: '/institution/settings' },
      ],
    },
    {
      title: 'Facility',
      primary: { title: 'Facility Dashboard', description: 'Occupancy, alerts & daily overview', icon: icon(Building2), route: '/hospital-management' },
      secondary: [
        { title: 'Bed & Room Management', description: 'Room assignments, availability & maintenance', icon: icon(Bed), route: '/hospital-management' },
        { title: 'Staff Roster & Shifts', description: 'Nurse & caregiver duty assignments', icon: icon(ClipboardList), route: '/institution/personnel' },
        { title: 'Appointments & Visits', description: 'Doctor visits, family visits & therapy sessions', icon: icon(Calendar), route: '/institution/appointments' },
        { title: 'Notifications', description: 'Facility-wide alerts & communications', icon: icon(Bell), route: '/hospital-management' },
      ],
    },
    {
      title: 'Business',
      primary: { title: 'Billing & Family Payments', description: 'Invoices, family billing & insurance', icon: icon(DollarSign), route: '/wallet' },
      secondary: [
        { title: 'Reports & Analytics', description: 'Occupancy, care quality & compliance reports', icon: icon(BarChart3), route: '/institution/reports' },
        { title: 'Insurance Verification', description: 'Verify resident insurance & coverage', icon: icon(CreditCard), route: '/hospital-management' },
        { title: 'Appointment Reminders', description: 'Automated family visit reminders', icon: icon(Bell), route: '/institution/appointments' },
        { title: 'Settings', description: 'Facility preferences & configuration', icon: icon(Settings), route: '/institution/settings' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Building2 className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Nursing Home Operations</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Facility Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => handleNavigation('/institution/patients', 'Active Residents')}
            className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 opacity-80" />
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{activeResidents ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium">Active residents</p>
            <p className="text-[13px] opacity-80">Currently admitted</p>
          </button>

          <button
            onClick={() => handleNavigation('/hospital-management', 'Occupied Beds')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Bed className="h-5 w-5 text-emerald-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{occupiedBeds ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Occupied beds</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Current occupancy</p>
          </button>

          <button
            onClick={() => handleNavigation('/emergency', 'Open Incidents')}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{openIncidents ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Open incidents</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Needs attention</p>
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

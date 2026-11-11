import React, { useState, useCallback, useMemo } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useAppointmentReminders } from '@/hooks/useAppointmentReminders';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { providerDisplayName } from '@/utils/providerDisplay';
import {
  Heart,
  Search,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Shield,
  Activity,
  Sparkles,
  Video,
  CreditCard,
  Users,
  Phone,
  Pill,
  Building2,
  Smile,
  HeartPulse,
  Wind,
  Baby,
  Brain,
  Bone,
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Stethoscope,
  ArrowRight,
  FileText,
  FlaskConical
} from 'lucide-react';
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonPatientHome } from "@/components/ui/skeleton-kit";
import { WalletCard } from "@/components/home/WalletCard";
import { ConnectedWorkflows } from "@/components/home/ConnectedWorkflows";
import { AvailableDoctorsRail } from "@/components/workflows/AvailableDoctorsRail";
import { HealthMetricCards } from "@/components/patient/HealthMetricCards";
import { DoctorCard } from "@/components/patient/DoctorCard";
import { HealthStreak } from "@/components/patient/HealthStreak";

// Predefined modern specialties with Lucide medical iconography.
const SPECIALTIES_DATA = [
  { id: 'dentistry', name: 'Dentistry', icon: Smile, sub: 'Teeth & Oral', route: '/search?specialty=Dentistry' },
  { id: 'cardiology', name: 'Cardiology', icon: HeartPulse, sub: 'Heart & Vascular', route: '/search?specialty=Cardiology' },
  { id: 'pulmonology', name: 'Pulmonology', icon: Wind, sub: 'Lungs & Breathing', route: '/search?specialty=Pulmonology' },
  { id: 'pediatrics', name: 'Pediatrics', icon: Baby, sub: 'Child Health', route: '/search?specialty=Pediatrics' },
  { id: 'neurology', name: 'Neurology', icon: Brain, sub: 'Brain & Nerves', route: '/search?specialty=Neurology' },
  { id: 'dermatology', name: 'Dermatology', icon: Sparkles, sub: 'Skin & Hair', route: '/search?specialty=Dermatology' },
  { id: 'orthopedics', name: 'Orthopedics', icon: Bone, sub: 'Bones & Joints', route: '/search?specialty=Orthopedics' },
  { id: 'general', name: 'General Care', icon: Stethoscope, sub: 'Family Medicine', route: '/search?specialty=General+Practice' },
];



export const PatientWorkflow = React.memo(() => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [careMode, setCareMode] = useState<'online' | 'offline'>('online');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('dentistry');

  // Client-side appointment reminders (24h before)
  useAppointmentReminders();

  // Real verified providers for the "Available Doctors" rail — never sample data.
  // Uses the public provider directory (verified clinicians only); querying
  // profiles directly leaked the viewer's own row into the rail.
  const { data: featuredProviders = [] } = useQuery({
    queryKey: ['patient-featured-providers', careMode],
    queryFn: async () => {
      let query = supabase
        .from('provider_directory')
        .select('id, first_name, last_name, specialty, avatar_url, consultation_fee_min, role, telemedicine_available')
        .eq('is_verified', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(10);
      // Care mode actually filters: online shows video-capable providers,
      // offline shows in-person providers. This is what the toggle is for.
      if (careMode === 'online') {
        query = query.eq('telemedicine_available', true);
      }
      const { data, error } = await query.limit(3);
      if (error) return [];
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    isProfileComplete,
    workflowSteps,
    loading,
    completionPercentage,
    nextStep,
    isWorkflowComplete
  } = useProfileCompletion();

  // Fetch upcoming appointment for dynamic dark banner.
  // NOTE: appointments.provider_id FKs point at auth.users (see migrations),
  // so a `profiles!appointments_provider_id_fkey` join hint is invalid and
  // patient sessions cannot read profiles rows directly. Provider details
  // come from the public provider_directory view instead.
  const { data: upcomingAppointment, isError: upcomingError, refetch: refetchUpcoming } = useQuery({
    queryKey: ['patient-next-appointment', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time, type, status, provider_id')
        .eq('patient_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      let provider: { first_name?: string | null; last_name?: string | null; specialty?: string | null; avatar_url?: string | null; role?: string | null } | null = null;
      if (data.provider_id) {
        const { data: dir, error: dirError } = await supabase
          .from('provider_directory')
          .select('first_name, last_name, specialty, avatar_url, role')
          .eq('id', data.provider_id)
          .maybeSingle();
        if (dirError) {
          console.error('Error fetching appointment provider:', dirError);
        } else {
          provider = dir;
        }
      }
      return { ...data, provider };
    },
    enabled: !!user,
  });

  // Fetch latest active prescription count.
  // comprehensive_prescriptions.status CHECK allows
  // ('pending','filled','partially_filled','cancelled','expired') — there is
  // no 'active' value, so "needs action" = pending + partially_filled.
  const { data: activePrescriptionsCount = 0 } = useQuery({
    queryKey: ['patient-prescriptions-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await (supabase as any)
        .from('comprehensive_prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
        .in('status', ['pending', 'partially_filled']);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
  });

  // Unread notification count drives the bell dot — it must reflect reality,
  // never render unconditionally.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['patient-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // "Recent activity" feed (PayPal anatomy, fidelity rebuild 2026-11-11):
  // the patient's latest appointments, lab results and prescriptions
  // merged into ONE hairline list. Every select mirrors the exact
  // tables/columns the dedicated patient components already use
  // (appointments + provider_directory for names; lab_tests status is
  // 'resulted' with the dated row in lab_results — see PatientLabResults;
  // comprehensive_prescriptions — see the count query above), so this
  // adds no new data surface, only a new presentation of the same rows.
  type ActivityItem = {
    key: string;
    kind: 'appointment' | 'lab' | 'prescription';
    title: string;
    date: Date;
    status: string;
    route: string;
  };
  const { data: recentActivity = [] } = useQuery<ActivityItem[]>({
    queryKey: ['patient-recent-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const [apptRes, labRes, rxRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, date, time, type, status, provider_id')
          .eq('patient_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('lab_tests')
          .select('id, test_name, status, created_at')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('comprehensive_prescriptions')
          .select('id, medication_name, status, created_at')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      const items: ActivityItem[] = [];

      const appts = (apptRes.data as any[]) || [];
      const providerIds = [...new Set(appts.map((a) => a.provider_id).filter(Boolean))];
      const providerNames = new Map<string, string>();
      if (providerIds.length > 0) {
        const { data: providers } = await supabase
          .from('provider_directory')
          .select('id, first_name, last_name')
          .in('id', providerIds);
        (providers as any[] | null)?.forEach((p) => {
          providerNames.set(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim());
        });
      }
      appts.forEach((a) => {
        const name = a.provider_id ? providerNames.get(a.provider_id) : undefined;
        items.push({
          key: `appt-${a.id}`,
          kind: 'appointment',
          title: name ? `Appointment with Dr. ${name}` : 'Appointment',
          date: new Date(a.date),
          status: a.status,
          route: '/appointments',
        });
      });

      ((labRes.data as any[]) || []).forEach((t) => {
        items.push({
          key: `lab-${t.id}`,
          kind: 'lab',
          title: t.test_name || 'Lab test',
          date: new Date(t.created_at),
          status: t.status === 'resulted' ? 'Result ready' : t.status,
          route: '/medical-records',
        });
      });

      ((rxRes.data as any[]) || []).forEach((rx) => {
        items.push({
          key: `rx-${rx.id}`,
          kind: 'prescription',
          title: rx.medication_name || 'Prescription',
          date: new Date(rx.created_at),
          status: rx.status,
          route: '/prescriptions',
        });
      });

      return items
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 6);
    },
    enabled: !!user?.id && isProfileComplete,
    staleTime: 60 * 1000,
  });

  // Time-of-day greeting (PayPal anatomy: bold, black, tight, left).
  const greetingHour = new Date().getHours();
  const greetingWord = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingName = profile?.first_name ? `, ${profile.first_name}` : '';

  // NOTE: the optional second arg is legacy (callers still pass a title);
  // navigation itself is the feedback — no toast spam.
  const handleNavigation = useCallback((route: string, _title?: string) => {
    try {
      navigate(route);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigate]);



  if (loading) {
    return (
      <div className="w-full pb-12" role="status" aria-label="Loading your health dashboard">
        <p className="sr-only">Loading your health dashboard...</p>
        {/* Structural twin of the loaded dashboard below (same shell
            column): greeting, care toggle, summary modules, triage
            card, metric cards, specialties, doctors. */}
        <SkeletonPatientHome />
      </div>
    );
  }

  // When profile is not complete, show guided onboarding steps in clean theme
  if (!isWorkflowComplete) {
    return (
      <div className="space-y-6 w-full">
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary-500" />
            <span>Patient Onboarding</span>
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Your Health Journey</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
            Complete your profile to book appointments, receive digital prescriptions, and join video consultations.
          </p>

          <div className="max-w-md space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-foreground">Setup Progress</span>
              <span className="text-primary-500 font-semibold">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2.5 rounded-full bg-muted" />
            {nextStep && (
              <p className="text-xs font-medium text-muted-foreground">
                Next: <span className="text-primary-500 font-semibold">{nextStep.title}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step) => {
            const isHighlighted = step.id === nextStep?.id;
            return (
              <div
                key={step.id}
                className={`p-5 rounded-2xl bg-card border transition-colors ${
                  isHighlighted
                    ? 'border-primary-500/60 ring-2 ring-primary-500/15'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-full ${
                    step.completed
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                      : isHighlighted
                      ? 'bg-primary-50 dark:bg-blue-950/60 text-primary-500'
                      : 'bg-muted text-slate-500'
                  }`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  {step.completed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Done</span>
                  ) : step.required ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Required</span>
                  ) : null}
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.description}</p>
                <button
                  onClick={() => handleNavigation(step.route, step.title)}
                  className={`w-full py-3 rounded-full font-semibold text-xs transition-colors ${
                    step.completed
                      ? 'bg-pill text-pill-foreground hover:bg-pill/80'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {step.id === 'profile' ? (isProfileComplete ? 'Edit Profile' : 'Complete Profile') : (step.completed ? 'View' : 'Start')}
                </button>
              </div>
            );
          })}
        </div>

        {/* Discovery stays available during onboarding — booking is never
            gated behind profile completeness. */}
        <AvailableDoctorsRail
          providers={featuredProviders}
          onViewAll={() => handleNavigation('/search', 'Find Doctors')}
          onViewProvider={(id) => navigate(`/provider/${id}`)}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN HEALTH DASHBOARD (MATCHING THE ATTACHED SCREEN 2 REFERENCE)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 sm:space-y-8 w-full pb-12">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* ─── Greeting (PayPal anatomy, fidelity rebuild 2026-11-11):
          bold black greeting, tight and left, date as the grey subline,
          notifications as a plain pale circle — no header card, no
          coloured band anywhere on this page. ─── */}
      <div className="flex items-start justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greetingWord}{greetingName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => handleNavigation('/notifications', 'Notifications')}
          className="h-11 w-11 shrink-0 rounded-full bg-muted border border-border hover:border-primary-500/40 text-foreground relative flex items-center justify-center transition-colors"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      </div>

      {/* ─── Online / Offline Care Mode Toggle Switch ─── */}
      <div className="flex justify-center">
        <div className="p-1 rounded-full bg-muted/80 border border-border flex w-full max-w-md">
          <button
            onClick={() => setCareMode('online')}
            aria-pressed={careMode === 'online'}
            className={`flex-1 py-3 rounded-full text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              careMode === 'online'
                ? 'bg-card text-primary-500 border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Online Consult</span>
          </button>
          <button
            onClick={() => setCareMode('offline')}
            aria-pressed={careMode === 'offline'}
            className={`flex-1 py-3 rounded-full text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              careMode === 'offline'
                ? 'bg-card text-primary-500 border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>In-Clinic / Offline</span>
          </button>
        </div>
      </div>

      {/* ─── Summary modules (PayPal anatomy): Next appointment |
          Wallet balance — two flat WHITE hairline cards side-by-side.
          The navy band is retired; the appointment module keeps the
          exact same data, states and tap behaviour. ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <div
          onClick={() => upcomingError ? refetchUpcoming() : handleNavigation('/appointments', 'Appointments')}
          className="group p-5 sm:p-6 rounded-2xl bg-card text-foreground border border-border flex flex-col justify-between gap-4 cursor-pointer h-full"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {upcomingError ? 'Appointments unavailable' : upcomingAppointment ? 'Next appointment' : 'Quick Consultation'}
              </span>
              <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
            </div>
            <div className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              {upcomingError ? (
                <span>Couldn&apos;t load your appointments — tap to retry</span>
              ) : upcomingAppointment ? (
                <>
                  <span>
                    {(() => {
                      const d = new Date(upcomingAppointment.date);
                      return isNaN(d.getTime()) ? 'Date to be confirmed' : format(d, 'MMMM d');
                    })()}, {upcomingAppointment.time || 'Time TBC'}
                  </span>
                  {upcomingAppointment.provider && (
                    <span className="text-sm font-medium text-muted-foreground">
                      • {providerDisplayName({ first_name: upcomingAppointment.provider.first_name, last_name: upcomingAppointment.provider.last_name, role: (upcomingAppointment.provider as any)?.role })}
                    </span>
                  )}
                </>
              ) : (
                <span>No upcoming appointments — book your next visit</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {upcomingAppointment
                ? `Mode: ${upcomingAppointment.type === 'video_consultation' ? 'Video Consult' : 'Clinic Visit'} — Tap to view details`
                : 'Book an appointment with a verified doctor in under 2 minutes'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground group-hover:bg-primary/90 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors">
              <span>{upcomingAppointment ? 'View Appointment' : 'Book Now'}</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <WalletCard />
      </div>

      {/* ─── AI Symptom Triage — the page's primary action, now a white
          hairline card with a blue pill (the solid blue band is
          retired). Same route, same copy, same privacy line. ─── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border flex items-center gap-4">
        <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Not feeling well?</h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Check your symptoms in about a minute — we&apos;ll point you to the right care and help you book. Nothing you enter is saved.
          </p>
        </div>
        <Button onClick={() => navigate('/triage')} className="shrink-0 font-semibold">
          Start check
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Digital Prescription Alert Card (if active) ─── */}
      {activePrescriptionsCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card text-foreground border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-500/15 text-primary-500 flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-medium block">Medical Records</span>
              <span className="text-sm sm:text-base font-semibold text-foreground">
                You have {activePrescriptionsCount} active {activePrescriptionsCount === 1 ? 'prescription' : 'prescriptions'}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleNavigation('/prescriptions', 'Prescriptions')}
            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors"
          >
            View
          </button>
        </div>
      )}

      {/* ─── Your health: latest recorded vitals as glanceable cards ─── */}
      <HealthMetricCards />

      {/* ─── Specialties Squircle Grid ─── */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Specialties</h2>
            <p className="text-xs text-muted-foreground">Browse verified medical specialists</p>
          </div>
          <button
            onClick={() => handleNavigation(`/search?mode=${careMode}`, 'All Specialties')}
            className="text-xs font-semibold text-primary-500 hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {SPECIALTIES_DATA.map((spec) => {
            const isSelected = selectedSpecialty === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedSpecialty(spec.id);
                  handleNavigation(spec.route, spec.name);
                }}
                className={`p-4 rounded-2xl bg-card border transition-colors text-center flex flex-col items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'border-primary-500/50 bg-primary-50/40 dark:bg-blue-950/40 ring-2 ring-primary-500/20'
                    : 'border-border hover:border-primary-500/40'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <spec.icon className="h-6 w-6 text-primary-500" aria-hidden />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground block group-hover:text-primary-500 transition-colors">
                    {spec.name}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    {spec.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Reference-style Doctor Cards ─── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Available Doctors</h2>
          <button
            onClick={() => handleNavigation(`/search?mode=${careMode}`, 'Find Doctors')}
            className="text-xs font-semibold text-primary-500 hover:text-primary-600"
          >
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {featuredProviders.slice(0, 3).map((provider: any) => (
            <DoctorCard
              key={provider.id}
              provider={provider}
              onSelect={() => navigate(`/provider/${provider.id}`)}
            />
          ))}
          {featuredProviders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6 bg-card rounded-2xl border border-border">
              No doctors available right now. Try changing the care mode above.
            </p>
          )}
        </div>
      </div>

      {/* ─── Health Streak (Duolingo-style gamification) ─── */}
      <HealthStreak
        streakDays={3}
        milestones={[
          { id: "physical", label: "Annual physical", completed: true },
          { id: "dental", label: "Dental checkup", completed: false },
          { id: "eye", label: "Eye exam", completed: true },
          { id: "vitals", label: "Vitals updated", completed: false },
        ]}
      />

      {/* ─── Quick actions (PayPal anatomy): labelled PALE CIRCLE icon
          buttons in a row — the boxed tile grid is retired. Same four
          routes as before. ─── */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3.5 px-1 text-foreground tracking-tight">Quick Access</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-4 sm:gap-x-8 px-1">
          <button
            type="button"
            onClick={() => handleNavigation('/emergency', 'Emergency')}
            className="flex flex-col items-center gap-2 w-[4.5rem] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
          >
            <span className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-950/60 transition-colors">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">Emergency Help</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/marketplace', 'Buy Medicine')}
            className="flex flex-col items-center gap-2 w-[4.5rem] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
          >
            <span className="h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-accent transition-colors">
              <Pill className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">Buy Medicine</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/search', 'Find Doctor')}
            className="flex flex-col items-center gap-2 w-[4.5rem] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
          >
            <span className="h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-accent transition-colors">
              <Users className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">Find Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/healthcare-institutions', 'Hospitals')}
            className="flex flex-col items-center gap-2 w-[4.5rem] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
          >
            <span className="h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-accent transition-colors">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">Hospitals &amp; Labs</span>
          </button>
        </div>
      </div>

      {/* ─── Recent activity (PayPal anatomy): ONE hairline list —
          round pale icon, bold title, grey "date · type" subline,
          right-aligned status pill; rows navigate. Empty state speaks
          the same list language. ─── */}
      <div>
        <div className="flex items-center justify-between mb-1 px-1">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Recent activity</h2>
          <button
            onClick={() => handleNavigation('/appointments', 'Appointments')}
            className="text-xs font-semibold text-primary-500 hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.length === 0 ? (
            <div className="py-8 text-center px-1">
              <p className="text-sm font-medium text-foreground">No recent activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your appointments, lab results and prescriptions will appear here.
              </p>
            </div>
          ) : (
            recentActivity.map((item) => {
              const Icon = item.kind === 'appointment' ? Calendar : item.kind === 'lab' ? FlaskConical : Pill;
              const kindLabel = item.kind === 'appointment' ? 'Appointment' : item.kind === 'lab' ? 'Lab result' : 'Prescription';
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigation(item.route)}
                  className="w-full flex items-center gap-3 py-3.5 px-1 text-left rounded-lg hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground truncate">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {format(item.date, 'MMM d, yyyy')} · {kindLabel}
                    </span>
                  </span>
                  <StatusBadge status={item.status} className="shrink-0 capitalize" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Insurance, Cost Estimator & Waitlists — hairline list
          card (PayPal anatomy): divide-y rows, pale circle icon,
          label + sub, trailing chevron. Same four routes. ─── */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3.5 px-1 text-foreground tracking-tight">Insurance & Scheduling</h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          <button
            type="button"
            onClick={() => handleNavigation('/insurance-cards', 'Insurance Cards')}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            <span className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">Insurance Card</span>
              <span className="block text-xs text-muted-foreground">Upload &amp; verify</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/cost-estimator', 'Cost Estimator')}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            <span className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">Cost Estimator</span>
              <span className="block text-xs text-muted-foreground">Clear pricing</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/waitlist', 'Waitlist')}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            <span className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">Early Slots</span>
              <span className="block text-xs text-muted-foreground">Priority waitlist</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/appointment-reminders', 'Reminders')}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            <span className="h-10 w-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">Reminders</span>
              <span className="block text-xs text-muted-foreground">Calendar alerts</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>

      {/* ─── Connected Workflows (the wallet summary now lives in the
          summary modules at the top of the page) ─── */}
      <ConnectedWorkflows />

      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-3">
        <h3 className="font-semibold text-base text-foreground">Health Support & Emergency Services</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Need immediate triage, symptom checks, or emergency ambulance dispatch? Our clinical emergency team is available 24/7.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => handleNavigation('/emergency', 'Emergency')}
            className="bg-rose-600 hover:bg-rose-700 font-semibold text-xs"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call Emergency (116)</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleNavigation('/symptoms', 'Symptoms Tracker')}
            className="font-semibold text-xs"
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Check Symptoms</span>
          </Button>
        </div>
      </div>
    </div>
  );
});

PatientWorkflow.displayName = 'PatientWorkflow';

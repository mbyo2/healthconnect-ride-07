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
  FileText
} from 'lucide-react';
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
  const { user } = useAuth();
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
            column): triage banner, header bar, care toggle, navy
            appointment banner, metric cards, specialties, doctors. */}
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
                className={`p-5 rounded-lg bg-card border shadow-xs transition-colors ${
                  isHighlighted
                    ? 'border-primary-500/60 ring-2 ring-primary-500/15'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${
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
                  className={`w-full py-3 rounded-md font-semibold text-xs transition-colors ${
                    step.completed
                      ? 'bg-muted text-foreground hover:bg-muted/70'
                      : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
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

      {/* ─── AI Symptom Triage Entry — the page's one primary action,
          a solid PayPal-blue band ─── */}
      <button
        type="button"
        onClick={() => navigate('/triage')}
        className="w-full text-left bg-primary-500 hover:bg-primary-600 text-white p-4 sm:p-5 rounded-lg transition-colors flex items-center gap-4"
      >
        <div className="p-2.5 rounded-lg bg-white/15 shrink-0">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-base sm:text-lg font-semibold block">Not feeling well?</span>
          <span className="text-xs sm:text-sm text-white/85 font-medium block">
            Check your symptoms in about a minute — we&apos;ll point you to the right care and help you book. Nothing you enter is saved.
          </span>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0" />
      </button>

      {/* ─── Top Header Bar (Date & Notification Bell) ─── */}
      <div className="flex items-center justify-between bg-card p-4 sm:p-5 rounded-lg border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary-50 dark:bg-blue-950/60 border border-primary-500/20 text-primary-500">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground block">Today</span>
            <span className="text-base sm:text-lg font-semibold text-foreground">
              {format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigation('/notifications', 'Notifications')}
            className="p-3 rounded-lg bg-muted border border-border hover:border-primary-500/40 text-foreground relative transition-colors"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Online / Offline Care Mode Toggle Switch ─── */}
      <div className="flex justify-center">
        <div className="p-1 rounded-full bg-muted/80 border border-border flex w-full max-w-md">
          <button
            onClick={() => setCareMode('online')}
            aria-pressed={careMode === 'online'}
            className={`flex-1 py-3 rounded-full text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              careMode === 'online'
                ? 'bg-card text-primary-500 shadow-sm border border-border'
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
                ? 'bg-card text-primary-500 shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>In-Clinic / Offline</span>
          </button>
        </div>
      </div>

      {/* ─── Next Appointment — the page's one navy summary band ─── */}
      <div
        onClick={() => upcomingError ? refetchUpcoming() : handleNavigation('/appointments', 'Appointments')}
        className="group p-5 sm:p-6 rounded-lg bg-navy text-white border border-navy flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/70">
              {upcomingError ? 'Appointments unavailable' : upcomingAppointment ? 'Your next appointment' : 'Quick Consultation'}
            </span>
            <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
          </div>
          <div className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
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
                  <span className="text-sm font-medium text-white/85">
                    • {providerDisplayName({ first_name: upcomingAppointment.provider.first_name, last_name: upcomingAppointment.provider.last_name, role: (upcomingAppointment.provider as any)?.role })}
                  </span>
                )}
              </>
            ) : (
              <span>No upcoming appointments — book your next visit</span>
            )}
          </div>
          <p className="text-xs text-white/70">
            {upcomingAppointment
              ? `Mode: ${upcomingAppointment.type === 'video_consultation' ? 'Video Consult' : 'Clinic Visit'} — Tap to view details`
              : 'Book an appointment with a verified doctor in under 2 minutes'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-5 py-2.5 rounded-full bg-card text-foreground hover:bg-primary-50 hover:text-primary-600 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors">
            <span>{upcomingAppointment ? 'View Appointment' : 'Book Now'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Digital Prescription Alert Card (if active) ─── */}
      {activePrescriptionsCount > 0 && (
        <div className="p-4 sm:p-5 rounded-lg bg-card text-foreground border border-border flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary-50 dark:bg-primary-500/15 text-primary-500">
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
            className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs transition-colors"
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
                className={`p-4 rounded-lg bg-card border transition-colors text-center flex flex-col items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'border-primary-500/50 bg-primary-50/40 dark:bg-blue-950/40 ring-2 ring-primary-500/20'
                    : 'border-border hover:border-primary-500/40'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center">
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
            <p className="text-sm text-muted-foreground text-center py-6 bg-card rounded-lg border border-border">
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

      {/* ─── Quick Access Services Hub (Clean Blue, Black & White) ─── */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3.5 px-1 text-foreground tracking-tight">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => handleNavigation('/emergency', 'Emergency')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-lg w-fit mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Emergency Help</h3>
            <p className="text-xs text-muted-foreground">24/7 hotline & dispatch</p>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/marketplace', 'Buy Medicine')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2.5 bg-muted text-foreground rounded-lg w-fit mb-2">
              <Pill className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Buy Medicine</h3>
            <p className="text-xs text-muted-foreground">Online pharmacy & refill</p>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/search', 'Find Doctor')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2.5 bg-muted text-foreground rounded-lg w-fit mb-2">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Find Doctor</h3>
            <p className="text-xs text-muted-foreground">Book clinic & video visits</p>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/healthcare-institutions', 'Hospitals')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2.5 bg-muted text-foreground rounded-lg w-fit mb-2">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Hospitals & Labs</h3>
            <p className="text-xs text-muted-foreground">Find nearby facilities</p>
          </button>
        </div>
      </div>

      {/* ─── Insurance, Cost Estimator & Waitlists ─── */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3.5 px-1 text-foreground tracking-tight">Insurance & Scheduling</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => handleNavigation('/insurance-cards', 'Insurance Cards')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2 bg-muted text-foreground rounded-md w-fit mb-2">
              <CreditCard className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Insurance Card</h4>
            <p className="text-xs text-muted-foreground">Upload & verify</p>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/cost-estimator', 'Cost Estimator')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2 bg-muted text-foreground rounded-md w-fit mb-2">
              <Shield className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Cost Estimator</h4>
            <p className="text-xs text-muted-foreground">Clear pricing</p>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/waitlist', 'Waitlist')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2 bg-muted text-foreground rounded-md w-fit mb-2">
              <Calendar className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Early Slots</h4>
            <p className="text-xs text-muted-foreground">Priority waitlist</p>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/appointment-reminders', 'Reminders')}
            className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary-500/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="p-2 bg-muted text-foreground rounded-md w-fit mb-2">
              <Activity className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Reminders</h4>
            <p className="text-xs text-muted-foreground">Calendar alerts</p>
          </button>
        </div>
      </div>

      {/* ─── Connected Workflows & Patient Wallet ─── */}
      <ConnectedWorkflows />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <div className="p-5 sm:p-6 rounded-lg bg-card border border-border shadow-xs space-y-3">
            <h3 className="font-semibold text-base text-foreground">Health Support & Emergency Services</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need immediate triage, symptom checks, or emergency ambulance dispatch? Our clinical emergency team is available 24/7.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => handleNavigation('/emergency', 'Emergency')}
                className="rounded-full bg-rose-600 hover:bg-rose-700 font-semibold text-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call Emergency (116)</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleNavigation('/symptoms', 'Symptoms Tracker')}
                className="rounded-full bg-primary-50 text-primary-500 hover:bg-primary-100 font-semibold text-xs"
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Check Symptoms</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <WalletCard />
        </div>
      </div>
    </div>
  );
});

PatientWorkflow.displayName = 'PatientWorkflow';

import React, { useState, useCallback, useMemo } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
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
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Star,
  Stethoscope,
  ArrowRight,
  FileText
} from 'lucide-react';
import { WalletCard } from "@/components/home/WalletCard";
import { ConnectedWorkflows } from "@/components/home/ConnectedWorkflows";

// Predefined modern specialties with clean medical iconography matching the reference
const SPECIALTIES_DATA = [
  { id: 'dentistry', name: 'Dentistry', icon: '🦷', sub: 'Teeth & Oral', route: '/search?specialty=Dentistry' },
  { id: 'cardiology', name: 'Cardiology', icon: '🫀', sub: 'Heart & Vascular', route: '/search?specialty=Cardiology' },
  { id: 'pulmonology', name: 'Pulmonology', icon: '🫁', sub: 'Lungs & Breathing', route: '/search?specialty=Pulmonology' },
  { id: 'pediatrics', name: 'Pediatrics', icon: '👶', sub: 'Child Health', route: '/search?specialty=Pediatrics' },
  { id: 'neurology', name: 'Neurology', icon: '🧠', sub: 'Brain & Nerves', route: '/search?specialty=Neurology' },
  { id: 'dermatology', name: 'Dermatology', icon: '🧴', sub: 'Skin & Hair', route: '/search?specialty=Dermatology' },
  { id: 'orthopedics', name: 'Orthopedics', icon: '🦴', sub: 'Bones & Joints', route: '/search?specialty=Orthopedics' },
  { id: 'general', name: 'General Care', icon: '🩺', sub: 'Family Medicine', route: '/search?specialty=General+Practice' },
];

// Sample featured doctors with interactive time slots
const FEATURED_DOCTORS = [
  {
    id: 'doc-1',
    name: 'Dr. Aysha Hayes',
    specialty: 'Dentist',
    experience: '12 years experience • Online',
    rating: 4.8,
    reviews: 142,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=240&q=80',
    timeSlots: ['8:00 a.m.', '9:00 a.m.', '10:00 a.m.', '2:30 p.m.'],
    price: 'K350',
    mode: 'online'
  },
  {
    id: 'doc-2',
    name: 'Dr. Hari Monroe',
    specialty: 'Cardiologist',
    experience: '15 years experience • Lusaka Hospital',
    rating: 4.9,
    reviews: 210,
    avatar: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=240&q=80',
    timeSlots: ['9:30 a.m.', '11:00 a.m.', '3:00 p.m.', '4:15 p.m.'],
    price: 'K450',
    mode: 'both'
  },
  {
    id: 'doc-3',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Pediatrician',
    experience: '9 years experience • Online',
    rating: 4.9,
    reviews: 188,
    avatar: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&w=240&q=80',
    timeSlots: ['10:00 a.m.', '11:30 a.m.', '1:00 p.m.', '3:30 p.m.'],
    price: 'K300',
    mode: 'online'
  }
];

export const PatientWorkflow = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess } = useSuccessFeedback();
  const [careMode, setCareMode] = useState<'online' | 'offline'>('online');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('dentistry');
  const [selectedDoctorSlots, setSelectedDoctorSlots] = useState<Record<string, string>>({
    'doc-1': '9:00 a.m.',
    'doc-2': '9:30 a.m.',
    'doc-3': '10:00 a.m.'
  });

  const {
    isProfileComplete,
    workflowSteps,
    loading,
    completionPercentage,
    nextStep,
    isWorkflowComplete
  } = useProfileCompletion();

  // Fetch upcoming appointment for dynamic dark banner
  const { data: upcomingAppointment } = useQuery({
    queryKey: ['patient-next-appointment', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, date, time, type, status,
          provider:profiles!appointments_provider_id_fkey(first_name, last_name, specialty, avatar_url)
        `)
        .eq('patient_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching next appointment:', error);
      }
      return data || null;
    },
    enabled: !!user,
  });

  // Fetch latest active prescription count
  const { data: activePrescriptionsCount = 0 } = useQuery({
    queryKey: ['patient-prescriptions-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await (supabase as any)
        .from('comprehensive_prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
        .eq('status', 'active');

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
  });

  const handleNavigation = useCallback((route: string, title?: string) => {
    try {
      navigate(route);
      if (title) {
        showSuccess({ message: `Opening ${title}...` });
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigate, showSuccess]);

  const handleSlotSelect = (docId: string, slot: string) => {
    setSelectedDoctorSlots(prev => ({ ...prev, [docId]: slot }));
  };

  const handleBookSlot = (doctor: typeof FEATURED_DOCTORS[0]) => {
    const slot = selectedDoctorSlots[doctor.id] || doctor.timeSlots[0];
    navigate(`/search?doctor=${encodeURIComponent(doctor.name)}&time=${encodeURIComponent(slot)}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12 text-center">
        <div className="h-10 w-10 border-4 border-[#0073ea] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Loading your health dashboard...</h2>
      </div>
    );
  }

  // When profile is not complete, show guided onboarding steps in clean theme
  if (!isWorkflowComplete) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-[#0073ea] bg-[#e5f0ff] dark:bg-blue-950/50 border border-[#0073ea]/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Patient Onboarding</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Your Health Journey</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Complete your profile setup to unlock instant booking, digital prescriptions, and virtual consultations.
          </p>

          <div className="max-w-md mx-auto space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Setup Progress</span>
              <span className="text-[#0073ea]">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800" />
            {nextStep && (
              <p className="text-xs font-semibold text-slate-500">
                Next: <span className="text-[#0073ea] font-bold">{nextStep.title}</span>
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
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
                  step.completed
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20'
                    : isHighlighted
                    ? 'border-[#0073ea]/60 shadow-md ring-2 ring-[#0073ea]/15'
                    : 'border-[#e6e9ef] dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-2xl ${
                    step.completed
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                      : isHighlighted
                      ? 'bg-[#e5f0ff] dark:bg-blue-950/60 text-[#0073ea]'
                      : 'bg-[#f5f7fa] dark:bg-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  {step.completed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Done</span>
                  ) : step.required ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">Required</span>
                  ) : null}
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-1">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{step.description}</p>
                <button
                  onClick={() => handleNavigation(step.route, step.title)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    step.completed
                      ? 'bg-[#f5f7fa] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      : 'bg-[#0073ea] text-white hover:bg-[#0060c7] shadow-sm'
                  }`}
                >
                  {step.id === 'profile' ? (isProfileComplete ? 'Edit Profile' : 'Complete Profile') : (step.completed ? 'View' : 'Start')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN HEALTH DASHBOARD (MATCHING THE ATTACHED SCREEN 2 REFERENCE)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* ─── Top Header Bar (Date & Notification Bell) ─── */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#e5f0ff] dark:bg-blue-950/60 border border-[#0073ea]/20 text-[#0073ea]">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today</span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              {format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigation('/notifications', 'Notifications')}
            className="p-2.5 rounded-2xl bg-[#f5f7fa] dark:bg-slate-800 border border-[#e6e9ef] dark:border-slate-700 hover:border-[#0073ea]/40 text-slate-700 dark:text-slate-300 relative transition-all active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>
        </div>
      </div>

      {/* ─── Online / Offline Care Mode Toggle Switch ─── */}
      <div className="flex justify-center">
        <div className="p-1 rounded-2xl bg-[#f0f2f7] dark:bg-slate-800/80 border border-[#e6e9ef] dark:border-slate-700 flex w-full max-w-md shadow-xs">
          <button
            onClick={() => setCareMode('online')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              careMode === 'online'
                ? 'bg-white dark:bg-slate-900 text-[#0073ea] shadow-sm border border-[#e6e9ef] dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Online Consult</span>
          </button>
          <button
            onClick={() => setCareMode('offline')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              careMode === 'offline'
                ? 'bg-white dark:bg-slate-900 text-[#0073ea] shadow-sm border border-[#e6e9ef] dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>In-Clinic / Offline</span>
          </button>
        </div>
      </div>

      {/* ─── High-Contrast Dark Next Appointment Banner (Black/Navy) ─── */}
      <div
        onClick={() => handleNavigation('/appointments', 'Appointments')}
        className="group p-5 sm:p-6 rounded-3xl bg-[#0f172a] text-white shadow-xl shadow-slate-900/10 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900 transition-all active:scale-[0.99]"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              {upcomingAppointment ? 'Your next appointment' : 'Quick Consultation'}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            {upcomingAppointment ? (
              <>
                <span>
                  {format(new Date(upcomingAppointment.date), 'MMMM d')}, {upcomingAppointment.time}
                </span>
                {upcomingAppointment.provider && (
                  <span className="text-sm font-bold text-slate-300">
                    • Dr. {upcomingAppointment.provider.first_name} {upcomingAppointment.provider.last_name}
                  </span>
                )}
              </>
            ) : (
              <span>October 22, 10:00 a.m. • Available slots ready</span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {upcomingAppointment
              ? `Mode: ${upcomingAppointment.type === 'video_consultation' ? 'Video Consult' : 'Clinic Visit'} — Tap to view details`
              : 'Book an appointment with a verified doctor in under 2 minutes'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-5 py-2.5 rounded-full bg-white text-[#0f172a] hover:bg-[#e5f0ff] hover:text-[#0073ea] font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all">
            <span>{upcomingAppointment ? 'View Appointment' : 'Book Now'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Digital Prescription Alert Card (if active) ─── */}
      {activePrescriptionsCount > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0f172a] text-white border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#0073ea]/20 text-[#38bdf8]">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold block">Medical Records</span>
              <span className="text-sm sm:text-base font-black text-white">
                You have {activePrescriptionsCount} active {activePrescriptionsCount === 1 ? 'prescription' : 'prescriptions'}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleNavigation('/prescriptions', 'Prescriptions')}
            className="px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060c7] text-white font-bold text-xs transition-all shadow-sm"
          >
            View
          </button>
        </div>
      )}

      {/* ─── Specialties Squircle Grid ─── */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Specialties</h2>
            <p className="text-xs text-slate-400 font-medium">Browse verified medical specialists</p>
          </div>
          <button
            onClick={() => handleNavigation('/search', 'All Specialties')}
            className="text-xs font-black text-[#0073ea] hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {SPECIALTIES_DATA.map((spec) => {
            const isSelected = selectedSpecialty === spec.id;
            return (
              <div
                key={spec.id}
                onClick={() => {
                  setSelectedSpecialty(spec.id);
                  handleNavigation(spec.route, spec.name);
                }}
                className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 group hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${
                  isSelected
                    ? 'border-[#0073ea]/50 bg-[#e5f0ff]/40 dark:bg-blue-950/40 ring-2 ring-[#0073ea]/20'
                    : 'border-[#e6e9ef] dark:border-slate-800 hover:border-[#0073ea]/40'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#f5f7fa] dark:bg-slate-800 border border-[#e6e9ef] dark:border-slate-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {spec.icon}
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 block group-hover:text-[#0073ea] transition-colors">
                    {spec.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {spec.sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Featured Doctors & Selectable Time Slots ─── */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Available Doctors</h2>
            <p className="text-xs text-slate-400 font-medium">Select a slot for instant consultation</p>
          </div>
          <button
            onClick={() => handleNavigation('/search', 'Find Doctors')}
            className="text-xs font-black text-[#0073ea] hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_DOCTORS.map((doc) => {
            const activeSlot = selectedDoctorSlots[doc.id] || doc.timeSlots[0];

            return (
              <div
                key={doc.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Doctor Info */}
                <div className="flex items-start gap-3.5">
                  <div className="relative">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="h-13 w-13 rounded-2xl object-cover ring-2 ring-[#0073ea]/30"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00a86b] ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{doc.name}</h3>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-[11px] font-black">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{doc.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#0073ea] font-extrabold">{doc.specialty}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{doc.experience}</p>
                  </div>
                </div>

                {/* Selectable Time Slots (Pills) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Time Slot:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {doc.timeSlots.map((slot) => {
                      const isActive = activeSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => handleSlotSelect(doc.id, slot)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-black text-center transition-all ${
                            isActive
                              ? 'bg-[#0f172a] text-white shadow-xs border border-[#0f172a]'
                              : 'bg-[#f8fafc] dark:bg-slate-800 border border-[#e6e9ef] dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#0073ea]/40'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Booking Button */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#e6e9ef] dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Consultation Fee</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">{doc.price}</span>
                  </div>
                  <button
                    onClick={() => handleBookSlot(doc)}
                    className="px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060c7] text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95"
                  >
                    <span>Book {activeSlot}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Quick Access Services Hub (Clean Blue, Black & White) ─── */}
      <div>
        <h2 className="text-lg sm:text-xl font-black mb-3.5 px-1 text-slate-900 dark:text-slate-100 tracking-tight">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div
            onClick={() => handleNavigation('/emergency', 'Emergency')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer active:scale-95 group"
          >
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl w-fit mb-2 group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">Emergency Help</h3>
            <p className="text-[11px] text-slate-400 font-medium">24/7 hotline & dispatch</p>
          </div>

          <div
            onClick={() => handleNavigation('/marketplace', 'Buy Medicine')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer active:scale-95 group"
          >
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl w-fit mb-2 group-hover:scale-105 transition-transform">
              <Pill className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">Buy Medicine</h3>
            <p className="text-[11px] text-slate-400 font-medium">Online pharmacy & refill</p>
          </div>

          <div
            onClick={() => handleNavigation('/search', 'Find Doctor')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0073ea]/40 transition-all cursor-pointer active:scale-95 group"
          >
            <div className="p-2.5 bg-[#e5f0ff] dark:bg-blue-950/60 text-[#0073ea] rounded-2xl w-fit mb-2 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">Find Doctor</h3>
            <p className="text-[11px] text-slate-400 font-medium">Book clinic & video visits</p>
          </div>

          <div
            onClick={() => handleNavigation('/healthcare-institutions', 'Hospitals')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer active:scale-95 group"
          >
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-2xl w-fit mb-2 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">Hospitals & Labs</h3>
            <p className="text-[11px] text-slate-400 font-medium">Find nearby facilities</p>
          </div>
        </div>
      </div>

      {/* ─── Insurance, Cost Estimator & Waitlists ─── */}
      <div>
        <h2 className="text-lg sm:text-xl font-black mb-3.5 px-1 text-slate-900 dark:text-slate-100 tracking-tight">Insurance & Scheduling</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div
            onClick={() => handleNavigation('/insurance-cards', 'Insurance Cards')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl w-fit mb-2">
              <CreditCard className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">Insurance Card</h4>
            <p className="text-[10px] text-slate-400">Upload & verify</p>
          </div>

          <div
            onClick={() => handleNavigation('/cost-estimator', 'Cost Estimator')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <div className="p-2 bg-orange-50 dark:bg-orange-950/40 text-orange-600 rounded-xl w-fit mb-2">
              <Shield className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">Cost Estimator</h4>
            <p className="text-[10px] text-slate-400">Clear pricing</p>
          </div>

          <div
            onClick={() => handleNavigation('/waitlist', 'Waitlist')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl w-fit mb-2">
              <Calendar className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">Early Slots</h4>
            <p className="text-[10px] text-slate-400">Priority waitlist</p>
          </div>

          <div
            onClick={() => handleNavigation('/appointment-reminders', 'Reminders')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <div className="p-2 bg-pink-50 dark:bg-pink-950/40 text-pink-600 rounded-xl w-fit mb-2">
              <Activity className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">Reminders</h4>
            <p className="text-[10px] text-slate-400">Calendar alerts</p>
          </div>
        </div>
      </div>

      {/* ─── Connected Workflows & Patient Wallet ─── */}
      <ConnectedWorkflows />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100">Health Support & Emergency Services</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Need immediate triage, symptom checks, or emergency ambulance dispatch? Our clinical emergency team is available 24/7.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleNavigation('/emergency', 'Emergency')}
                className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call Emergency (992)</span>
              </button>
              <button
                onClick={() => handleNavigation('/symptoms', 'Symptoms Tracker')}
                className="px-5 py-2.5 rounded-full bg-[#e5f0ff] text-[#0073ea] hover:bg-[#d0e4ff] font-extrabold text-xs flex items-center gap-1.5 transition-all"
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Check Symptoms</span>
              </button>
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

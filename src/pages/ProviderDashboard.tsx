import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleManager } from "@/components/provider/ScheduleManager";
import { DigitalSignature } from "@/components/provider/DigitalSignature";
import { PatientRecords } from "@/components/provider/PatientRecords";
import { ProviderAnalyticsDashboard } from "@/components/provider/ProviderAnalyticsDashboard";
import { WaitlistManager } from "@/components/booking/WaitlistManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Sparkles, ArrowRight, BarChart3,
  Calendar, Users, Clock, FileText, Video, Stethoscope,
  ClipboardList, Wallet, MessageSquare, TrendingUp, Heart, Pill,
  ExternalLink, GraduationCap, Award, DollarSign, Shield, Home,
  MapPin, Building2, Languages, Save, Plus, X, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { toast } from "sonner";

// ── constants (match Profile.tsx) ────────────────────────────────────────────

const SUBSPECIALTY_OPTIONS = [
  "Cardiology","Neurology","Oncology","Pediatrics","Orthopedics",
  "Dermatology","Psychiatry","Gastroenterology","Endocrinology",
  "Nephrology","Pulmonology","Rheumatology","Urology","Ophthalmology",
];
const CERT_OPTIONS = [
  "HPCZ Certificate","ACLS","BLS","PALS","ATLS","Fellow RCPCH",
  "Fellow ACS","MCh","MS Surgery","MD",
];
const LANGUAGE_OPTIONS = [
  "English","Bemba","Nyanja","Tonga","Lozi","Lunda","Kaonde","Luvale",
];
const INSURANCE_OPTIONS = [
  "NHIMA","Prudential","Madison","Proflight","Zim Insurance",
  "MetLife","Old Mutual","AXA","BlueCross",
];

// ── My Practice inline editor ─────────────────────────────────────────────────

const MyPracticeEditor = () => {
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({
    medical_school: "",
    graduation_year: "",
    primary_practice_location: "",
    consultation_fee_min: "",
    consultation_fee_max: "",
    typical_wait_time: "",
    accepts_insurance: false,
    telemedicine_available: false,
    home_visits_available: false,
    subspecialties: [] as string[],
    board_certifications: [] as string[],
    languages_spoken: [] as string[],
    insurance_providers_accepted: [] as string[],
    affiliated_hospitals: [] as string[],
    newHospital: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select(
          "medical_school,graduation_year,primary_practice_location," +
          "consultation_fee_min,consultation_fee_max,typical_wait_time," +
          "accepts_insurance,telemedicine_available,home_visits_available," +
          "subspecialties,board_certifications,languages_spoken," +
          "insurance_providers_accepted,affiliated_hospitals"
        )
        .eq("id", user.id)
        .single();
      if (!p) return;
      const d = p as any;
      setData(prev => ({
        ...prev,
        medical_school: d.medical_school || "",
        graduation_year: d.graduation_year ? String(d.graduation_year) : "",
        primary_practice_location: d.primary_practice_location || "",
        consultation_fee_min: d.consultation_fee_min ? String(d.consultation_fee_min) : "",
        consultation_fee_max: d.consultation_fee_max ? String(d.consultation_fee_max) : "",
        typical_wait_time: d.typical_wait_time || "",
        accepts_insurance: d.accepts_insurance ?? false,
        telemedicine_available: d.telemedicine_available ?? false,
        home_visits_available: d.home_visits_available ?? false,
        subspecialties: d.subspecialties || [],
        board_certifications: d.board_certifications || [],
        languages_spoken: d.languages_spoken || [],
        insurance_providers_accepted: d.insurance_providers_accepted || [],
        affiliated_hospitals: d.affiliated_hospitals || [],
      }));
      setLoaded(true);
    };
    load();
  }, []);

  const toggle = (
    key: "subspecialties" | "board_certifications" | "languages_spoken" | "insurance_providers_accepted",
    value: string
  ) =>
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));

  const addHospital = () => {
    const h = data.newHospital.trim();
    if (!h || data.affiliated_hospitals.includes(h)) return;
    setData(prev => ({ ...prev, affiliated_hospitals: [...prev.affiliated_hospitals, h], newHospital: "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({
          medical_school: data.medical_school || null,
          graduation_year: data.graduation_year ? parseInt(data.graduation_year) : null,
          primary_practice_location: data.primary_practice_location || null,
          consultation_fee_min: data.consultation_fee_min ? parseFloat(data.consultation_fee_min) : null,
          consultation_fee_max: data.consultation_fee_max ? parseFloat(data.consultation_fee_max) : null,
          typical_wait_time: data.typical_wait_time || null,
          accepts_insurance: data.accepts_insurance,
          telemedicine_available: data.telemedicine_available,
          home_visits_available: data.home_visits_available,
          subspecialties: data.subspecialties,
          board_certifications: data.board_certifications,
          languages_spoken: data.languages_spoken,
          insurance_providers_accepted: data.insurance_providers_accepted,
          affiliated_hospitals: data.affiliated_hospitals,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Practice details saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#0073ea]" />
      </div>
    );
  }

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-extrabold uppercase text-[#676879] flex items-center gap-1.5 border-b border-[#f0f2f7] dark:border-slate-800 pb-2">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {children}
    </div>
  );

  const PillSelector = ({
    options, field, activeColor,
  }: {
    options: string[];
    field: "subspecialties" | "board_certifications" | "languages_spoken" | "insurance_providers_accepted";
    activeColor: string;
  }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(field, opt)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            data[field].includes(opt)
              ? `${activeColor} text-white border-transparent`
              : "bg-white dark:bg-slate-800 border-[#e6e9ef] text-[#676879] hover:border-current"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Education */}
      <Section icon={GraduationCap} title="Education">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase text-[#676879]">Medical School</Label>
            <Input
              value={data.medical_school}
              onChange={e => setData(p => ({ ...p, medical_school: e.target.value }))}
              placeholder="e.g. UNZA School of Medicine"
              className="h-10 rounded-xl border-[#e6e9ef] text-xs font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase text-[#676879]">Graduation Year</Label>
            <Input
              type="number" min="1960" max="2030"
              value={data.graduation_year}
              onChange={e => setData(p => ({ ...p, graduation_year: e.target.value }))}
              placeholder="e.g. 2015"
              className="h-10 rounded-xl border-[#e6e9ef] text-xs font-medium"
            />
          </div>
        </div>
      </Section>

      {/* Board Certifications */}
      <Section icon={Award} title="Board Certifications">
        <PillSelector options={CERT_OPTIONS} field="board_certifications" activeColor="bg-[#0073ea]" />
      </Section>

      {/* Subspecialties */}
      <Section icon={Stethoscope} title="Subspecialties">
        <PillSelector options={SUBSPECIALTY_OPTIONS} field="subspecialties" activeColor="bg-[#a25ddc]" />
      </Section>

      {/* Practice */}
      <Section icon={MapPin} title="Practice Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase text-[#676879]">Primary Practice Location</Label>
            <Input
              value={data.primary_practice_location}
              onChange={e => setData(p => ({ ...p, primary_practice_location: e.target.value }))}
              placeholder="e.g. Woodlands Clinic, Lusaka"
              className="h-10 rounded-xl border-[#e6e9ef] text-xs font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase text-[#676879]">Avg. Wait Time</Label>
            <Input
              value={data.typical_wait_time}
              onChange={e => setData(p => ({ ...p, typical_wait_time: e.target.value }))}
              placeholder="e.g. 15 mins"
              className="h-10 rounded-xl border-[#e6e9ef] text-xs font-medium"
            />
          </div>
        </div>
      </Section>

      {/* Affiliated Hospitals */}
      <Section icon={Building2} title="Affiliated Hospitals">
        <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
          {data.affiliated_hospitals.length === 0
            ? <span className="text-xs text-[#676879]">None added yet</span>
            : data.affiliated_hospitals.map(h => (
              <Badge key={h} variant="secondary" className="gap-1 pr-1">
                {h}
                <button onClick={() => setData(p => ({ ...p, affiliated_hospitals: p.affiliated_hospitals.filter(x => x !== h) }))} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          }
        </div>
        <div className="flex gap-2 max-w-sm">
          <Input
            value={data.newHospital}
            onChange={e => setData(p => ({ ...p, newHospital: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHospital())}
            placeholder="Add hospital name…"
            className="h-9 rounded-xl border-[#e6e9ef] text-xs"
          />
          <Button type="button" size="sm" onClick={addHospital} className="rounded-xl h-9 px-3 bg-[#0073ea] hover:bg-[#0060c4]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Section>

      {/* Fees */}
      <Section icon={DollarSign} title="Consultation Fees (ZMW)">
        <div className="flex items-center gap-3 max-w-xs">
          <div className="flex-1 space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase text-[#676879]">Min</Label>
            <Input
              type="number" min="0"
              value={data.consultation_fee_min}
              onChange={e => setData(p => ({ ...p, consultation_fee_min: e.target.value }))}
              placeholder="200"
              className="h-10 rounded-xl border-[#e6e9ef] text-xs font-medium"
            />
          </div>
          <span className="mt-6 text-[#676879] font-bold text-sm">–</span>
          <div className="flex-1 space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase text-[#676879]">Max</Label>
            <Input
              type="number" min="0"
              value={data.consultation_fee_max}
              onChange={e => setData(p => ({ ...p, consultation_fee_max: e.target.value }))}
              placeholder="500"
              className="h-10 rounded-xl border-[#e6e9ef] text-xs font-medium"
            />
          </div>
        </div>
      </Section>

      {/* Service delivery toggles */}
      <Section icon={Video} title="Service Delivery">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { key: "telemedicine_available" as const, icon: Video, label: "Telemedicine" },
            { key: "home_visits_available" as const, icon: Home, label: "Home Visits" },
            { key: "accepts_insurance" as const, icon: Shield, label: "Accepts Insurance" },
          ]).map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 border border-[#e6e9ef] rounded-xl bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <item.icon className="h-4 w-4 text-[#0073ea]" />
                {item.label}
              </div>
              <Switch
                checked={data[item.key]}
                onCheckedChange={v => setData(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Insurance providers — shown only when accepts_insurance is on */}
      {data.accepts_insurance && (
        <Section icon={Shield} title="Accepted Insurance Providers">
          <PillSelector options={INSURANCE_OPTIONS} field="insurance_providers_accepted" activeColor="bg-[#00c875]" />
        </Section>
      )}

      {/* Languages */}
      <Section icon={Languages} title="Languages Spoken">
        <PillSelector options={LANGUAGE_OPTIONS} field="languages_spoken" activeColor="bg-[#fdab3d]" />
      </Section>

      {/* Save */}
      <div className="pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl h-11 px-8 bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs"
        >
          {saving
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            : <><Save className="h-4 w-4 mr-2" />Save Practice Details</>
          }
        </Button>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

export const ProviderDashboard = () => {
  const navigate = useNavigate();
  const today = new Date();
  const { formatPrice } = useCurrency();
  const { availableRoles, isHealthPersonnel } = useUserRoles();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();

  const isDoctor = availableRoles.includes("doctor");
  const isNurse = availableRoles.includes("nurse");
  const isRadiologist = availableRoles.includes("radiologist");

  const dashboardMeta = useMemo(() => {
    if (isRadiologist) return { title: "Radiologist Command Console", subtitle: "Diagnostic imaging reads, telemetry & MedGemma AI analysis" };
    if (isNurse) return { title: "Nurse Triage Console", subtitle: "Ward rounds, vitals telemetry & home visits" };
    if (isDoctor) return { title: "Clinical Doctor Dashboard", subtitle: "Consultations, digital prescriptions & patient triage queue" };
    return { title: "Healthcare Provider Workspace", subtitle: "Practice management, patient queue & telehealth" };
  }, [isDoctor, isNurse, isRadiologist]);

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ["provider-today-appointments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("appointments")
        .select(`id, date, time, status, type, patient:profiles!appointments_patient_id_fkey (first_name, last_name)`)
        .eq("provider_id", user.id)
        .eq("date", format(today, "yyyy-MM-dd"))
        .order("time");
      return data || [];
    },
  });

  const { data: weekStats } = useQuery({
    queryKey: ["provider-week-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, completed: 0, pending: 0, revenue: 0 };
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("provider_id", user.id)
        .gte("date", weekStart)
        .lte("date", weekEnd);
      const appointments = data || [];
      return {
        total: appointments.length,
        completed: appointments.filter(a => a.status === "completed").length,
        pending: appointments.filter(a => a.status === "scheduled").length,
        revenue: appointments.filter(a => a.status === "completed").length * 150,
      };
    },
  });

  const scheduledToday = todayAppointments.filter((a: any) => a.status === "scheduled");
  const completedToday = todayAppointments.filter((a: any) => a.status === "completed");

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                {dashboardMeta.title}
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
              </h1>
              <p className="text-sm text-graphite-500 font-medium tracking-wide">
                {dashboardMeta.subtitle} • {format(today, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate("/ai-diagnostics")} className="vf-btn-secondary gap-2 text-sm">
              <Bot className="h-3.5 w-3.5" /> MedGemma AI
            </button>
            <button onClick={() => navigate("/provider-calendar")} className="vf-btn-primary gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
        </div>
      </div>

      <div className="max-content mx-auto px-4 sm:px-6 pt-6 space-y-6" style={{ maxWidth: "var(--max-content, 1280px)" }}>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="vf-card space-y-3">
            <div className="text-xs font-medium text-graphite-500 uppercase tracking-wide">Today's Consultations</div>
            <div className="text-3xl font-display font-medium text-primary-500">{todayAppointments.length}</div>
            <div className="text-xs font-medium text-success-500">{completedToday.length} Done • {scheduledToday.length} Pending</div>
          </div>
          <div className="vf-card space-y-3">
            <div className="text-xs font-medium text-graphite-500 uppercase tracking-wide">Weekly Patient Volume</div>
            <div className="text-3xl font-display font-medium text-accent-500">{weekStats?.total || 0}</div>
            <div className="text-xs font-medium text-graphite-500">{weekStats?.completed || 0} Completed Total</div>
          </div>
          <div className="vf-card space-y-3">
            <div className="text-xs font-medium text-graphite-500 uppercase tracking-wide">Active Queue Status</div>
            <div className="text-3xl font-display font-medium text-warning-500">{weekStats?.pending || 0}</div>
            <div className="text-xs font-medium text-warning-500">Awaiting Triage</div>
          </div>
          <div className="vf-card space-y-3">
            <div className="text-xs font-extrabold text-[#676879] dark:text-slate-400 uppercase">Shift Earnings (ZMW)</div>
            <div className="text-3xl font-black font-mono text-[#00c875] mt-1">{formatPrice(weekStats?.revenue || 0)}</div>
            <div className="text-[11px] font-bold text-emerald-500 mt-1">+14% Shift Growth</div>
          </div>
        </div>

        {/* Quick action pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Calendar", route: "/provider-calendar", icon: Calendar },
            { label: "Patient Queue", route: "/appointments", icon: ClipboardList },
            { label: "Write Rx", route: "/prescriptions", icon: FileText },
            { label: "Telehealth", route: "/video-dashboard", icon: Video },
            { label: "Medical EMR", route: "/medical-records", icon: Stethoscope },
            { label: "Chat Console", route: "/chat", icon: MessageSquare },
          ].map(act => (
            <button
              key={act.label}
              onClick={() => navigate(act.route)}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 hover:border-[#0073ea] hover:shadow-xs transition-all flex items-center gap-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200"
            >
              <div className="p-2 rounded-lg bg-[#e5f0ff] dark:bg-blue-950 text-[#0073ea]">
                <act.icon className="h-4 w-4" />
              </div>
              <span>{act.label}</span>
            </button>
          ))}
        </div>

        {/* Today's queue */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#e5f0ff] dark:bg-blue-950/40 border-b border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between border-l-4 border-l-[#0073ea]">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-[#0073ea]">Today's Scheduled Consultations</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#0073ea] text-white">
                {todayAppointments.length}
              </span>
            </div>
            <button onClick={() => navigate("/appointments")} className="text-xs font-bold text-[#0073ea] hover:underline flex items-center gap-1">
              View All Board Records <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#676879] dark:text-slate-400">
              No appointments scheduled for today
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase text-[#676879] dark:text-slate-400 border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
                    <th className="py-2.5 px-4 w-[240px]">Patient Name</th>
                    <th className="py-2.5 px-3 w-[130px] text-center">Status</th>
                    <th className="py-2.5 px-3 w-[150px]">Consult Time</th>
                    <th className="py-2.5 px-3 w-[140px]">Mode</th>
                    <th className="py-2.5 px-3 w-[150px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800 text-xs">
                  {todayAppointments.map((app: any) => (
                    <tr key={app.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                        {app.patient?.first_name} {app.patient?.last_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {app.status === "completed"
                          ? <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Completed</span>
                          : <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Scheduled</span>
                        }
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{app.time}</td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#f0f2f7] dark:bg-slate-800 font-semibold text-[11px]">
                          {app.type === "video_consultation" ? "Video Call" : "In-Person"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => navigate("/appointments")}
                          className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-[11px] font-bold hover:bg-[#0060c4]"
                        >
                          Open EMR Case Sheet
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detailed modules tabs (now includes My Practice) ── */}
        <Tabs defaultValue="schedule" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 rounded-xl w-auto min-w-full">
              {[
                { value: "schedule", label: "Schedule Manager" },
                { value: "patients", label: "Patient Directory" },
                { value: "waitlist", label: "Waitlist Triage" },
                { value: "analytics", label: "Analytics" },
                { value: "my_practice", label: "My Practice" },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs font-extrabold px-4 py-1.5 rounded-md whitespace-nowrap data-[state=active]:bg-[#0073ea] data-[state=active]:text-white"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <TabsContent value="schedule"><ScheduleManager /></TabsContent>
            <TabsContent value="patients"><PatientRecords /></TabsContent>
            <TabsContent value="waitlist"><WaitlistManager /></TabsContent>
            <TabsContent value="analytics"><ProviderAnalyticsDashboard /></TabsContent>
            <TabsContent value="my_practice">
              <div className="mb-4">
                <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[#0073ea]" />
                  My Practice Profile
                </h2>
                <p className="text-xs text-[#676879] mt-0.5">
                  These details appear on your public provider listing and help patients choose the right care.
                </p>
              </div>
              <MyPracticeEditor />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderDashboard;

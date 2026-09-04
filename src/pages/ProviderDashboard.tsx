import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleManager } from "@/components/provider/ScheduleManager";
import { DigitalSignature } from "@/components/provider/DigitalSignature";
import { PatientRecords } from "@/components/provider/PatientRecords";
import { ProviderAnalyticsDashboard } from "@/components/provider/ProviderAnalyticsDashboard";
import { WaitlistManager } from "@/components/booking/WaitlistManager";
import {
  Bot, Brain, Sparkles, ArrowRight, BarChart3,
  Calendar, Users, Clock, FileText, Video, Stethoscope,
  ClipboardList, Wallet, MessageSquare, TrendingUp, Heart, Pill, Thermometer, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";

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
        completed: appointments.filter((a) => a.status === "completed").length,
        pending: appointments.filter((a) => a.status === "scheduled").length,
        revenue: appointments.filter((a) => a.status === "completed").length * 150,
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
            <button
              onClick={() => navigate("/ai-diagnostics")}
              className="vf-btn-secondary gap-2 text-sm"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>MedGemma AI</span>
            </button>
            <button
              onClick={() => navigate("/provider-calendar")}
              className="vf-btn-primary gap-2 text-sm"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Stats Cards */}
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

        {/* Quick Action Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Calendar", route: "/provider-calendar", icon: Calendar },
            { label: "Patient Queue", route: "/appointments", icon: ClipboardList },
            { label: "Write Rx", route: "/prescriptions", icon: FileText },
            { label: "Telehealth", route: "/video-dashboard", icon: Video },
            { label: "Medical EMR", route: "/medical-records", icon: Stethoscope },
            { label: "Chat Console", route: "/chat", icon: MessageSquare },
          ].map((act) => (
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

        {/* Today's Queue Section */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#e5f0ff] dark:bg-blue-950/40 border-b border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between border-l-4 border-l-[#0073ea]">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-[#0073ea]">Today's Scheduled Consultations</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#0073ea] text-white">
                {todayAppointments.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/appointments")}
              className="text-xs font-bold text-[#0073ea] hover:underline flex items-center gap-1"
            >
              <span>View All Board Records</span>
              <ArrowRight className="h-3.5 w-3.5" />
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
                        {app.status === "completed" ? (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Completed</span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Scheduled</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {app.time}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#f0f2f7] dark:bg-slate-800 font-semibold text-[11px]">
                          {app.type === "video_consultation" ? "Video Call" : "In-Person"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => navigate(`/appointments`)}
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

        {/* Detailed Provider Modules Tabs */}
        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 rounded-xl">
            <TabsTrigger value="schedule" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">Schedule Manager</TabsTrigger>
            <TabsTrigger value="patients" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">Patient Directory</TabsTrigger>
            <TabsTrigger value="waitlist" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">Waitlist Triage</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-extrabold px-4 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">Analytics</TabsTrigger>
          </TabsList>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <TabsContent value="schedule"><ScheduleManager /></TabsContent>
            <TabsContent value="patients"><PatientRecords /></TabsContent>
            <TabsContent value="waitlist"><WaitlistManager /></TabsContent>
            <TabsContent value="analytics"><ProviderAnalyticsDashboard /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderDashboard;

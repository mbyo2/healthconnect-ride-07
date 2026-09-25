import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, isToday } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";
import { useApiQuery } from "@/hooks/use-api-query";
import { useUserRoles } from "@/context/UserRolesContext";
import { ALL_CLINICIAN_ROLES } from "@/config/roleConfig";
import { EmptyState, LoadingSkeleton } from "@/components/shared";
import { SuggestionBanner, HealthTipCard } from "@/components/guidance";
import { providerDisplayName } from "@/utils/providerDisplay";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  FileText,
  CalendarPlus,
  ArrowRight,
  CheckCircle,
  Stethoscope,
  Table,
  Kanban,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  Info
} from "lucide-react";

export const AppointmentsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "calendar">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { availableRoles } = useUserRoles();

  // Every clinical cadre sees the provider-side schedule.
  const isProvider = availableRoles.some((r) =>
    (ALL_CLINICIAN_ROLES as readonly string[]).includes(r)
  );

  const { data: appointments = [], isLoading } = useApiQuery<any[]>(
    ["appointments", isProvider ? "provider" : "patient"],
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (isProvider) {
        // NOTE: appointments.patient_id FKs point at auth.users, so a
        // `profiles!appointments_patient_id_fkey` join hint is invalid
        // PostgREST. Patient rows are fetched directly — the
        // "Appointment participants can view each other's profiles" RLS
        // policy permits reading the other participant's profile.
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("provider_id", user.id)
          .order("date", { ascending: true })
          .limit(500);

        if (error) throw error;
        const rows = data || [];
        const patientIds = [...new Set(rows.map((a: any) => a.patient_id).filter(Boolean))];
        let patientMap: Record<string, any> = {};
        if (patientIds.length > 0) {
          const { data: patients } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url, phone")
            .in("id", patientIds);
          patientMap = Object.fromEntries((patients || []).map((p: any) => [p.id, p]));
        }
        return rows.map((a: any) => ({ ...a, patient: patientMap[a.patient_id] || null }));
      } else {
        // NOTE: same invalid-join-hint issue as above; provider details
        // come from the public provider_directory view instead.
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", user.id)
          .order("date", { ascending: true })
          .limit(500);

        if (error) throw error;
        const rows = data || [];
        const providerIds = [...new Set(rows.map((a: any) => a.provider_id).filter(Boolean))];
        let providerMap: Record<string, any> = {};
        if (providerIds.length > 0) {
          const { data: providers } = await supabase
            .from("provider_directory")
            .select(
              "id, first_name, last_name, specialty, avatar_url, phone, role, " +
              "consultation_fee_min, consultation_fee_max, telemedicine_available, " +
              "typical_wait_time, primary_practice_location, location"
            )
            .in("id", providerIds);
          providerMap = Object.fromEntries(
            (providers || []).map((p: any) => [
              p.id,
              { ...p, address: p.primary_practice_location || p.location || null },
            ])
          );
        }
        return rows.map((a: any) => ({ ...a, provider: providerMap[a.provider_id] || null }));
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      errorMessage: "Failed to load appointments",
    }
  );

  // Real-time subscription for appointment status updates
  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Appointment cancelled"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const completeAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment marked as completed");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const person = isProvider ? app.patient : app.provider;
      const personName = `${person?.first_name || ""} ${person?.last_name || ""}`.toLowerCase();
      const matchesSearch =
        personName.includes(searchQuery.toLowerCase()) ||
        (app.type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter, isProvider]);

  // Group into Upcoming & Past.
  // An appointment is "past" only once its scheduled date+time has passed —
  // comparing the bare date (midnight) wrongly buried all of today's
  // appointments under Past. Rows without a parseable time count through
  // the end of their day.
  const apptDateTime = (a: { date: string; time?: string | null }) => {
    const d = parseISO(a.date);
    const m = /^(\d{1,2}):(\d{2})/.exec(a.time || "");
    if (m) {
      d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  };

  const upcoming = useMemo(
    () =>
      filteredAppointments
        .filter((a) => apptDateTime(a).getTime() >= Date.now() && a.status !== "cancelled" && a.status !== "completed")
        .sort((a, b) => apptDateTime(a).getTime() - apptDateTime(b).getTime()),
    [filteredAppointments]
  );

  const past = useMemo(
    () =>
      filteredAppointments
        .filter((a) => apptDateTime(a).getTime() < Date.now() || a.status === "completed" || a.status === "cancelled")
        .sort((a, b) => apptDateTime(b).getTime() - apptDateTime(a).getTime()),
    [filteredAppointments]
  );

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-success-50 text-success-500 border border-success-100">✓ Completed</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-error-50 text-error-500 border border-error-100">✕ Cancelled</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-warning-50 text-warning-500 border border-warning-100">● In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-primary-50 text-primary-500 border border-primary-100">◉ Scheduled</span>;
    }
  };

  return (
    <NetworkErrorBoundary>
      <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
          <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2.5 text-midnight">
                  {isProvider ? "Appointment Workspace" : "My Appointments"}
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                </h1>
                <p className="text-sm text-graphite-500 font-medium tracking-wide">
                  {isProvider ? "Manage clinic visits, video consultations & e-intake" : "Upcoming visits, video links & prescription notes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isProvider && (
                <button
                  onClick={() => navigate("/search")}
                  className="vf-btn-primary text-sm gap-2 active:scale-95"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>Book New Appointment</span>
                </button>
              )}
            </div>
          </div>

          {/* Views & Filters Bar */}
          <div className="max-w-content mx-auto mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-canvas-silk">
            {/* View Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-canvas-bone border border-canvas-silk">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "table"
                    ? "bg-primary-500 text-white shadow-button"
                    : "text-graphite-500 hover:text-midnight hover:bg-white dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Main Table</span>
              </button>

              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "kanban"
                    ? "bg-primary-500 text-white shadow-button"
                    : "text-graphite-500 hover:text-midnight hover:bg-white dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Kanban Flow</span>
              </button>
            </div>

            {/* Filter inputs */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, specialty, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Board Body */}
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton variant="card" count={3} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contextual Guidance - Only for Patients */}
              {!isProvider && upcoming.length === 0 && (
                <SuggestionBanner
                  title="Get Started with Your Healthcare Journey"
                  description="Book your first appointment with a qualified healthcare provider. Browse by specialty or search for doctors near you."
                  variant="info"
                  icon={Info}
                  actions={[
                    { label: 'Find a Doctor', onClick: () => navigate('/search'), variant: 'primary' },
                  ]}
                />
              )}

              {/* Health Tip for Patients */}
              {!isProvider && upcoming.length > 0 && (
                <HealthTipCard
                  title="Prepare for Your Appointment"
                  tip="Write down your symptoms, current medications, and questions before your visit. This helps your doctor provide better care."
                  category="wellness"
                  source="Doc' O Clock Health Team"
                />
              )}

              {/* Upcoming Appointments Table Group */}
              <div className="rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
                      <h2 className="font-extrabold text-sm text-white">
                        Upcoming &amp; Active Appointments
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary-500 text-white">
                      {upcoming.length}
                    </span>
                  </div>
                </div>

                {upcoming.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={Calendar}
                      title={isProvider ? "No upcoming appointments" : "No appointments scheduled yet"}
                      description={isProvider 
                        ? "You don't have any upcoming patient appointments at this time."
                        : "Start your healthcare journey by booking an appointment with a qualified provider."
                      }
                      actionLabel={isProvider ? undefined : "Browse Doctors"}
                      onAction={isProvider ? undefined : () => navigate('/search')}
                    />
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400 border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950">
                          <th className="py-3 px-6 w-[240px]">Participant</th>
                          <th className="py-3 px-3 w-[140px] text-center">Status</th>
                          <th className="py-3 px-3 w-[150px]">Date & Time</th>
                          <th className="py-3 px-3 w-[130px]">Consult Mode</th>
                          <th className="py-3 px-3 w-[180px]">Location / Contact</th>
                          <th className="py-3 px-3 w-[150px] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-canvas-silk dark:divide-slate-800 text-xs">
                        {upcoming.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const isVideo = app.type === "video_consultation";
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center flex-shrink-0 uppercase">
                                    {person?.first_name?.[0]}{person?.last_name?.[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                      {isProvider
                                        ? `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Patient'
                                        : providerDisplayName({ first_name: person?.first_name, last_name: person?.last_name, role: (person as any)?.role })}
                                    </div>
                                    {!isProvider && person?.specialty && (
                                      <div className="text-[10px] text-primary-500 font-bold uppercase tracking-wide">{person.specialty}</div>
                                    )}
                                    {/* New: fee + telemedicine + wait time for patient view */}
                                    {!isProvider && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(person?.consultation_fee_min || person?.consultation_fee_max) && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-primary-50 text-primary-500">
                                            💰 {person.consultation_fee_min && person.consultation_fee_max
                                              ? `K${person.consultation_fee_min}–K${person.consultation_fee_max}`
                                              : `From K${person.consultation_fee_min ?? person.consultation_fee_max}`}
                                          </span>
                                        )}
                                        {person?.telemedicine_available && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700">
                                            📹 Telemedicine
                                          </span>
                                        )}
                                        {person?.typical_wait_time && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700">
                                            ⏱ {person.typical_wait_time}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-3 text-center">
                                {getStatusPill(app.status)}
                              </td>

                              <td className="py-4 px-3 font-mono font-bold text-slate-900 dark:text-slate-200">
                                <div>{format(apptDate, "MMM d, yyyy")}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{app.time}</div>
                              </td>

                              <td className="py-4 px-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isVideo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {isVideo ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                  <span>{isVideo ? "Video" : "In-Person"}</span>
                                </span>
                              </td>

                              <td className="py-4 px-3 text-slate-600 dark:text-slate-400 font-medium truncate max-w-[180px]">
                                {person?.address || "Clinic Facility"}
                              </td>

                              <td className="py-4 px-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {isVideo && isToday(apptDate) && (
                                    <Link
                                      to={`/video-call/${app.id}`}
                                      className="px-3 py-1.5 rounded-lg bg-success-500 text-white text-[10px] font-black hover:bg-success-500 transition-all"
                                    >
                                      JOIN
                                    </Link>
                                  )}
                                  {isProvider && (
                                    <button
                                      onClick={() => completeAppointment.mutate(app.id)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black hover:bg-black transition-all active:scale-95"
                                    >
                                      DONE
                                    </button>
                                  )}
                                  <button
                                    onClick={() => cancelAppointment.mutate(app.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-black hover:bg-slate-50 transition-all active:scale-95"
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Past Appointments Group */}
              <div className="rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-canvas-bone dark:bg-slate-950 border-b border-canvas-silk dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-extrabold text-sm text-slate-600 dark:text-slate-400">
                      Past &amp; Completed
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {past.length}
                    </span>
                  </div>
                </div>

                {past.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={Clock}
                      title="No past appointments"
                      description="Your appointment history will appear here once you complete visits."
                    />
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400 border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950">
                          <th className="py-2.5 px-4 w-[240px]">Participant</th>
                          <th className="py-2.5 px-3 w-[140px] text-center">Status</th>
                          <th className="py-2.5 px-3 w-[150px]">Date & Time</th>
                          <th className="py-2.5 px-3 w-[130px]">Consult Mode</th>
                          <th className="py-2.5 px-3 w-[180px]">Location</th>
                          <th className="py-2.5 px-3 w-[150px] text-center">Re-Book</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-canvas-silk dark:divide-slate-800 text-xs">
                        {past.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                <div>
                                  <div>{isProvider
                                    ? `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Patient'
                                    : providerDisplayName({ first_name: person?.first_name, last_name: person?.last_name, role: (person as any)?.role })}</div>
                                  {!isProvider && person?.specialty && (
                                    <div className="text-[10px] text-primary-500 font-bold mt-0.5">{person.specialty}</div>
                                  )}
                                  {!isProvider && (person?.consultation_fee_min || person?.telemedicine_available) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {person?.consultation_fee_min && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-500">
                                          💰 From K{person.consultation_fee_min}
                                        </span>
                                      )}
                                      {person?.telemedicine_available && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                          📹 Telemedicine
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                {getStatusPill(app.status)}
                              </td>

                              <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                                {format(apptDate, "MMM d, yyyy")} • {app.time}
                              </td>

                              <td className="py-3 px-3 text-slate-500">
                                {app.type === "video_consultation" ? "Video Visit" : "In-Person"}
                              </td>

                              <td className="py-3 px-3 text-slate-500 truncate max-w-[180px]">
                                {person?.address || "Lusaka Clinic"}
                              </td>

                              <td className="py-3 px-3 text-center">
                                {!isProvider && app.provider_id && (
                                  <button
                                    onClick={() => navigate(`/provider/${app.provider_id}`)}
                                    className="px-3 py-1.5 rounded-xl bg-primary-500 text-white text-[11px] font-black hover:bg-primary-600 transition-all active:scale-95"
                                  >
                                    Re-Book
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </NetworkErrorBoundary>
  );
};

export default AppointmentsPage;

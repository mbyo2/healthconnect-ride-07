import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, parseISO, isToday } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";
import { useApiQuery } from "@/hooks/use-api-query";
import { useUserRoles } from "@/context/UserRolesContext";
import { EmptyState, LoadingSkeleton } from "@/components/shared";
import { SuggestionBanner, HealthTipCard } from "@/components/guidance";
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

  const isProvider = availableRoles.some((r) =>
    ["health_personnel", "doctor", "nurse", "radiologist"].includes(r)
  );

  const { data: appointments = [], isLoading } = useApiQuery<any[]>(
    ["appointments", isProvider ? "provider" : "patient"],
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (isProvider) {
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            patient:profiles!appointments_patient_id_fkey (
              first_name, last_name, avatar_url, phone
            )
          `)
          .eq("provider_id", user.id)
          .order("date", { ascending: true });

        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            provider:profiles!appointments_provider_id_fkey (
              first_name, last_name, specialty, avatar_url, phone, address
            )
          `)
          .eq("patient_id", user.id)
          .order("date", { ascending: true });

        if (error) throw error;
        return data || [];
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

  // Group into Upcoming & Past
  const upcoming = useMemo(
    () =>
      filteredAppointments
        .filter((a) => !isPast(parseISO(a.date)) && a.status !== "cancelled" && a.status !== "completed")
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [filteredAppointments]
  );

  const past = useMemo(
    () =>
      filteredAppointments
        .filter((a) => isPast(parseISO(a.date)) || a.status === "completed" || a.status === "cancelled")
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
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
        <div className="bg-white border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
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
                    : "text-graphite-500 hover:text-midnight hover:bg-white"
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
                    : "text-graphite-500 hover:text-midnight hover:bg-white"
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
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
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
              <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-[#0f172a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                      <h2 className="font-extrabold text-sm text-white">
                        Upcoming &amp; Active Appointments
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#0073ea] text-white">
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
                        <tr className="text-[11px] font-extrabold uppercase text-[#676879] dark:text-slate-400 border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
                          <th className="py-3 px-6 w-[240px]">Participant</th>
                          <th className="py-3 px-3 w-[140px] text-center">Status</th>
                          <th className="py-3 px-3 w-[150px]">Date & Time</th>
                          <th className="py-3 px-3 w-[130px]">Consult Mode</th>
                          <th className="py-3 px-3 w-[180px]">Location / Contact</th>
                          <th className="py-3 px-3 w-[150px] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800 text-xs">
                        {upcoming.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const isVideo = app.type === "video_consultation";
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center flex-shrink-0 uppercase">
                                    {person?.first_name?.[0]}{person?.last_name?.[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                      {isProvider ? "" : "Dr. "}{person?.first_name} {person?.last_name}
                                    </div>
                                    {!isProvider && person?.specialty && (
                                      <div className="text-[10px] text-[#0073ea] font-bold uppercase tracking-wide">{person.specialty}</div>
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
                                      className="px-3 py-1.5 rounded-lg bg-[#00c875] text-white text-[10px] font-black hover:bg-[#00b368] transition-all"
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
              <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-[#f5f7fa] dark:bg-slate-950 border-b border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between">
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
                        <tr className="text-[11px] font-extrabold uppercase text-[#676879] dark:text-slate-400 border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
                          <th className="py-2.5 px-4 w-[240px]">Participant</th>
                          <th className="py-2.5 px-3 w-[140px] text-center">Status</th>
                          <th className="py-2.5 px-3 w-[150px]">Date & Time</th>
                          <th className="py-2.5 px-3 w-[130px]">Consult Mode</th>
                          <th className="py-2.5 px-3 w-[180px]">Location</th>
                          <th className="py-2.5 px-3 w-[150px] text-center">Re-Book</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800 text-xs">
                        {past.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                {isProvider ? "" : "Dr. "}{person?.first_name} {person?.last_name}
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
                                    className="px-3 py-1.5 rounded-xl bg-[#0073ea] text-white text-[11px] font-black hover:bg-[#0060c7] transition-all active:scale-95"
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

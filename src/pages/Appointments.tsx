import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, parseISO, isToday } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";
import { useApiQuery } from "@/hooks/use-api-query";
import { useUserRoles } from "@/context/UserRolesContext";
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
  Plus
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
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Completed</span>;
      case "cancelled":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Cancelled</span>;
      case "in_progress":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">In Progress</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Scheduled</span>;
    }
  };

  return (
    <NetworkErrorBoundary>
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
        {/* Top Sticky Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  {isProvider ? "Patient Appointment Workspace" : "My Healthcare Appointments"}
                  <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
                </h1>
                <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                  {isProvider ? "Manage clinic visits, video consultations, and e-intake forms" : "View upcoming doctor visits, video links, and prescription notes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isProvider && (
                <button
                  onClick={() => navigate("/search")}
                  className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>Book New Appointment</span>
                </button>
              )}
            </div>
          </div>

          {/* Views & Filters Bar */}
          <div className="max-w-[1500px] mx-auto mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
            {/* View Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#f5f6f8] dark:bg-slate-950 border border-[#e6e9ef] dark:border-slate-800">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold transition-all ${
                  viewMode === "table"
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "text-[#676879] dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Main Table</span>
              </button>

              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold transition-all ${
                  viewMode === "kanban"
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "text-[#676879] dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
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
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[#e6e9ef] font-bold text-xs text-slate-400">
              Loading appointment board...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Appointments Table Group */}
              <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-[#e5f0ff] dark:bg-blue-950/40 border-b border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between border-l-4 border-l-[#0073ea]">
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm text-[#0073ea] dark:text-blue-400">
                      Upcoming & Active Appointments
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#0073ea] text-white">
                      {upcoming.length}
                    </span>
                  </div>
                </div>

                {upcoming.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#676879] dark:text-slate-400">
                    No upcoming appointments scheduled
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
                          <th className="py-2.5 px-3 w-[180px]">Location / Contact</th>
                          <th className="py-2.5 px-3 w-[150px] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800 text-xs">
                        {upcoming.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const isVideo = app.type === "video_consultation";
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-[#0073ea] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                                    {person?.first_name?.[0]}{person?.last_name?.[0]}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                      {isProvider ? "" : "Dr. "}{person?.first_name} {person?.last_name}
                                    </div>
                                    {!isProvider && person?.specialty && (
                                      <div className="text-[10px] text-[#0073ea] font-semibold">{person.specialty}</div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                {getStatusPill(app.status)}
                              </td>

                              <td className="py-3 px-3 font-mono font-semibold">
                                <div>{format(apptDate, "EEE, MMM d, yyyy")}</div>
                                <div className="text-[10px] text-slate-400">{app.time}</div>
                              </td>

                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isVideo ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                }`}>
                                  {isVideo ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                  <span>{isVideo ? "Video Visit" : "In-Person"}</span>
                                </span>
                              </td>

                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                                {person?.address || "Lusaka Medical Facility"}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isVideo && isToday(apptDate) && (
                                    <Link
                                      to={`/video-call/${app.id}`}
                                      className="px-2.5 py-1 rounded-md bg-[#00c875] text-white text-[11px] font-bold hover:bg-[#00b368] transition-all"
                                    >
                                      Join Call
                                    </Link>
                                  )}
                                  {isProvider && (
                                    <button
                                      onClick={() => completeAppointment.mutate(app.id)}
                                      className="px-2 py-1 rounded-md bg-[#00c875] text-white text-[11px] font-bold hover:bg-[#00b368]"
                                    >
                                      Complete
                                    </button>
                                  )}
                                  <button
                                    onClick={() => cancelAppointment.mutate(app.id)}
                                    className="px-2 py-1 rounded-md bg-[#e2445c] text-white text-[11px] font-bold hover:bg-[#c9364b]"
                                  >
                                    Cancel
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
              <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-[#f5f6f8] dark:bg-slate-950 border-b border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between border-l-4 border-l-[#a25ddc]">
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm text-[#a25ddc]">
                      Past & Completed Appointments
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#a25ddc] text-white">
                      {past.length}
                    </span>
                  </div>
                </div>

                {past.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#676879] dark:text-slate-400">
                    No past appointment history
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
                                    className="px-3 py-1 rounded-md bg-[#0073ea] text-white text-[11px] font-bold hover:bg-[#0060c4]"
                                  >
                                    Re-Book Visit
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

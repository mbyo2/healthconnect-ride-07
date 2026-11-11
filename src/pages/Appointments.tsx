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
import { EmptyState } from "@/components/shared";
import { SkeletonAppointmentsBoard } from "@/components/ui/skeleton-kit";
import { SuggestionBanner } from "@/components/guidance";
import { providerDisplayName } from "@/utils/providerDisplay";
import { createNotification } from "@/services/notifications";
import { MarkNoShowButton } from "@/components/appointments/NoShowWorkflow";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
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
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  Wallet
} from "lucide-react";
import { friendlyErrorMessage } from "@/utils/friendly-error";

// An appointment is a telemedicine visit only when the appointment itself
// was booked as one (BookingModal writes 'video_consultation'; 'telemedicine'
// / 'telehealth' are legacy type values for the same thing). A provider's
// directory capability (telemedicine_available) must never label an
// in-person appointment row as telemedicine.
const isVideoAppointment = (app: any): boolean =>
  app?.type === "video_consultation" || app?.type === "telemedicine" || app?.type === "telehealth";

// The booking reference patients quote from their confirmation page
// (BookingConfirmed renders String(appointment.id).slice(0, 8)). The
// provider list shows the same value so both sides can match a booking.
const bookingRef = (app: any): string => String(app?.id ?? "").slice(0, 8);

export const AppointmentsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
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
              "id, first_name, last_name, specialty, avatar_url, role, " +
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
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId)
        .select("id");
      if (error) throw error;
      // PostgREST returns 200 with zero rows when RLS blocks the update —
      // never let a blocked cancellation look like a silent success.
      if (!data || data.length === 0) {
        throw new Error("Cancellation was blocked. Please try again or contact support.");
      }
    },
    onSuccess: () => toast.success("Appointment cancelled"),
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Could not cancel the appointment.")),
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

  const acceptAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "scheduled" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      window.dispatchEvent(new CustomEvent("app-feedback", {
        detail: { type: "success", title: "Appointment accepted", description: "Patient has been notified." }
      }));
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Could not accept appointment.")),
  });

  const declineAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment declined");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Could not decline appointment.")),
  });

  // Provider availability for the reschedule dialog (day_of_week + hours).
  const { data: providerAvailability = [] } = useQuery<any[]>({
    queryKey: ["reschedule-availability", rescheduleTarget?.provider_id],
    queryFn: async () => {
      if (!rescheduleTarget?.provider_id) return [];
      const { data, error } = await supabase
        .from("provider_availability")
        .select("day_of_week, start_time, end_time")
        .eq("provider_id", rescheduleTarget.provider_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!rescheduleTarget,
  });

  const openReschedule = (app: any) => {
    setRescheduleTarget(app);
    setNewDate(app.date || "");
    setNewTime(app.time || "");
  };

  const rescheduleAppointment = useMutation({
    mutationFn: async () => {
      if (!rescheduleTarget) throw new Error("No appointment selected");
      if (!newDate) throw new Error("Please choose a new date");
      if (!newTime) throw new Error("Please choose a new time");

      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (newDate < todayStr) throw new Error("The new date cannot be in the past");

      // Validate against the provider's working hours when they are set.
      // day_of_week is Monday-first (0=Mon..6=Sun); shift JS Sunday-first getDay().
      if (providerAvailability.length > 0) {
        const dow = (parseISO(newDate).getDay() + 6) % 7;
        const dayRows = providerAvailability.filter((r: any) => r.day_of_week === dow);
        if (dayRows.length === 0) {
          throw new Error("The provider does not work on that day of the week");
        }
        const withinHours = dayRows.some((r: any) => {
          const start = (r.start_time || "00:00").slice(0, 5);
          const end = (r.end_time || "23:59").slice(0, 5);
          return newTime >= start && newTime <= end;
        });
        if (!withinHours) throw new Error("That time is outside the provider's working hours");
      }

      // Slot conflict check — no double-booking the provider.
      const { data: clashes, error: clashError } = await supabase
        .from("appointments")
        .select("id")
        .eq("provider_id", rescheduleTarget.provider_id)
        .eq("date", newDate)
        .eq("time", newTime)
        .neq("id", rescheduleTarget.id)
        .neq("status", "cancelled")
        .limit(1);
      if (clashError) throw clashError;
      if (clashes && clashes.length > 0) {
        throw new Error("That slot is already booked — please choose another time");
      }

      const { error } = await supabase
        .from("appointments")
        .update({ date: newDate, time: newTime })
        .eq("id", rescheduleTarget.id);
      if (error) throw error;

      // Notify the patient about the new slot.
      if (rescheduleTarget.patient_id) {
        const person = rescheduleTarget.patient;
        const patientName = person ? `${person.first_name || ""} ${person.last_name || ""}`.trim() : "your appointment";
        await createNotification(
          rescheduleTarget.patient_id,
          "Appointment rescheduled",
          `Your appointment on ${format(parseISO(rescheduleTarget.date), "MMM d, yyyy")} at ${rescheduleTarget.time || ""} was moved to ${format(parseISO(newDate), "MMM d, yyyy")} at ${newTime}.`,
          "appointment"
        ).catch(() => null);
        void patientName;
      }
    },
    onSuccess: () => {
      toast.success("Appointment rescheduled");
      setRescheduleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Could not reschedule")),
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
        return <StatusBadge tone="positive">Completed</StatusBadge>;
      case "cancelled":
        return <StatusBadge tone="negative">Cancelled</StatusBadge>;
      case "in_progress":
        return <StatusBadge tone="info">In Progress</StatusBadge>;
      case "pending":
        // A pending booking is a request awaiting provider confirmation —
        // it must never read "Scheduled" (matches BookingConfirmed's
        // "Request sent" wording). Display mapping only; the stored
        // server status stays "pending".
        return <StatusBadge tone="warning">Request sent</StatusBadge>;
      default:
        return <StatusBadge tone="info">Scheduled</StatusBadge>;
    }
  };

  // Mobile card rendering (below sm) — same data, same actions/handlers as
  // the desktop tables below; markup follows the AgendaTimeline card idiom.
  const renderUpcomingMobileCard = (app: any) => {
    const person = isProvider ? app.patient : app.provider;
    const isVideo = isVideoAppointment(app);
    const apptDate = parseISO(app.date);
    return (
      <div
        key={app.id}
        className="px-1 py-4"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold text-xs flex items-center justify-center flex-shrink-0 uppercase">
            {person?.first_name?.[0]}{person?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground">
              {isProvider
                ? `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Patient'
                : providerDisplayName({ first_name: person?.first_name, last_name: person?.last_name, role: (person as any)?.role })}
            </div>
            {isProvider && (
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Ref {bookingRef(app)}</div>
            )}
            {!isProvider && person?.specialty && (
              <div className="text-xs text-muted-foreground font-medium">{person.specialty}</div>
            )}
            {!isProvider && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(person?.consultation_fee_min || person?.consultation_fee_max) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <Wallet className="h-2.5 w-2.5" aria-hidden /> {person.consultation_fee_min && person.consultation_fee_max
                      ? `K${person.consultation_fee_min}–K${person.consultation_fee_max}`
                      : `From K${person.consultation_fee_min ?? person.consultation_fee_max}`}
                  </span>
                )}
                {isVideo && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <Video className="h-2.5 w-2.5" aria-hidden /> Telemedicine
                  </span>
                )}
                {person?.typical_wait_time && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <Clock className="h-2.5 w-2.5" aria-hidden /> {person.typical_wait_time}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0">{getStatusPill(app.status)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          <span className="tnum font-medium text-foreground text-xs">
            {format(apptDate, "MMM d, yyyy")} · {app.time}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-muted text-muted-foreground">
            {isVideo ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            <span>{isVideo ? "Video" : "In person"}</span>
          </span>
          <span className="text-muted-foreground font-medium text-xs">
            {person?.address || "Clinic Facility"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {isVideo && isToday(apptDate) && (
            <Button asChild size="sm" variant="success" className="min-h-[44px]">
            <Link to={`/video-call/${app.id}`}>Join</Link>
            </Button>
          )}
          {isProvider && app.status === "pending" && (
            <>
              <Button size="sm" onClick={() => acceptAppointment.mutate(app.id)} className="min-h-[44px]">
              Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => declineAppointment.mutate(app.id)} className="min-h-[44px] text-destructive hover:text-destructive">
              Decline
              </Button>
            </>
          )}
          {isProvider && app.status !== "pending" && (
            <Button size="sm" variant="secondary" onClick={() => completeAppointment.mutate(app.id)} className="min-h-[44px]">
            Done
            </Button>
          )}
          {isProvider && (
            <Button size="sm" variant="outline" onClick={() => openReschedule(app)} className="min-h-[44px]">
            Reschedule
            </Button>
          )}
          {isProvider && ["scheduled", "confirmed"].includes(app.status) && (isToday(apptDate) || apptDateTime(app).getTime() <= Date.now()) && (
            <MarkNoShowButton appointmentId={app.id} />
          )}
          <Button size="sm" variant="ghost" onClick={() => setCancelTarget(app)} className="min-h-[44px] text-muted-foreground">
          Cancel
          </Button>
        </div>
      </div>
    );
  };

  const renderPastMobileCard = (app: any) => {
    const person = isProvider ? app.patient : app.provider;
    const apptDate = parseISO(app.date);
    return (
      <div
        key={app.id}
        className="px-1 py-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground">
              {isProvider
                ? `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Patient'
                : providerDisplayName({ first_name: person?.first_name, last_name: person?.last_name, role: (person as any)?.role })}
            </div>
            {isProvider && (
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Ref {bookingRef(app)}</div>
            )}
            {!isProvider && person?.specialty && (
              <div className="text-xs text-muted-foreground font-medium mt-0.5">{person.specialty}</div>
            )}
            {!isProvider && (person?.consultation_fee_min || isVideoAppointment(app)) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {person?.consultation_fee_min && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <Wallet className="h-2.5 w-2.5" aria-hidden /> From K{person.consultation_fee_min}
                  </span>
                )}
                {isVideoAppointment(app) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <Video className="h-2.5 w-2.5" aria-hidden /> Telemedicine
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0">{getStatusPill(app.status)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs">
          <span className="tnum text-muted-foreground">
            {format(apptDate, "MMM d, yyyy")} • {app.time}
          </span>
          <span className="text-slate-500">
            {isVideoAppointment(app) ? "Video visit" : "In person"}
          </span>
          <span className="text-slate-500">
            {person?.address || "To be confirmed"}
          </span>
        </div>

        {!isProvider && app.provider_id && (
          <div className="mt-3">
            <Button size="sm" onClick={() => navigate(`/provider/${app.provider_id}`)} className="min-h-[44px]">
            Re-book
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <NetworkErrorBoundary>
      <div className="pb-16">
        {/* Top Header */}
        <div className="doc-page-header px-4 sm:px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5 text-foreground">
                  {isProvider ? "Appointment Workspace" : "My Appointments"}
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isProvider ? "Manage clinic visits, video consultations & e-intake" : "Upcoming visits, video links & prescription notes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isProvider && (
                <Button onClick={() => navigate("/search")} className="gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  <span>Book new appointment</span>
                </Button>
              )}
            </div>
          </div>

          {/* Views & Filters Bar */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
            {/* Filter inputs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] sm:min-w-[300px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search name, specialty, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Board Body */}
        <div className="pt-6">
          {isLoading ? (
            <div role="status" aria-label="Loading appointments">
              <SkeletonAppointmentsBoard />
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

              {/* Upcoming Appointments Table Group */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success-500" />
                      <h2 className="font-semibold text-sm text-foreground">
                        Upcoming &amp; Active Appointments
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-card border border-border text-muted-foreground tnum">
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
                  <>
                  <div className="sm:hidden divide-y divide-border px-4">
                    {upcoming.map((app) => renderUpcomingMobileCard(app))}
                  </div>
                  <div className="hidden sm:block w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
                          <th className="py-3 px-6 w-[240px]">Participant</th>
                          <th className="py-3 px-3 w-[140px] text-center">Status</th>
                          <th className="py-3 px-3 w-[150px]">Date & Time</th>
                          <th className="py-3 px-3 w-[130px]">Consult Mode</th>
                          <th className="py-3 px-3 w-[180px]">Location / Contact</th>
                          <th className="py-3 px-3 w-[150px] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {upcoming.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const isVideo = isVideoAppointment(app);
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold text-xs flex items-center justify-center flex-shrink-0 uppercase">
                                    {person?.first_name?.[0]}{person?.last_name?.[0]}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm text-foreground">
                                      {isProvider
                                        ? `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Patient'
                                        : providerDisplayName({ first_name: person?.first_name, last_name: person?.last_name, role: (person as any)?.role })}
                                    </div>
                                    {isProvider && (
                                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Ref {bookingRef(app)}</div>
                                    )}
                                    {!isProvider && person?.specialty && (
                                      <div className="text-xs text-muted-foreground font-medium">{person.specialty}</div>
                                    )}
                                    {/* New: fee + telemedicine + wait time for patient view */}
                                    {!isProvider && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(person?.consultation_fee_min || person?.consultation_fee_max) && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                                            <Wallet className="h-2.5 w-2.5" aria-hidden /> {person.consultation_fee_min && person.consultation_fee_max
                                              ? `K${person.consultation_fee_min}–K${person.consultation_fee_max}`
                                              : `From K${person.consultation_fee_min ?? person.consultation_fee_max}`}
                                          </span>
                                        )}
                                        {isVideo && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                                            <Video className="h-2.5 w-2.5" aria-hidden /> Telemedicine
                                          </span>
                                        )}
                                        {person?.typical_wait_time && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                                            <Clock className="h-2.5 w-2.5" aria-hidden /> {person.typical_wait_time}
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

                              <td className="py-4 px-3 tnum font-medium text-foreground">
                                <div>{format(apptDate, "MMM d, yyyy")}</div>
                                <div className="text-xs text-muted-foreground">{app.time}</div>
                              </td>

                              <td className="py-4 px-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-muted text-muted-foreground">
                                  {isVideo ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                  <span>{isVideo ? "Video" : "In person"}</span>
                                </span>
                              </td>

                              <td className="py-4 px-3 text-muted-foreground truncate max-w-[180px]">
                                {person?.address || "Clinic Facility"}
                              </td>

                              <td className="py-4 px-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {isVideo && isToday(apptDate) && (
                                    <Button asChild size="sm" variant="success" className="min-h-[44px]">
                                    <Link to={`/video-call/${app.id}`}>Join</Link>
                                    </Button>
                                  )}
                                  {isProvider && app.status === "pending" && (
                                    <>
                                      <Button size="sm" onClick={() => acceptAppointment.mutate(app.id)} className="min-h-[44px]">
                                      Accept
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => declineAppointment.mutate(app.id)} className="min-h-[44px] text-destructive hover:text-destructive">
                                      Decline
                                      </Button>
                                    </>
                                  )}
                                  {isProvider && app.status !== "pending" && (
                                    <Button size="sm" variant="secondary" onClick={() => completeAppointment.mutate(app.id)} className="min-h-[44px]">
                                    Done
                                    </Button>
                                  )}
                                  {isProvider && (
                                    <Button size="sm" variant="outline" onClick={() => openReschedule(app)} className="min-h-[44px]">
                                    Reschedule
                                    </Button>
                                  )}
                                  {isProvider && ["scheduled", "confirmed"].includes(app.status) && (isToday(apptDate) || apptDateTime(app).getTime() <= Date.now()) && (
                                    <MarkNoShowButton appointmentId={app.id} />
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => setCancelTarget(app)} className="min-h-[44px] text-muted-foreground">
                                  Cancel
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>

              {/* Past Appointments Group */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-sm text-foreground">
                      Past &amp; Completed
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-card border border-border text-muted-foreground tnum">
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
                      actionLabel={isProvider ? undefined : "Browse Doctors"}
                      onAction={isProvider ? undefined : () => navigate('/search')}
                    />
                  </div>
                ) : (
                  <>
                  <div className="sm:hidden divide-y divide-border px-4">
                    {past.map((app) => renderPastMobileCard(app))}
                  </div>
                  <div className="hidden sm:block w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
                          <th className="py-2.5 px-4 w-[240px]">Participant</th>
                          <th className="py-2.5 px-3 w-[140px] text-center">Status</th>
                          <th className="py-2.5 px-3 w-[150px]">Date & Time</th>
                          <th className="py-2.5 px-3 w-[130px]">Consult Mode</th>
                          <th className="py-2.5 px-3 w-[180px]">Location</th>
                          <th className="py-2.5 px-3 w-[150px] text-center">Re-Book</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {past.map((app) => {
                          const person = isProvider ? app.patient : app.provider;
                          const apptDate = parseISO(app.date);

                          return (
                            <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4 font-medium text-foreground">
                                <div>
                                  <div>{isProvider
                                    ? `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Patient'
                                    : providerDisplayName({ first_name: person?.first_name, last_name: person?.last_name, role: (person as any)?.role })}</div>
                                  {isProvider && (
                                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">Ref {bookingRef(app)}</div>
                                  )}
                                  {!isProvider && person?.specialty && (
                                    <div className="text-xs text-muted-foreground font-medium mt-0.5">{person.specialty}</div>
                                  )}
                                  {!isProvider && (person?.consultation_fee_min || isVideoAppointment(app)) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {person?.consultation_fee_min && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                                          <Wallet className="h-2.5 w-2.5" aria-hidden /> From K{person.consultation_fee_min}
                                        </span>
                                      )}
                                      {isVideoAppointment(app) && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                                          <Video className="h-2.5 w-2.5" aria-hidden /> Telemedicine
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                {getStatusPill(app.status)}
                              </td>

                              <td className="py-3 px-3 tnum text-muted-foreground">
                                {format(apptDate, "MMM d, yyyy")} • {app.time}
                              </td>

                              <td className="py-3 px-3 text-muted-foreground">
                                {isVideoAppointment(app) ? "Video visit" : "In person"}
                              </td>

                              <td className="py-3 px-3 text-muted-foreground truncate max-w-[180px]">
                                {person?.address || "To be confirmed"}
                              </td>

                              <td className="py-3 px-3 text-center">
                                {!isProvider && app.provider_id && (
                                  <Button size="sm" onClick={() => navigate(`/provider/${app.provider_id}`)} className="min-h-[44px]">
                                  Re-book
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule dialog — provider moves an upcoming appointment to a new
          slot. Validated against working hours + double-booking; the patient
          is notified automatically. */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Reschedule appointment
            </DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Currently{" "}
                <span className="font-semibold text-foreground">
                  {rescheduleTarget.date ? format(parseISO(rescheduleTarget.date), "MMM d, yyyy") : ""} at {rescheduleTarget.time || "—"}
                </span>
                {rescheduleTarget.patient && (
                  <> with {rescheduleTarget.patient.first_name} {rescheduleTarget.patient.last_name}</>
                )}
                . Choose the new slot below.
              </p>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">New date</label>
                <Input
                  type="date"
                  value={newDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setNewDate(e.target.value)}
                  
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">New time</label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  
                />
              </div>
              {providerAvailability.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Working days:{" "}
                  {[...new Set(providerAvailability.map((r: any) => r.day_of_week))]
                    .sort()
                    .map((d: any) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                    .join(", ")}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => rescheduleAppointment.mutate()}
              disabled={rescheduleAppointment.isPending}
            >
              {rescheduleAppointment.isPending ? "Moving…" : "Confirm new slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation — consistent with AppointmentDetails */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will free the slot for other patients. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="min-h-[44px]">
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              onClick={() => { cancelAppointment.mutate(cancelTarget.id); setCancelTarget(null); }}
              disabled={cancelAppointment.isPending}
              className="min-h-[44px]"
            >
              {cancelAppointment.isPending ? "Cancelling…" : "Yes, cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NetworkErrorBoundary>
  );
};

export default AppointmentsPage;

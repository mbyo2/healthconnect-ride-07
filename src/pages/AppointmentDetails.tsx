import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, Video, FileText, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { providerDisplayName } from "@/utils/providerDisplay";

interface AppointmentData {
  id: string;
  date: string;
  time: string;
  patient: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  } | null;
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
    address?: string;
    role?: string;
  } | null;
  status: string;
  notes?: string;
  reason?: string;
  type: string;
  provider_id: string;
}

export const AppointmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  // NOTE: there is no provider_time_slots FK from appointments and the
  // `profiles!patient_id` / `profiles!provider_id` join hints are invalid, so
  // the appointment row and the provider profile are fetched separately.
  const fetchAppointment = async () => {
    if (!id) return;

    try {
      const { data: appt, error } = await supabase
        .from("appointments" as any)
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, specialty, role")
        .eq("id", (appt as any).provider_id)
        .maybeSingle();

      setAppointment({ ...(appt as any), provider: providerProfile ?? null, patient: null });
      setNotes((appt as any)?.notes || "");
    } catch (error) {
      console.error("Error fetching appointment:", error);
      toast.error("Failed to load appointment details");
    } finally {
      setLoading(false);
    }
  };

  const updateNotes = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("appointments" as any)
        .update({ notes })
        .eq("id", id);

      if (error) throw error;

      toast.success("Notes updated successfully");
      fetchAppointment();
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Failed to update notes");
    }
  };

  const cancelAppointment = async () => {
    if (!id) return;
    // NOTE: appointments has no cancellation_reason column — only the status
    // is written. (DB-side: add the column or keep reason client-side only.)
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("appointments" as any)
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Appointment cancelled");
      setShowCancelDialog(false);
      navigate("/appointments");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-white bg-success-500">Completed</span>;
      case "cancelled":
        return <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-white bg-error-500">Cancelled</span>;
      default:
        return <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-white bg-primary-400">Scheduled</span>;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading appointment details..." />;
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk text-center space-y-3">
          <Calendar className="h-12 w-12 mx-auto text-primary-500" />
          <h3 className="text-lg font-extrabold">Appointment Record Not Found</h3>
          <button
            onClick={() => navigate("/appointments")}
            className="px-4 py-2 rounded-md bg-primary-500 text-white font-bold text-xs"
          >
            Return to Appointments Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/appointments")}
              aria-label="Back to appointments"
              className="p-2 rounded-lg bg-canvas-mist dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Appointment Record #{appointment.id.slice(0, 8)}</h1>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
                {appointment.patient
                  ? `Patient: ${appointment.patient.first_name} ${appointment.patient.last_name}`
                  : appointment.provider
                    ? `Provider: ${providerDisplayName({ first_name: appointment.provider.first_name, last_name: appointment.provider.last_name, role: appointment.provider.role })}`
                    : "Appointment"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {appointment.status !== "cancelled" && appointment.status !== "completed" && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="px-3.5 py-1.5 rounded-md border border-error-500/40 text-error-500 font-bold text-xs hover:bg-error-500/10 transition-colors flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel appointment
              </button>
            )}
            <div>{getStatusPill(appointment.status)}</div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Appointment Information Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="font-extrabold text-base flex items-center gap-2 border-b border-canvas-silk pb-3">
              <Calendar className="h-5 w-5 text-primary-500" />
              Appointment Information
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-bold text-graphite-500 dark:text-slate-400 uppercase">Date</div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {format(new Date(`${appointment.date}T00:00:00`), "EEEE, MMMM d, yyyy")}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-bold text-graphite-500 dark:text-slate-400 uppercase">Time</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {String(appointment.time).slice(0, 5)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Video className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-bold text-graphite-500 dark:text-slate-400 uppercase">Consultation Type</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {appointment.type === "video_consultation" ? "Video Consultation" : "In-Person Visit"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Info */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="font-extrabold text-base flex items-center gap-2 border-b border-canvas-silk pb-3">
              <User className="h-5 w-5 text-primary-500" />
              Participant Details
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-bold text-graphite-500 dark:text-slate-400 uppercase">Full Name</div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {appointment.patient
                    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                    : appointment.provider
                      ? providerDisplayName({ first_name: appointment.provider.first_name, last_name: appointment.provider.last_name, role: appointment.provider.role })
                      : "Provider"}
                </div>
              </div>

              {appointment.provider?.specialty && (
                <div>
                  <div className="font-bold text-graphite-500 dark:text-slate-400 uppercase">Clinical Specialty</div>
                  <div className="font-bold text-primary-500">{appointment.provider.specialty}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Notes Section */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs space-y-3">
          <h2 className="font-extrabold text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            Clinical Notes & Observations
          </h2>
          <textarea
            rows={4}
            className="w-full p-3 rounded-xl border border-graphite-300 dark:border-slate-700 dark:border-slate-800 bg-canvas dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter clinical observations, symptoms, or instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={updateNotes}
            className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs transition-all"
          >
            Save Clinical Notes
          </button>
        </div>
      </div>

      {/* Cancel confirmation — the old cancel/reschedule dialogs were never
          reachable; this one is wired to the header button. */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
            <DialogDescription>
              This will free the slot for other patients. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowCancelDialog(false)}
              className="px-4 py-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-xs"
            >
              Keep appointment
            </button>
            <button
              onClick={cancelAppointment}
              disabled={cancelling}
              className="px-4 py-2 rounded-md bg-error-500 hover:bg-error-600 text-white font-extrabold text-xs disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDetails;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, MapPin, Phone, Mail, Video, FileText, X, Edit, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingScreen } from "@/components/LoadingScreen";

interface AppointmentData {
  id: string;
  time_slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
  patient: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
    address?: string;
  };
  status: string;
  notes?: string;
  reason?: string;
  type: string;
  provider_id: string;
  time_slot_id: string;
}

export const AppointmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  useEffect(() => {
    if (showRescheduleDialog && appointment?.provider_id) {
      fetchAvailableSlots();
    }
  }, [showRescheduleDialog, appointment?.provider_id]);

  const fetchAvailableSlots = async () => {
    if (!appointment?.provider_id) return;
    setFetchingSlots(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("provider_time_slots" as any)
        .select("*")
        .eq("provider_id", appointment.provider_id)
        .eq("status", "available")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast.error("Failed to load available time slots");
    } finally {
      setFetchingSlots(false);
    }
  };

  const fetchAppointment = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("appointments" as any)
        .select(`
          *,
          time_slot:provider_time_slots(*),
          patient:profiles!patient_id(first_name, last_name, email, phone),
          provider:profiles!provider_id(first_name, last_name, specialty, address)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setAppointment(data as any);
      setNotes((data as any)?.notes || "");
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
    if (!id || !cancelReason) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    try {
      const { error } = await supabase
        .from("appointments" as any)
        .update({
          status: "cancelled",
          cancellation_reason: cancelReason,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Appointment cancelled");
      setShowCancelDialog(false);
      navigate("/appointments");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Completed</span>;
      case "cancelled":
        return <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Cancelled</span>;
      default:
        return <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">Scheduled</span>;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading appointment details..." />;
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-center space-y-3">
          <Calendar className="h-12 w-12 mx-auto text-[#0073ea]" />
          <h3 className="text-lg font-extrabold">Appointment Record Not Found</h3>
          <button
            onClick={() => navigate("/appointments")}
            className="px-4 py-2 rounded-md bg-[#0073ea] text-white font-bold text-xs"
          >
            Return to Appointments Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/appointments")}
              className="p-2 rounded-lg bg-[#f0f2f7] dark:bg-slate-800 hover:bg-[#e5f0ff] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Appointment Record #{appointment.id.slice(0, 8)}</h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                {appointment.patient ? `Patient: ${appointment.patient.first_name} ${appointment.patient.last_name}` : `Doctor: Dr. ${appointment.provider.first_name}`}
              </p>
            </div>
          </div>

          <div>{getStatusPill(appointment.status)}</div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Appointment Information Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="font-extrabold text-base flex items-center gap-2 border-b border-[#e6e9ef] pb-3">
              <Calendar className="h-5 w-5 text-[#0073ea]" />
              Appointment Information
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-bold text-[#676879] uppercase">Date</div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {format(new Date(appointment.time_slot.date), "EEEE, MMMM d, yyyy")}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-bold text-[#676879] uppercase">Time Span</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {appointment.time_slot.start_time} - {appointment.time_slot.end_time}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Video className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-bold text-[#676879] uppercase">Consultation Type</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {appointment.type === "video_consultation" ? "Video Consultation" : "In-Person Visit"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Info */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="font-extrabold text-base flex items-center gap-2 border-b border-[#e6e9ef] pb-3">
              <User className="h-5 w-5 text-[#0073ea]" />
              Participant Details
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-bold text-[#676879] uppercase">Full Name</div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {appointment.patient
                    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                    : `Dr. ${appointment.provider.first_name} ${appointment.provider.last_name}`}
                </div>
              </div>

              {appointment.provider.specialty && (
                <div>
                  <div className="font-bold text-[#676879] uppercase">Clinical Specialty</div>
                  <div className="font-bold text-[#0073ea]">{appointment.provider.specialty}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Notes Section */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs space-y-3">
          <h2 className="font-extrabold text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0073ea]" />
            Clinical Notes & Observations
          </h2>
          <textarea
            rows={4}
            className="w-full p-3 rounded-xl border border-[#c3c6d4] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
            placeholder="Enter clinical observations, symptoms, or instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={updateNotes}
            className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all"
          >
            Save Clinical Notes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserX, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { dispatchNotification } from "@/hooks/useNotifications";
import { friendlyErrorMessage } from "@/utils/friendly-error";

/**
 * No-show workflow (Epic parity)
 * Staff mark appointments as no-show WITH a reason (stored in
 * appointments.no_show_reason / no_show_at / follow_up_status — columns added
 * by migration 20261020_no_show_columns.sql) and manage follow-up: the
 * Reschedule and Contact actions write real follow-up state and send the
 * patient a real in-app notification. No toast-only stubs.
 */

const NO_SHOW_REASONS = [
  "Patient did not arrive",
  "Patient arrived too late to be seen",
  "No communication from patient",
  "Patient forgot the appointment",
  "Transport difficulty (patient reported)",
  "Personal emergency (patient reported)",
  "Other",
];

async function markAppointmentNoShow(appointmentId: string, reason: string) {
  const { error } = await (supabase as any)
    .from("appointments")
    .update({
      status: "no_show",
      no_show_at: new Date().toISOString(),
      no_show_reason: reason,
      follow_up_status: "pending",
    })
    .eq("id", appointmentId);
  if (error) throw error;
}

export function NoShowManager({ institutionId }: { institutionId?: string }) {
  const queryClient = useQueryClient();

  // Get no-show appointments — reads the real no-show columns.
  const { data: noShows, isLoading } = useQuery({
    queryKey: ["no-shows", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("id, patient_id, provider_id, date, time, status, no_show_at, no_show_reason, follow_up_status")
        .eq("status", "no_show")
        .eq("institution_id", institutionId)
        .order("no_show_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const rows = (data as any[]) || [];
      if (rows.length === 0) return [];

      const patientIds = [...new Set(rows.map((r) => r.patient_id))];
      const providerIds = [...new Set(rows.map((r) => r.provider_id))];

      const [{ data: patients }, { data: providers }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name").in("id", patientIds),
        supabase.from("profiles").select("id, first_name, last_name").in("id", providerIds),
      ]);

      const patientMap = Object.fromEntries((patients || []).map((p: any) => [p.id, p]));
      const providerMap = Object.fromEntries((providers || []).map((p: any) => [p.id, p]));

      return rows.map((r) => ({
        ...r,
        patient_name: patientMap[r.patient_id]
          ? `${patientMap[r.patient_id].first_name} ${patientMap[r.patient_id].last_name}`
          : "Unknown",
        provider_name: providerMap[r.provider_id]
          ? `Dr. ${providerMap[r.provider_id].first_name} ${providerMap[r.provider_id].last_name}`
          : "Unknown",
      }));
    },
  });

  // Reschedule follow-up: record the state AND notify the patient to rebook.
  const rescheduleMutation = useMutation({
    mutationFn: async (appt: any) => {
      const { error } = await (supabase as any)
        .from("appointments")
        .update({ follow_up_status: "reschedule_requested" })
        .eq("id", appt.id);
      if (error) throw error;
      await dispatchNotification({
        userId: appt.patient_id,
        title: "We missed you — please rebook",
        message: `You missed your appointment${appt.date ? ` on ${format(new Date(appt.date), "MMM d, yyyy")}` : ""}${appt.time ? ` at ${appt.time}` : ""} with ${appt.provider_name}. Please open Doc'O Clock to book a new time that suits you.`,
        category: "appointment",
        link: "/appointments",
        channels: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["no-shows"] });
      toast.success("Patient notified to rebook");
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Failed to request reschedule")),
  });

  // Contact follow-up: send the patient a real follow-up notification and
  // advance the follow-up state.
  const contactMutation = useMutation({
    mutationFn: async (appt: any) => {
      await dispatchNotification({
        userId: appt.patient_id,
        title: "Following up on your missed appointment",
        message: `Hi ${appt.patient_name?.split(" ")[0] || "there"}, we noticed you missed your appointment${appt.date ? ` on ${format(new Date(appt.date), "MMM d, yyyy")}` : ""} with ${appt.provider_name}. If you still need care, please book a new appointment in the app or contact the facility.`,
        category: "appointment",
        link: "/appointments",
        channels: [],
      });
      if (!appt.follow_up_status || appt.follow_up_status === "pending") {
        const { error } = await (supabase as any)
          .from("appointments")
          .update({ follow_up_status: "contacted" })
          .eq("id", appt.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["no-shows"] });
      toast.success("Follow-up sent to patient");
    },
    onError: (e: any) => toast.error(friendlyErrorMessage(e, "Failed to contact patient")),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading no-shows...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="h-4 w-4" />
          No-Show Management
          {(noShows?.length || 0) > 0 && (
            <Badge variant="destructive" className="ml-2">
              {noShows.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!noShows || noShows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No no-show appointments. Good attendance!
          </p>
        ) : (
          <div className="space-y-3">
            {noShows.map((appt: any) => (
              <div
                key={appt.id}
                className="flex items-center justify-between p-3 rounded-lg border gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">{appt.patient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {appt.provider_name}
                    {appt.date ? ` • ${format(new Date(appt.date), "MMM d, yyyy")}${appt.time ? ` ${appt.time}` : ""}` : ""}
                  </p>
                  {appt.no_show_reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">Reason: {appt.no_show_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {appt.follow_up_status === "reschedule_requested"
                      ? "Rebook requested"
                      : appt.follow_up_status === "contacted"
                        ? "Contacted"
                        : "Follow-up pending"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={rescheduleMutation.isPending}
                    onClick={() => rescheduleMutation.mutate(appt)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={contactMutation.isPending}
                    onClick={() => contactMutation.mutate(appt)}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Button + dialog to mark an appointment as no-show (provider / front-desk).
 * The dialog requires a reason; the write stores status, timestamp, reason
 * and follow_up_status='pending' on the appointment row.
 */
export function MarkNoShowButton({
  appointmentId,
  onMarked,
}: {
  appointmentId: string;
  onMarked?: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const reason = reasonDetail.trim()
        ? `${reasonCategory} — ${reasonDetail.trim()}`
        : reasonCategory;
      await markAppointmentNoShow(appointmentId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["no-shows"] });
      queryClient.invalidateQueries({ queryKey: ["provider-today-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["provider-agenda-appointments"] });
      toast.success("Marked as no-show");
      setOpen(false);
      setReasonCategory("");
      setReasonDetail("");
      onMarked?.();
    },
    onError: (e: any) => {
      toast.error(friendlyErrorMessage(e, "Failed to mark as no-show"));
    },
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <UserX className="h-3 w-3 mr-1" />
        No-show
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as no-show</DialogTitle>
            <DialogDescription>
              The patient did not attend this appointment. Record why — this is kept on the appointment for follow-up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Select value={reasonCategory} onValueChange={setReasonCategory}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {NO_SHOW_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Details (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Anything the follow-up team should know..."
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!reasonCategory || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Marking..." : "Mark No-Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

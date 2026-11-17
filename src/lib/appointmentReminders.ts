import { supabase } from "@/integrations/supabase/client";
import {
  renderTemplate,
  resolveReminderLeadHours,
} from "@/utils/sms-reminder-service";
import { formatProviderDisplayName } from "@/lib/chatSystemNote";

/**
 * In-app appointment reminders.
 *
 * When an appointment is booked, BookingModal calls
 * queueInAppAppointmentReminders() alongside the WhatsApp queue. It creates
 * ONE notifications row per scheduled lead time (kind 'reminder',
 * visible_at = the due time) for the patient. The rows stay invisible until
 * due: use-notifications / NotificationsPage filter on visible_at, and the
 * 30s poll + realtime invalidation surface them when the time arrives.
 *
 * Timing mirrors the WhatsApp path exactly: both read the patient's
 * notification_preferences and both use resolveReminderLeadHours() — the
 * same scheduled_for instants land in message_queue and in notifications.
 * The booking-time confirmation row is NOT written here: the
 * send-appointment-reminder edge function already writes it (kind
 * 'confirmation', visible immediately) — writing it here too would double
 * it. Dedupe is enforced live by the unique index on
 * (appointment_id, kind, visible_at), and every insert here upserts with
 * ignoreDuplicates, so a retried booking creates nothing twice.
 *
 * All facts come from the platform's own records (appointments +
 * profiles + healthcare_institutions rows) — never re-entered, never
 * invented. Opt-outs are respected exactly like the WhatsApp path.
 * Best-effort and never throws: the booking already succeeded.
 */

export interface InAppReminderSlot {
  /** When this reminder becomes visible/unread in-app. */
  when: Date;
  /** Lead time in hours before the appointment. */
  leadHours: number;
}

/**
 * Scheduled in-app reminder times for an appointment, from the patient's
 * prefs. Past times are dropped (same rule as the WhatsApp queue).
 */
export function getInAppReminderTimes(
  prefs: {
    appointment_reminder_hours?: number | null;
    second_reminder_hours?: number | null;
  } | null | undefined,
  appointmentDate: Date,
  now: Date = new Date(),
): InAppReminderSlot[] {
  return resolveReminderLeadHours(prefs ?? {})
    .map((leadHours) => ({
      leadHours,
      when: new Date(appointmentDate.getTime() - leadHours * 3600_000),
    }))
    .filter((slot) => slot.when.getTime() > now.getTime())
    .sort((a, b) => a.when.getTime() - b.when.getTime());
}

export interface ReminderNotificationRow {
  user_id: string;
  title: string;
  message: string;
  type: "appointment";
  read: false;
  appointment_id: string;
  kind: "reminder";
  visible_at: string;
}

/** Pure row builder (unit-tested): one row per due slot, same facts. */
export function buildReminderNotificationRows(args: {
  patientId: string;
  appointmentId: string;
  patientName: string;
  providerName: string;
  facilityName?: string;
  appointmentDate: Date;
  slots: InAppReminderSlot[];
}): ReminderNotificationRow[] {
  return args.slots.map((slot) => ({
    user_id: args.patientId,
    title: "Appointment reminder",
    message: renderTemplate(
      "Reminder: you have an appointment with {doctor} at {facility} on {date} at {time}.",
      {
        patientName: args.patientName,
        facility: args.facilityName,
        doctor: args.providerName,
        date: args.appointmentDate.toLocaleDateString("en-GB"),
        time: args.appointmentDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ),
    type: "appointment",
    read: false,
    appointment_id: args.appointmentId,
    kind: "reminder",
    visible_at: slot.when.toISOString(),
  }));
}

/**
 * Create the scheduled in-app reminder rows for a booked appointment.
 * Returns how many rows were newly created (0 when opted out, in the
 * past, or already present). Never throws.
 */
export async function queueInAppAppointmentReminders(args: {
  appointmentId: string;
}): Promise<number> {
  try {
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, provider_id, date, time, institution_id")
      .eq("id", args.appointmentId)
      .maybeSingle();
    if (apptError || !appointment) return 0;
    const appt = appointment as unknown as {
      id: string;
      patient_id: string;
      provider_id: string;
      date: string;
      time: string;
      institution_id: string | null;
    };

    const [patientRes, providerRes, prefsRes, facilityRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", appt.patient_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", appt.provider_id)
          .maybeSingle(),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("patient_id", appt.patient_id)
          .maybeSingle(),
        appt.institution_id
          ? supabase
              .from("healthcare_institutions")
              .select("name")
              .eq("id", appt.institution_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const prefs = (prefsRes.data as unknown as {
      appointment_reminders?: boolean | null;
      appointment_reminder_hours?: number | null;
      second_reminder_hours?: number | null;
    } | null) || {};
    if (prefs.appointment_reminders === false) return 0;

    const appointmentDate = new Date(`${appt.date}T${appt.time}`);
    if (Number.isNaN(appointmentDate.getTime())) return 0;
    const slots = getInAppReminderTimes(prefs, appointmentDate);
    if (slots.length === 0) return 0;

    const patient = (patientRes.data as unknown as {
      first_name?: string | null;
      last_name?: string | null;
    } | null) || {};
    const provider = (providerRes.data as unknown as {
      first_name?: string | null;
      last_name?: string | null;
      role?: string | null;
    } | null) || {};
    const facility = (facilityRes.data as unknown as {
      name?: string | null;
    } | null) || {};

    const rows = buildReminderNotificationRows({
      patientId: appt.patient_id,
      appointmentId: appt.id,
      patientName:
        `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
        "Patient",
      providerName: formatProviderDisplayName(
        provider.first_name,
        provider.last_name,
        provider.role,
      ),
      facilityName: facility.name || undefined,
      appointmentDate,
      slots,
    });

    const { data, error } = await supabase
      .from("notifications")
      .upsert(rows as never, {
        onConflict: "appointment_id,kind,visible_at",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      console.error("Failed to queue in-app reminders:", error);
      return 0;
    }
    return (data as unknown[] | null)?.length ?? 0;
  } catch (err) {
    console.error("Failed to queue in-app reminders:", err);
    return 0;
  }
}

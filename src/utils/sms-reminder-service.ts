import { supabase } from "@/integrations/supabase/client";

/**
 * SMS/WhatsApp Reminder Service (Doc'O Clock gap-analysis #1 — Zambia-critical)
 * Queues messages into message_queue; the send-messages edge function drains it
 * via Africa's Talking (primary, best Zambia coverage) or Twilio (fallback).
 *
 * Why a queue: reminders must survive failures, respect opt-outs, and be
 * auditable. The client NEVER sends directly.
 */

export interface ReminderContext {
  patientName: string;
  facility?: string;
  doctor?: string;
  date?: string;
  time?: string;
  [key: string]: string | undefined;
}

/** Render a template like "Hello {patient_name}..." with context values. */
export function renderTemplate(template: string, ctx: ReminderContext): string {
  const map: Record<string, string> = {
    patient_name: ctx.patientName,
    facility: ctx.facility || "your facility",
    doctor: ctx.doctor || "your doctor",
    date: ctx.date || "",
    time: ctx.time || "",
  };
  return template.replace(/\{(\w+)\}/g, (m, key) => map[key] ?? ctx[key] ?? m);
}

/** Normalize a Zambian phone number to E.164 (+260...). Returns null if invalid. */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+260")) return digits;
  if (digits.startsWith("260")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+260${digits.slice(1)}`;
  if (digits.length === 9) return `+260${digits}`;
  // Other international numbers pass through if they look complete
  if (digits.startsWith("+") && digits.length >= 11) return digits;
  return null;
}

interface QueueOptions {
  patientId: string;
  phone: string;
  channel: "sms" | "whatsapp" | "email";
  templateKey: string;
  messageBody: string;
  institutionId?: string;
  appointmentId?: string;
  referenceType?: string;
  referenceId?: string;
  scheduledFor?: Date;
}

/** Queue a single message for delivery. Returns the queue row id, or null on failure. */
export async function queueSmsMessage(opts: QueueOptions): Promise<string | null> {
  const phone = normalizePhone(opts.phone);
  if (!phone && opts.channel !== "email") return null;

  const { data, error } = await supabase
    .from("message_queue")
    .insert({
      patient_id: opts.patientId,
      phone_number: phone || opts.phone,
      channel: opts.channel,
      template_key: opts.templateKey,
      message_body: opts.messageBody,
      institution_id: opts.institutionId || null,
      appointment_id: opts.appointmentId || null,
      reference_type: opts.referenceType || null,
      reference_id: opts.referenceId || null,
      scheduled_for: (opts.scheduledFor || new Date()).toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to queue message:", error);
    return null;
  }
  return (data as any)?.id ?? null;
}

/**
 * Queue appointment reminders for a patient based on their preferences.
 * Schedules at their chosen lead times (default 24h and 2h before).
 * Returns the number of messages queued.
 */
export async function queueAppointmentReminders(args: {
  patientId: string;
  patientPhone: string;
  patientName: string;
  appointmentId: string;
  appointmentDate: Date;
  institutionId?: string;
  institutionName?: string;
  doctorName?: string;
  template?: string;
}): Promise<number> {
  // Respect opt-outs
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("patient_id", args.patientId)
    .maybeSingle();

  const p = (prefs as any) || {};
  if (p.appointment_reminders === false) return 0;

  const phone = p.preferred_phone || args.patientPhone;
  // WhatsApp-first (CEO directive 2026-10-20): Meta Cloud API is the live
  // channel. WhatsApp queues unless the patient opted out. SMS queues only
  // on explicit opt-in — it has no configured provider yet, so default
  // SMS rows would only burn their retries and die before keys arrive.
  const channels: ("sms" | "whatsapp")[] = [];
  if (p.whatsapp_enabled !== false) channels.push("whatsapp");
  if (p.sms_enabled === true) channels.push("sms");
  if (channels.length === 0) channels.push("whatsapp");

  const template =
    args.template ||
    "Hello {patient_name}, reminder: you have an appointment at {facility} on {date} at {time} with {doctor}. Reply STOP to opt out.";
  const body = renderTemplate(template, {
    patientName: args.patientName,
    facility: args.institutionName,
    doctor: args.doctorName,
    date: args.appointmentDate.toLocaleDateString("en-GB"),
    time: args.appointmentDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  const leadHours: number[] = [p.appointment_reminder_hours ?? 24];
  if (p.second_reminder_hours) leadHours.push(p.second_reminder_hours);

  let queued = 0;
  const now = Date.now();
  for (const hours of leadHours) {
    const when = new Date(args.appointmentDate.getTime() - hours * 3600_000);
    if (when.getTime() < now) continue; // don't schedule in the past
    for (const channel of channels) {
      const id = await queueSmsMessage({
        patientId: args.patientId,
        phone,
        channel,
        templateKey: "appointment_reminder",
        messageBody: body,
        institutionId: args.institutionId,
        appointmentId: args.appointmentId,
        referenceType: "appointment",
        referenceId: args.appointmentId,
        scheduledFor: when,
      });
      if (id) queued++;
    }
  }
  return queued;
}

/** Queue a lab-result-ready alert. Respects patient opt-out. */
export async function queueLabResultAlert(args: {
  patientId: string;
  patientPhone: string;
  patientName: string;
  institutionId?: string;
  institutionName?: string;
  template?: string;
}): Promise<boolean> {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("patient_id", args.patientId)
    .maybeSingle();
  const p = (prefs as any) || {};
  if (p.lab_result_alerts === false) return false;

  const body = renderTemplate(
    args.template ||
      "Hello {patient_name}, your lab results are ready at {facility}. Please visit or check the Doc'O Clock app.",
    { patientName: args.patientName, facility: args.institutionName }
  );

  const id = await queueSmsMessage({
    patientId: args.patientId,
    phone: p.preferred_phone || args.patientPhone,
    channel: p.whatsapp_enabled !== false ? "whatsapp" : "email",
    templateKey: "lab_result_ready",
    messageBody: body,
    institutionId: args.institutionId,
    referenceType: "lab_result",
  });
  return !!id;
}

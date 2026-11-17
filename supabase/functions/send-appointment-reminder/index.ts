import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(authHeader.replace('Bearer ', '')); // Explicit JWT: no-arg getUser() ignores the global Authorization header on supabase-js 2.7.1 and 401s every valid user (same F1 defect class fixed in process-wallet-payment/doc-chat)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { appointment_id } = await req.json();
    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: "Missing appointment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`id, date, time, type, patient_id, provider_id, institution_id, created_at, profiles:provider_id(first_name, last_name, role)`)
      .eq("id", appointment_id)
      .maybeSingle();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ownership check — only participants can trigger reminders
    if (appointment.provider_id !== user.id && appointment.patient_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profiles = appointment.profiles as { first_name: string; last_name: string; role?: string } | null;
    const DOCTORAL = new Set(['doctor', 'specialist', 'dentist', 'medical_licentiate', 'radiologist', 'pathologist', 'health_personnel']);
    const providerName = profiles
      ? `${profiles.role && DOCTORAL.has(String(profiles.role).toLowerCase()) ? 'Dr. ' : ''}${profiles.first_name} ${profiles.last_name}`.trim()
      : "Your Provider";
    const appointmentDate = new Date(appointment.date).toLocaleDateString();

    // Booking-time confirmation, in-app (NotificationCenter bell + /notifications).
    // DEDUPED: upsert on (appointment_id, kind, visible_at) — visible_at is
    // the appointment's created_at, a fixed instant, so a retried booking or
    // a second caller (BookingModal + TriageIntake) creates no second row.
    // The scheduled reminder rows (kind 'reminder', visible at their due
    // time) are written by the client helper src/lib/appointmentReminders.ts,
    // not here. The WhatsApp queue is untouched.
    const { data: notification } = await supabase
      .from("notifications")
      .upsert({
        user_id: appointment.patient_id,
        title: "Appointment Reminder",
        message: `You have an appointment with ${providerName} on ${appointmentDate} at ${appointment.time}`,
        type: "appointment",
        read: false,
        appointment_id: appointment.id,
        kind: "confirmation",
        visible_at: appointment.created_at,
      }, { onConflict: "appointment_id,kind,visible_at", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();

    // System note in the patient<->provider chat thread. The browser client
    // cannot write it (messages INSERT requires auth.uid() = sender_id, and
    // sender_id FKs to profiles), so the platform writes it here under the
    // service role. Convention owned by src/lib/chatSystemNote.ts — keep the
    // marker and text in sync with that file. Delivered in the provider's
    // slot so the existing 1:1 ChatWindow query renders it today; the
    // content is explicit that it is a Doc'O Clock reminder, not a message
    // the provider typed. Deduped by exact content: one note per booking.
    let chatNoteId: string | null = null;
    let chatNoteCreated = false;
    try {
      const [{ data: patientProfile }, { data: facility }] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", appointment.patient_id).maybeSingle(),
        appointment.institution_id
          ? supabase.from("healthcare_institutions").select("name").eq("id", appointment.institution_id).maybeSingle()
          : Promise.resolve({ data: null } as { data: { name?: string } | null }),
      ]);
      const dateLabel = new Date(appointment.date).toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      });
      const greeting = (patientProfile as { first_name?: string } | null)?.first_name
        ? `Hi ${(patientProfile as { first_name?: string }).first_name}, ` : "";
      const noteText =
        `[Doc'O Clock reminder] ${greeting}you have an appointment with ` +
        `${providerName} at ${((facility as { name?: string } | null)?.name) || "your facility"} ` +
        `on ${dateLabel} at ${appointment.time}. Please arrive 15 minutes early.`;
      const { data: existingNote } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", appointment.provider_id)
        .eq("receiver_id", appointment.patient_id)
        .eq("content", noteText)
        .maybeSingle();
      if (existingNote) {
        chatNoteId = (existingNote as { id: string }).id;
      } else {
        const { data: note } = await supabase
          .from("messages")
          .insert({
            sender_id: appointment.provider_id,
            receiver_id: appointment.patient_id,
            content: noteText,
            read: false,
          })
          .select("id")
          .single();
        chatNoteId = (note as { id: string } | null)?.id ?? null;
        chatNoteCreated = true;
      }
    } catch (noteErr) {
      // The confirmation notification already landed; a failed chat note
      // must not fail the booking confirmation.
      console.error("Chat reminder note failed (non-fatal):", noteErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification?.id ?? null,
        notification_created: !!notification?.id,
        chat_note_id: chatNoteId,
        chat_note_created: chatNoteCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-appointment-reminder:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate cron secret for authentication
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (!cronSecret || cronSecret !== expectedSecret) {
    console.log("Unauthorized request attempt - invalid or missing cron secret");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    // Service-role client: this is a scheduler worker, not a user request.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Window: appointments dated today or tomorrow that have not yet been
    // reminded (reminder_sent_at IS NULL) and are still bookable.
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: appointments, error } = await supabaseClient
      .from("appointments")
      .select(`
        id, date, time, type, status, patient_id, provider_id,
        profiles:provider_id ( first_name, last_name, role )
      `)
      .gte("date", todayStr)
      .lte("date", tomorrowStr)
      .in("status", ["scheduled", "pending", "confirmed"])
      .is("reminder_sent_at", null)
      .limit(500);

    if (error) throw error;

    const DOCTORAL = new Set(['doctor', 'specialist', 'dentist', 'medical_licentiate', 'radiologist', 'pathologist', 'health_personnel']);
    let remindersProcessed = 0;
    let remindersSkipped = 0;

    for (const appointment of appointments || []) {
      try {
        const apptDate = String((appointment as any).date);
        const apptTime = String((appointment as any).time || "09:00");
        // Skip appointments whose start time is already past.
        const startsAt = new Date(`${apptDate}T${apptTime.slice(0, 5)}:00`);
        if (!isNaN(startsAt.getTime()) && startsAt.getTime() < Date.now() - 30 * 60 * 1000) {
          remindersSkipped++;
          continue;
        }

        const provider = (appointment as any).profiles as { first_name?: string; last_name?: string; role?: string } | null;
        const providerName = provider
          ? `${provider.role && DOCTORAL.has(String(provider.role).toLowerCase()) ? 'Dr. ' : ''}${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim()
          : "your provider";
        const dayLabel = apptDate === todayStr ? "today" : "tomorrow";

        // In-app reminder — always delivered.
        const { error: notifError } = await supabaseClient.from("notifications").insert({
          user_id: (appointment as any).patient_id,
          title: "Upcoming Appointment Reminder",
          message: `Reminder: you have an appointment with ${providerName} ${dayLabel} (${apptDate} at ${apptTime}).`,
          type: "appointment",
        });
        if (notifError) throw notifError;

        // Email fan-out — best-effort, only when the patient opted in.
        // The send-email internal path re-verifies account-holder ownership.
        try {
          const { data: prefs } = await supabaseClient
            .from("notification_settings")
            .select("email_notifications")
            .eq("user_id", (appointment as any).patient_id)
            .maybeSingle();
          if (prefs?.email_notifications !== false) {
            const { data: accountUser } = await supabaseClient.auth.admin.getUserById((appointment as any).patient_id);
            const patientEmail = accountUser?.user?.email;
            if (patientEmail) {
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
                  "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "",
                },
                body: JSON.stringify({
                  type: "appointment_reminder",
                  to: [patientEmail],
                  user_id: (appointment as any).patient_id,
                  data: {
                    date: apptDate,
                    time: apptTime,
                    provider: {
                      first_name: provider?.first_name ?? "",
                      last_name: provider?.last_name ?? "",
                      honorific: provider?.role && DOCTORAL.has(String(provider.role).toLowerCase()) ? "Dr. " : "",
                    },
                  },
                }),
              });
            }
          }
        } catch (emailErr) {
          // Non-fatal: the in-app reminder already landed.
          console.error(`Reminder email failed for appointment ${(appointment as any)?.id}:`, emailErr);
        }

        const { error: markError } = await supabaseClient
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", (appointment as any).id)
          .is("reminder_sent_at", null);
        if (markError) throw markError;

        remindersProcessed++;
      } catch (perApptError) {
        // One bad row must not abort the whole run.
        console.error(`Reminder failed for appointment ${(appointment as any)?.id}:`, perApptError);
        remindersSkipped++;
      }
    }

    console.log(`Processed ${remindersProcessed} appointment reminders (${remindersSkipped} skipped)`);

    return new Response(JSON.stringify({ success: true, processed: remindersProcessed, skipped: remindersSkipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error processing reminders:", error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

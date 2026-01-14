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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get upcoming appointments
    const { data: appointments, error } = await supabaseClient
      .from("appointments")
      .select(`
        *,
        profiles!appointments_patient_id_fkey (
          email
        )
      `)
      .gte("appointment_date", new Date().toISOString())
      .lt(
        "appointment_date",
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) throw error;

    let remindersProcessed = 0;
    
    // Send email reminders
    for (const appointment of appointments || []) {
      const patientEmail = appointment.profiles?.email;
      if (!patientEmail) continue;

      // TODO: Integrate with actual email service (e.g., Resend)
      // For now, just count processed reminders without logging sensitive data
      remindersProcessed++;
    }

    console.log(`Processed ${remindersProcessed} appointment reminders`);

    return new Response(JSON.stringify({ success: true, processed: remindersProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error processing reminders:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

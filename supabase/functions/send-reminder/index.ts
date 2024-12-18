import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Send email reminders
    for (const appointment of appointments) {
      const patientEmail = appointment.profiles.email;
      if (!patientEmail) continue;

      // Send email using your preferred email service
      // For this example, we'll just log it
      console.log(`Sending reminder to ${patientEmail} for appointment on ${appointment.appointment_date}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
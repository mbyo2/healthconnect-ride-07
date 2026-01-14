
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AppointmentReminder {
  appointment_id: string;
  patient_id: string;
  provider_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { appointment_id } = requestData;

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: "Missing appointment_id" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        type,
        patient_id,
        profiles:provider_id (
          first_name,
          last_name
        )
      `)
      .eq("id", appointment_id)
      .single();

    if (appointmentError) {
      console.error("Error fetching appointment:", appointmentError);
      return new Response(
        JSON.stringify({ error: "Error fetching appointment" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Format provider name
    const profiles = appointment.profiles as { first_name: string; last_name: string } | null;
    const providerName = profiles ? `Dr. ${profiles.first_name} ${profiles.last_name}` : 'Your Provider';
    
    // Create reminder object
    const reminderData: AppointmentReminder = {
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      provider_name: providerName,
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      appointment_type: appointment.type,
    };

    // Format appointment date for display
    const appointmentDate = new Date(appointment.date).toLocaleDateString();
    
    // Send push notification to the patient
    const { data: pushSubscription, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", appointment.patient_id)
      .single();

    if (subscriptionError) {
      console.log("No push subscription found for user", appointment.patient_id);
    }

    // Store notification in the database
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: appointment.patient_id,
        title: "Appointment Reminder",
        message: `You have an appointment with ${providerName} on ${appointmentDate} at ${appointment.time}`,
        type: "appointment",
        read: false
      })
      .select("id")
      .single();

    if (notificationError) {
      console.error("Error storing notification:", notificationError);
    } else {
      console.log("Notification stored with ID:", notification.id);
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Appointment reminder sent",
        notification_id: notification?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-appointment-reminder function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

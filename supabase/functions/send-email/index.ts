
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  appointmentReminderTemplate,
  paymentConfirmationTemplate,
  registrationConfirmationTemplate,
} from "./templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EmailType = "appointment_reminder" | "payment_confirmation" | "registration_confirmation";

interface EmailRequest {
  type: EmailType;
  to: string[];
  data: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailRequest: EmailRequest = await req.json();
    console.log("Processing email request:", emailRequest);

    let subject: string;
    let html: string;

    // Generate email content based on type
    switch (emailRequest.type) {
      case "appointment_reminder":
        subject = "Appointment Reminder";
        html = appointmentReminderTemplate(emailRequest.data as { date: string; time: string; provider: { first_name: string; last_name: string; }; });
        break;
      case "payment_confirmation":
        subject = "Payment Confirmation";
        html = paymentConfirmationTemplate(emailRequest.data as { amount: number; date: string; service: string; });
        break;
      case "registration_confirmation":
        subject = "Welcome to Doc' O Clock";
        html = registrationConfirmationTemplate(emailRequest.data as { first_name: string; });
        break;
      default:
        throw new Error("Invalid email type");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Doc' O Clock <notifications@docloclock.com>",
        to: emailRequest.to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
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

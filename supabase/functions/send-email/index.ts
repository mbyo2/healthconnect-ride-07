import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  appointmentReminderTemplate,
  paymentConfirmationTemplate,
  registrationConfirmationTemplate,
} from "./templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type EmailType = "appointment_reminder" | "payment_confirmation" | "registration_confirmation";

interface EmailRequest {
  type: EmailType;
  to: string[];
  data: Record<string, any>;
  /** Internal worker calls only: the account holder who must own `to`. */
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal worker path: service-to-service calls authenticated by
    // CRON_SECRET. Restricted to the appointment_reminder template and to
    // the account holder's own verified email (checked via Admin API below),
    // so the function can never be used as an open relay.
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');
    const isInternalWorker = !!expectedCronSecret && !!cronSecret && cronSecret === expectedCronSecret;

    let user: { id: string; email?: string } | null = null;
    let isAdmin = false;
    let emailRequest: EmailRequest;

    if (isInternalWorker) {
      const parsed: EmailRequest = await req.json().catch(() => null as any);
      if (!parsed || parsed.type !== 'appointment_reminder' || !parsed.user_id) {
        return new Response(
          JSON.stringify({ error: 'Internal calls are limited to appointment_reminder with user_id' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const { data: accountUser, error: accountError } = await supabaseService.auth.admin.getUserById(parsed.user_id);
      const ownerEmail = (accountUser?.user?.email ?? '').toLowerCase();
      const requestedTo = (parsed.to || []).map(e => String(e).toLowerCase());
      if (accountError || !ownerEmail || requestedTo.some(e => e !== ownerEmail)) {
        return new Response(
          JSON.stringify({ error: 'Internal calls may only email the account holder' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Stash the verified body for the shared pipeline below.
      (req as any).__parsedBody = parsed;
      user = { id: parsed.user_id, email: ownerEmail };
      console.log('Internal worker email for user:', user.id, parsed.type);
    }

    if (!isInternalWorker) {
    // Authentication check - require valid user token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to verify user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    user = { id: authUser.id, email: authUser.email };

    console.log('Authenticated user:', user.id);

    emailRequest = await req.json();
    console.log("Processing email request from user:", user.id, emailRequest.type);
    } else {
      // Internal worker body was already parsed + ownership-verified above.
      emailRequest = (req as any).__parsedBody;
    }

    // Input validation
    if (!emailRequest.type || !emailRequest.to || !Array.isArray(emailRequest.to) || emailRequest.to.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and to (array of emails)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailRequest.to.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid email addresses: ${invalidEmails.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Anti-abuse: only allow sending to the caller's own email address, unless the
    // caller is an admin/superadmin. This prevents the function from being used as
    // an open relay by any authenticated user.
    const userEmail = (user!.email ?? '').toLowerCase();
    const requestedTo = emailRequest.to.map(e => e.toLowerCase());
    // NOTE: isAdmin stays false on the internal-worker path (ownership of the
    // single recipient was already verified via the Admin API above).
    if (!isInternalWorker) {
    try {
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('admin_level')
        .eq('id', user!.id)
        .maybeSingle();
      isAdmin = profile?.admin_level === 'admin' || profile?.admin_level === 'superadmin';
    } catch (_e) {
      isAdmin = false;
    }
    } // end user-path admin lookup (internal workers skip: recipient pre-verified)

    if (!isAdmin) {
      const forbiddenRecipients = requestedTo.filter(e => e !== userEmail);
      if (forbiddenRecipients.length > 0) {
        return new Response(
          JSON.stringify({ error: 'You may only send email to your own address' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let subject: string;
    let html: string;

    // Generate email content based on type
    switch (emailRequest.type) {
      case "appointment_reminder":
        subject = "Appointment Reminder";
        html = appointmentReminderTemplate(emailRequest.data as { date: string; time: string; provider: { first_name: string; last_name: string; honorific?: string }; });
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
        from: "Doc' O Clock <notifications@dococlock.online>",
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
    console.log("Email sent successfully by user:", user!.id, data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

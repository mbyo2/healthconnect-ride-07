
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import webpush from "https://esm.sh/web-push@3.6.6";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || Deno.env.get("WEB_PUSH_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@dococlock.online";
const vapidConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
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
    
    // Sender must hold a staff/admin role (user_roles is the source of
    // truth — profiles.role is legacy and misses the 45-role taxonomy, which
    // previously 403'd legitimate staff such as lab technologists).
    const { data: senderRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const normalizedSenderRoles = (senderRoles ?? []).map((r: any) => String(r.role).toLowerCase());
    const isSenderAdmin = normalizedSenderRoles.some((r) =>
      ["admin", "superadmin", "super_admin", "institution_admin"].includes(r)
    );
    const isSenderStaff = isSenderAdmin || normalizedSenderRoles.some((r) =>
      !["patient", "guest"].includes(r)
    );

    if (!isSenderStaff) {
      return new Response(
        JSON.stringify({ error: "Forbidden: push dispatch requires a staff role" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse payload
    const payload: PushPayload = await req.json();
    
    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    if (!payload.userId && (!payload.userIds || payload.userIds.length === 0)) {
      return new Response(
        JSON.stringify({ error: "No recipients specified" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Determine target users
    const requestedTargetIds = payload.userIds || (payload.userId ? [payload.userId] : []);

    // Sanitize title/body — reject HTML/URLs
    const suspiciousPattern = /<[^>]+>|https?:\/\/|javascript:/i;
    if (suspiciousPattern.test(payload.title) || suspiciousPattern.test(payload.body)) {
      return new Response(
        JSON.stringify({ error: "Title/body cannot contain HTML or URLs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (payload.title.length > 120 || payload.body.length > 500) {
      return new Response(
        JSON.stringify({ error: "Title or body too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Staff dispatch is audit-logged (below) with sender + recipients; admins
    // are unrestricted. NOTE: no care-relationship filter here — legitimate
    // flows such as lab-result pushes come from staff (e.g. lab
    // technologists) who hold no user_connections row with the patient.
    const targetUserIds = requestedTargetIds;

    // Audit log of the push send
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "push_notification_sent",
      resource_type: "notification",
      details: {
        title: payload.title,
        recipient_count: targetUserIds.length,
        recipient_ids: targetUserIds,
        tag: payload.tag || "general",
      },
    });

    // Fetch subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("subscription, user_id")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Error fetching subscriptions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found for the specified users" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: payload.icon || "/favicon.ico",
      tag: payload.tag || "general"
    });
    
    // One in-app record per recipient (not per device — multi-device users
    // must not get duplicate inbox rows).
    await supabase.from("notifications").insert(
      targetUserIds.map((id) => ({
        user_id: id,
        title: payload.title,
        message: payload.body,
        type: "system",
        read: false,
      }))
    );

    // Real Web Push delivery per subscription. Dead endpoints (410/404) are
    // pruned so future runs stop paying for them.
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          if (!vapidConfigured) {
            return { success: false, simulated: true, userId: sub.user_id };
          }
          await webpush.sendNotification(sub.subscription, notificationPayload);
          return { success: true, userId: sub.user_id };
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("user_id", sub.user_id);
          }
          console.error(`Error sending push to user ${sub.user_id}:`, error);
          return { success: false, userId: sub.user_id };
        }
      })
    );

    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.filter(r => r.status === 'rejected' || !(r.value as any)?.success).length;

    return new Response(
      JSON.stringify({
        message: vapidConfigured
          ? `Notifications sent: ${successful} successful, ${failed} failed`
          : `Push delivery not configured (VAPID keys missing) — in-app notifications recorded; ${failed} push(es) pending configuration`,
        simulated: !vapidConfigured,
        successful,
        failed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-push function:", error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

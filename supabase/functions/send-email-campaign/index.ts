import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const RESEND_API_KEY = Deno.env.get("RESEND");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json().catch(() => ({}));
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const svc = createClient(supabaseUrl, serviceKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await svc.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load campaign
    const { data: campaign, error: campError } = await svc
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["draft", "scheduled"].includes(campaign.status)) {
      return new Response(JSON.stringify({ error: `Campaign is already ${campaign.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is staff of the campaign's institution
    const { data: staffRoles } = await svc
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("institution_id", campaign.institution_id)
      .limit(1);
    const { data: profile } = await svc
      .from("profiles")
      .select("admin_level")
      .eq("id", user.id)
      .maybeSingle();
    const isStaff = (staffRoles && staffRoles.length > 0)
      || ["admin", "superadmin"].includes(profile?.admin_level ?? "");
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Not authorized for this institution" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as sending
    await svc.from("email_campaigns").update({ status: "sending" }).eq("id", campaign_id);

    // Resolve audience — ALWAYS excludes opted-out patients
    const audience = campaign.target_audience || {};
    let query = svc
      .from("profiles")
      .select("id, email, date_of_birth, gender")
      .eq("email_marketing_opt_out", false)
      .not("email", "is", null)
      .limit(2000);
    if (audience.gender) query = query.eq("gender", audience.gender);
    const { data: candidates, error: qError } = await query;
    if (qError) throw qError;

    let filtered = candidates || [];
    if (audience.min_age || audience.max_age) {
      const now = Date.now();
      filtered = filtered.filter((p: any) => {
        if (!p.date_of_birth) return false;
        const age = Math.floor((now - new Date(p.date_of_birth).getTime()) / 31557600000);
        if (audience.min_age && age < Number(audience.min_age)) return false;
        if (audience.max_age && age > Number(audience.max_age)) return false;
        return true;
      });
    }
    if (audience.last_visit_before) {
      const { data: appts } = await svc
        .from("appointments")
        .select("patient_id")
        .lt("appointment_date", audience.last_visit_before)
        .limit(5000);
      const visited = new Set((appts || []).map((a: any) => a.patient_id));
      filtered = filtered.filter((p: any) => visited.has(p.id));
    }

    const validRecipients = filtered.filter((p: any) => p.email && emailRegex.test(p.email));

    // Record recipients
    const recipientRows = validRecipients.map((p: any) => ({
      campaign_id,
      patient_id: p.id,
      email: p.email,
      status: "pending",
    }));
    if (recipientRows.length > 0) {
      // Insert in chunks of 500
      for (let i = 0; i < recipientRows.length; i += 500) {
        await svc.from("email_campaign_recipients").insert(recipientRows.slice(i, i + 500));
      }
    }

    // Send in small batches via Resend
    let sent = 0, failed = 0;
    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6;">${campaign.body_html}</div>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">You're receiving this because you're a patient of this facility.
        <a href="https://www.doc0clock.online/settings">Manage email preferences</a></p>
      </div>`;
    for (const r of validRecipients) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Doc' O Clock <notifications@dococlock.online>",
            to: r.email,
            subject: campaign.subject,
            html,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        sent++;
        await svc.from("email_campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("campaign_id", campaign_id)
          .eq("patient_id", r.id);
      } catch (e) {
        failed++;
        await svc.from("email_campaign_recipients")
          .update({ status: "failed", error_message: String(e).slice(0, 500) })
          .eq("campaign_id", campaign_id)
          .eq("patient_id", r.id);
      }
    }

    await svc.from("email_campaigns").update({
      status: "sent",
      sent_count: sent,
      failed_count: failed,
      updated_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ queued: validRecipients.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-email-campaign error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

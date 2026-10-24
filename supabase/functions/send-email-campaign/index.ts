import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const RESEND_API_KEY = Deno.env.get("RESEND");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal HTML sanitiser for campaign bodies (audit P1-22): strips script /
// iframe / object / embed elements, inline on* event handlers, and
// javascript: URLs before anything is handed to the mail provider.
function sanitizeHtml(html: string): string {
  let out = String(html ?? "");
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, "");
  out = out.replace(/<(script|iframe|object|embed)\b[^>]*\/?>/gi, "");
  out = out.replace(/<\/(script|iframe|object)\s*>/gi, "");
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(/javascript\s*:/gi, "");
  return out;
}

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

    // ── Caller authorisation (audit P1-22) ──────────────────────────
    // Platform admins (user_roles admin/super_admin or profiles.admin_level
    // admin/superadmin) may send to a platform-wide audience. Everyone else
    // must belong to the campaign's OWN institution — via
    // healthcare_institutions.admin_id or an active institution_staff row —
    // and their audience is scoped to that institution below. (The previous
    // check filtered user_roles by an institution_id column that does not
    // exist, so it never matched; the audience query was platform-wide.)
    const { data: roleRows } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const callerRoles = (roleRows || []).map((r: any) => String(r.role));
    const { data: profile } = await svc
      .from("profiles")
      .select("admin_level")
      .eq("id", user.id)
      .maybeSingle();
    const isPlatformAdmin = callerRoles.includes("admin")
      || callerRoles.includes("super_admin")
      || ["admin", "superadmin"].includes(profile?.admin_level ?? "");

    let isInstitutionStaff = false;
    if (!isPlatformAdmin && campaign.institution_id) {
      const { data: ownedInst } = await svc
        .from("healthcare_institutions")
        .select("id")
        .eq("id", campaign.institution_id)
        .eq("admin_id", user.id)
        .maybeSingle();
      if (ownedInst) isInstitutionStaff = true;
      if (!isInstitutionStaff) {
        const { data: staffRow } = await svc
          .from("institution_staff")
          .select("id")
          .eq("institution_id", campaign.institution_id)
          .eq("provider_id", user.id)
          .eq("is_active", true)
          .limit(1);
        if (staffRow && staffRow.length > 0) isInstitutionStaff = true;
      }
    }
    if (!isPlatformAdmin && !isInstitutionStaff) {
      return new Response(JSON.stringify({ error: "Not authorized for this institution" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as sending
    await svc.from("email_campaigns").update({ status: "sending" }).eq("id", campaign_id);

    // Resolve audience — ALWAYS excludes opted-out patients.
    // Institution scoping (audit P1-22): non-platform-admin callers may only
    // reach THEIR institution's audience. The codebase's institution-audience
    // linkage is patient_institution_links (status 'active'), unioned with
    // institution_patient_registry.linked_patient_id and patients with an
    // appointment at the institution. Platform admins keep platform-wide
    // reach. An institution with no linked patients yields an empty
    // audience — never a platform-wide fallthrough.
    const audience = campaign.target_audience || {};
    let scopedIds: string[] | null = null; // null = platform-wide (platform admin only)
    if (!isPlatformAdmin) {
      const idSet = new Set<string>();
      const { data: links } = await svc
        .from("patient_institution_links")
        .select("patient_id")
        .eq("institution_id", campaign.institution_id)
        .eq("status", "active")
        .limit(10000);
      (links || []).forEach((r: any) => idSet.add(r.patient_id));
      const { data: registry } = await svc
        .from("institution_patient_registry")
        .select("linked_patient_id")
        .eq("institution_id", campaign.institution_id)
        .not("linked_patient_id", "is", null)
        .limit(10000);
      (registry || []).forEach((r: any) => { if (r.linked_patient_id) idSet.add(r.linked_patient_id); });
      const { data: instAppts } = await svc
        .from("appointments")
        .select("patient_id")
        .eq("institution_id", campaign.institution_id)
        .limit(10000);
      (instAppts || []).forEach((r: any) => idSet.add(r.patient_id));
      scopedIds = [...idSet];
    }

    let candidates: any[] = [];
    if (scopedIds !== null && scopedIds.length === 0) {
      candidates = [];
    } else {
      let query = svc
        .from("profiles")
        .select("id, email, date_of_birth, gender")
        .eq("email_marketing_opt_out", false)
        .not("email", "is", null)
        .limit(2000);
      if (scopedIds !== null) query = query.in("id", scopedIds.slice(0, 5000));
      if (audience.gender) query = query.eq("gender", audience.gender);
      const { data: cand, error: qError } = await query;
      if (qError) throw qError;
      candidates = cand || [];
    }

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
      let apptQuery = svc
        .from("appointments")
        .select("patient_id")
        .lt("appointment_date", audience.last_visit_before)
        .limit(5000);
      if (!isPlatformAdmin) apptQuery = apptQuery.eq("institution_id", campaign.institution_id);
      const { data: appts } = await apptQuery;
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

    // Send in small batches via Resend. body_html is sanitised first
    // (audit P1-22) — campaign authors are institution staff, not a trusted
    // HTML source.
    let sent = 0, failed = 0;
    const safeBodyHtml = sanitizeHtml(campaign.body_html);
    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6;">${safeBodyHtml}</div>
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

    // Audit trail (audit P1-22): one security_audit_log row per campaign send.
    const { error: auditErr } = await svc.from("security_audit_log").insert({
      user_id: user.id,
      event_type: "email_campaign_sent",
      event_data: {
        campaign_id,
        institution: campaign.institution_id,
        audience_size: validRecipients.length,
        sent,
        failed,
        subject: campaign.subject,
        platform_admin: isPlatformAdmin,
      },
    });
    if (auditErr) console.error("send-email-campaign audit insert failed:", auditErr);

    return new Response(JSON.stringify({ queued: validRecipients.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-email-campaign error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

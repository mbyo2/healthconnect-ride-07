import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// End a video consultation FOR EVERYONE (provider/host action).
//
// Before this function existed there was no way to end a meeting at all:
// "Leave" only removed the local participant, the Daily room lived on,
// and the consultation stayed 'scheduled'/'active' forever. Ending now:
//   1. verifies the caller is the consultation's provider,
//   2. stamps the row status='completed', ended_at, ended_by — the
//      realtime UPDATE is what makes every other participant's client
//      show "The meeting has ended" and exit the call,
//   3. deletes the Daily room, which ejects anyone still inside
//      immediately (a client that missed the realtime event cannot
//      stay in a room that no longer exists).
// Idempotent: ending an already-completed visit returns success.
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { consultation_id } = (await req.json()) as { consultation_id?: string };
    if (!consultation_id) {
      return json({ error: "consultation_id is required" }, 400);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: consultation, error: consultationError } = await supabaseClient
      .from("video_consultations")
      .select("id, patient_id, provider_id, status")
      .eq("id", consultation_id)
      .maybeSingle();

    if (consultationError || !consultation) {
      return json({ error: "Consultation not found" }, 404);
    }

    // Only the consultation's provider (the host) may end it for all.
    // Patients leave their own side from the client — no server call.
    if (consultation.provider_id !== user.id) {
      return json({ error: "Only the provider can end this meeting." }, 403);
    }

    if (consultation.status !== "completed" && consultation.status !== "cancelled") {
      const { error: updateError } = await supabaseClient
        .from("video_consultations")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
          ended_by: user.id,
        })
        .eq("id", consultation_id);

      if (updateError) {
        console.error("Failed to end consultation:", updateError);
        return json({ error: "We couldn't end the meeting. Please try again in a moment." }, 500);
      }
    }

    // Delete the Daily room so everyone still inside is ejected now.
    // A missing room (404) is fine — the visit is over either way.
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (dailyApiKey) {
      const roomName = `consultation-${consultation_id}`;
      const deleteRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${dailyApiKey}` },
      });
      if (!deleteRes.ok && deleteRes.status !== 404) {
        // Not fatal: the row is completed, clients exit on the realtime
        // event, and the room expires on its own within 24h regardless.
        console.error("Daily room delete failed:", deleteRes.status, await deleteRes.text());
      }
    }

    return json({ ok: true, status: "completed" }, 200);
  } catch (error) {
    console.error("Error in end-video-consultation function:", error);
    return json({ error: "We couldn't end the meeting. Please try again in a moment." }, 500);
  }
});

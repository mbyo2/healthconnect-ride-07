import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
};

interface RequestData {
  consultation_id: string;
  optimize_for_network?: boolean;
  tv_mode?: boolean;
  enable_recording?: boolean;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Join a video consultation: returns the Daily room URL plus a meeting token
// minted for THE CALLER (rooms are private — a token is required to enter).
//
// History (root cause of the 2026-11-20 "Join never works" outage): the
// recording branch used to add `recording_consent`, `recording_resolution`
// and `recording_available_notification` to the room properties. None of
// those are Daily room properties — Daily rejects the whole create call
// with 400 "invalid property name 'recording_consent'". The web client
// always asks for recording and the provider's request is honoured, so the
// provider (the person starting the visit) could never create the room.
// The client also discarded the returned token and entered the private
// room URL tokenless, which Daily refuses. Both are fixed here + client:
// valid properties only, an existing room is reused instead of recreated,
// a fresh token is minted on every join, and a recording-related Daily
// rejection falls back to a room without recording so a visit can never
// be blocked by the recording add-on again.
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { consultation_id, optimize_for_network = false, tv_mode = false, enable_recording: recording_requested = false } =
      (await req.json()) as RequestData;

    if (!consultation_id) {
      return json({ error: "consultation_id is required" }, 400);
    }

    const { data: consultation, error: consultationError } = await supabaseClient
      .from("video_consultations")
      .select("*")
      .eq("id", consultation_id)
      .maybeSingle();

    if (consultationError || !consultation) {
      return json({ error: "Consultation not found" }, 404);
    }

    // Ownership check — only the patient or provider participants may open the room
    if (consultation.patient_id !== user.id && consultation.provider_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    if (consultation.status === "completed" || consultation.status === "cancelled") {
      return json({ error: "This visit has already ended." }, 409);
    }

    // P2-27: privileges are decided server-side from the consultation
    // row, never from the request body. Only the consultation's
    // provider is a Daily room owner, and only the provider may enable
    // cloud recording — a patient-supplied enable_recording is ignored.
    const isProvider = consultation.provider_id === user.id;
    const wantRecording = recording_requested === true && isProvider;

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) {
      return json({ error: "Video is not configured yet. Please contact support." }, 500);
    }
    const dailyHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dailyApiKey}`,
    };

    const roomName = `consultation-${consultation_id}`;

    // Reuse the room if it already exists at Daily (second participant,
    // rejoin after a drop, provider joining after the patient opened it).
    let room: { name: string; url: string } | null = null;
    let recordingEnabled = false;
    const existingRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: dailyHeaders,
    });
    if (existingRes.ok) {
      room = await existingRes.json();
      recordingEnabled = consultation.recording_enabled === true;
    } else {
      // Create the room. ONLY properties Daily actually defines may be
      // sent — an unknown property name fails the entire call.
      const buildRoomBody = (withRecording: boolean) => {
        const properties: Record<string, unknown> = {
          exp: Math.floor(Date.now() / 1000) + 86400,
          enable_screenshare: true,
          enable_chat: true,
          enable_prejoin_ui: true,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
          enable_network_ui: true,
        };
        if (optimize_for_network) {
          properties.max_participants = 4;
        }
        if (tv_mode) {
          properties.enable_d_pad_navigation = true;
          properties.ui_config = {
            theme: {
              colors: {
                accent: "#2563EB",
                accentText: "#FFFFFF",
                background: "#111827",
                backgroundAccent: "#1F2937",
                baseText: "#FFFFFF",
              },
              scale: 1.5,
            },
          };
        }
        if (withRecording) {
          properties.enable_recording = "cloud";
        }
        return { name: roomName, privacy: "private", properties };
      };

      let createRes = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: dailyHeaders,
        body: JSON.stringify(buildRoomBody(wantRecording)),
      });
      recordingEnabled = wantRecording;

      if (!createRes.ok && wantRecording) {
        // Recording must never block the visit itself: log Daily's
        // reason and retry once without the recording property.
        console.error("Daily room create (with recording) failed:", await createRes.text());
        recordingEnabled = false;
        createRes = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: dailyHeaders,
          body: JSON.stringify(buildRoomBody(false)),
        });
      }

      if (!createRes.ok) {
        console.error("Daily API error:", await createRes.text());
        // Lost a create race with the other participant — reuse theirs.
        const raceRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: dailyHeaders,
        });
        if (raceRes.ok) {
          room = await raceRes.json();
        } else {
          return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
        }
      } else {
        room = await createRes.json();
      }
    }

    if (!room) {
      return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
    }

    // Persist the room on the consultation and mark the visit live the
    // first time the room is opened.
    const patch: Record<string, unknown> = {
      meeting_url: room.url,
      network_optimized: optimize_for_network,
      tv_mode: tv_mode,
      recording_enabled: recordingEnabled,
    };
    if (consultation.status === "scheduled") {
      patch.status = "active";
    }
    const { error: updateError } = await supabaseClient
      .from("video_consultations")
      .update(patch)
      .eq("id", consultation_id);

    if (updateError) {
      console.error("Failed to update consultation:", updateError);
      return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
    }

    // A meeting token is REQUIRED to enter a private room, and it is
    // per-participant — mint a fresh one for this caller on every join.
    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: dailyHeaders,
      body: JSON.stringify({
        properties: {
          room_name: room.name,
          user_id: user.id,
          is_owner: isProvider,
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Daily meeting-token error:", await tokenResponse.text());
      return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
    }
    const tokenData = await tokenResponse.json();

    return json(
      {
        url: room.url,
        token: tokenData.token,
        recording_enabled: recordingEnabled,
        status: consultation.status === "scheduled" ? "active" : consultation.status,
      },
      200
    );
  } catch (error) {
    console.error("Error in create-daily-room function:", error);
    return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
  }
});

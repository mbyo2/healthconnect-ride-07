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
// and `recording_available_notification` to the room properties, and the
// TV branch added `enable_d_pad_navigation` and `ui_config`. NONE of
// those are Daily room properties — Daily rejects the whole create call
// with 400 "invalid property name '<name>'" (each name verified against
// the live Daily API). The web client always asks for recording and the
// provider's request is honoured, so the provider (the person starting
// the visit) could never create the room; a TV client could never create
// one either. The client also discarded the returned token and entered
// the private room URL tokenless, which Daily refuses. All fixed here +
// client: valid properties only, an existing room is reused instead of
// recreated, a fresh token is minted on every join, and room creation
// degrades in steps (full → no recording → minimal) so no optional
// feature can ever block the visit itself again.
//
// Zoom-parity pass (2026-11-20, later the same day): the room now also
// carries Daily's quality + Prebuilt feature properties. EVERY property
// below was probed against the live Daily API on this domain before it
// shipped (one property per room, then the full set together, read back
// from Daily's own room config — all accepted, HTTP 200):
//   geo "af-south-1"        — pin the call servers to Cape Town, the
//                             Daily region closest to Zambia, instead of
//                             wherever the first joiner happens to be.
//   enable_adaptive_simulcast / enable_multiparty_adaptive_simulcast
//                           — quality follows the network in both
//                             directions instead of freezing/dropping.
//   enable_hand_raising, enable_emoji_reactions, enable_people_ui,
//   enable_pip_ui, enable_noise_cancellation_ui (in-call noise
//   cancellation toggle), enable_video_processing_ui (background
//   blur / virtual background), enable_cpu_warning_notifications.
// In-call chat intentionally does NOT use Daily's Prebuilt chat
// (enable_chat stays false): chat lives in the app shell, carried over
// Daily app-messages, so it gets an unread badge and never covers the
// video on phones. Knocking is deliberately NOT enabled: Daily's
// knock-to-join only gates TOKENLESS guests, and every participant here
// joins with a minted token — the waiting room is implemented in the
// client with Supabase presence instead (patient waits until the
// provider is actually present).
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

    // The caller's display name rides on the meeting token so every
    // participant sees real names in the call. Fetched in parallel with
    // the room lookup — neither waits on the other (join latency).
    const profilePromise = supabaseClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

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
      // sent — an unknown property name fails the entire call (the TV
      // branch's d-pad/theming properties were removed for exactly this
      // reason; tv_mode is still recorded on the consultation for the
      // client's own TV UI, it just cannot alter the Daily room).
      const exp = Math.floor(Date.now() / 1000) + 86400;
      const buildRoomBody = (withRecording: boolean) => {
        const properties: Record<string, unknown> = {
          exp,
          // Quality + smoothness (probe-verified, see header).
          geo: "af-south-1",
          enable_adaptive_simulcast: true,
          enable_multiparty_adaptive_simulcast: true,
          max_participants: 4,
          // Zoom-like in-call features, rendered by Daily Prebuilt.
          enable_screenshare: true,
          enable_prejoin_ui: true,
          enable_network_ui: true,
          enable_people_ui: true,
          enable_pip_ui: true,
          enable_emoji_reactions: true,
          enable_hand_raising: true,
          enable_noise_cancellation_ui: true,
          enable_video_processing_ui: true,
          enable_cpu_warning_notifications: true,
          // Chat lives in the app shell (Daily app-messages), not in
          // Prebuilt — see header.
          enable_chat: false,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
          lang: "en",
        };
        if (withRecording) {
          properties.enable_recording = "cloud";
        }
        return { name: roomName, privacy: "private", properties };
      };
      // One step down: the long-standing core set, in case a newer
      // feature property is ever refused on this domain.
      const buildCoreRoomBody = (withRecording: boolean) => {
        const properties: Record<string, unknown> = {
          exp,
          enable_screenshare: true,
          enable_chat: false,
          enable_prejoin_ui: true,
          enable_network_ui: true,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
          max_participants: 4,
        };
        if (withRecording) {
          properties.enable_recording = "cloud";
        }
        return { name: roomName, privacy: "private", properties };
      };
      const buildMinimalRoomBody = () => ({
        name: roomName,
        privacy: "private",
        properties: {
          exp,
          enable_screenshare: true,
          enable_chat: false,
          enable_prejoin_ui: true,
          eject_at_room_exp: true,
        },
      });

      // Degrade in steps so no optional feature can block the visit:
      // full set → without recording → core set → minimal set.
      const attempts: { body: unknown; recording: boolean }[] = [
        { body: buildRoomBody(wantRecording), recording: wantRecording },
        ...(wantRecording ? [{ body: buildRoomBody(false), recording: false }] : []),
        { body: buildCoreRoomBody(false), recording: false },
        { body: buildMinimalRoomBody(), recording: false },
      ];
      let created = false;
      for (const attempt of attempts) {
        const res = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: dailyHeaders,
          body: JSON.stringify(attempt.body),
        });
        if (res.ok) {
          room = await res.json();
          recordingEnabled = attempt.recording;
          created = true;
          break;
        }
        console.error("Daily room create attempt failed:", await res.text());
      }

      if (!created) {
        // Lost a create race with the other participant — reuse theirs.
        const raceRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: dailyHeaders,
        });
        if (raceRes.ok) {
          room = await raceRes.json();
        } else {
          return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
        }
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

    const { data: profile } = await profilePromise;
    const displayName =
      [profile?.first_name, profile?.last_name]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join(" ")
        .trim() || undefined;

    // A meeting token is REQUIRED to enter a private room, and it is
    // per-participant — mint a fresh one for this caller on every join.
    // The mint and the consultation write are independent: run them
    // together so a join costs one round trip, not two.
    const mintToken = async () => {
      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: dailyHeaders,
        body: JSON.stringify({
          properties: {
            room_name: room.name,
            user_id: user.id,
            ...(displayName ? { user_name: displayName } : {}),
            is_owner: isProvider,
            exp: Math.floor(Date.now() / 1000) + 86400,
          },
        }),
      });
      if (!tokenResponse.ok) {
        console.error("Daily meeting-token error:", await tokenResponse.text());
        return null;
      }
      const tokenData = await tokenResponse.json();
      return tokenData.token as string;
    };

    const [meetingToken, updateResult] = await Promise.all([
      mintToken(),
      supabaseClient
        .from("video_consultations")
        .update(patch)
        .eq("id", consultation_id),
    ]);

    if (updateResult.error) {
      console.error("Failed to update consultation:", updateResult.error);
      return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
    }
    if (!meetingToken) {
      return json({ error: "We couldn't set up the video room. Please try again in a moment." }, 500);
    }

    return json(
      {
        url: room.url,
        token: meetingToken,
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

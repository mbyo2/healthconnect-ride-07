import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestData {
  consultation_id: string;
  optimize_for_network?: boolean;
  tv_mode?: boolean;
  enable_recording?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { consultation_id, optimize_for_network = false, tv_mode = false, enable_recording = false } =
      (await req.json()) as RequestData;

    if (!consultation_id) {
      return new Response(
        JSON.stringify({ error: "consultation_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: consultation, error: consultationError } = await supabaseClient
      .from("video_consultations")
      .select("*")
      .eq("id", consultation_id)
      .maybeSingle();

    if (consultationError || !consultation) {
      return new Response(
        JSON.stringify({ error: "Consultation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ownership check — only the patient or provider participants may open the room
    if (consultation.patient_id !== user.id && consultation.provider_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) {
      return new Response(
        JSON.stringify({ error: "Daily API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomProperties: any = {
      name: `consultation-${consultation_id}`,
      privacy: "private",
      properties: {
        exp: Math.floor(Date.now() / 1000) + 86400,
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        eject_at_room_exp: true,
        enable_network_ui: true,
        enable_network_switching: true,
      },
    };

    if (optimize_for_network) {
      roomProperties.properties.max_participants = 4;
      roomProperties.properties.enable_prejoin_ui = true;
    }

    if (tv_mode) {
      roomProperties.properties.enable_d_pad_navigation = true;
      roomProperties.properties.ui_config = {
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

    if (enable_recording) {
      roomProperties.properties.enable_recording = "cloud";
      roomProperties.properties.recording_consent = "required";
      roomProperties.properties.recording_resolution = optimize_for_network ? "sd" : "hd";
      roomProperties.properties.recording_available_notification = true;
    }

    const createRoomResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify(roomProperties),
    });

    if (!createRoomResponse.ok) {
      const errorText = await createRoomResponse.text();
      console.error("Daily API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create Daily room" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const room = await createRoomResponse.json();

    const { error: updateError } = await supabaseClient
      .from("video_consultations")
      .update({
        meeting_url: room.url,
        network_optimized: optimize_for_network,
        tv_mode: tv_mode,
        recording_enabled: enable_recording,
      })
      .eq("id", consultation_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update consultation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: room.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-daily-room function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

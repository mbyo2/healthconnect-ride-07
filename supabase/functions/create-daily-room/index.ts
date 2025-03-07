
// Note: We can't modify the original file as it's read-only, but this is how the function should be updated:

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

interface RequestData {
  consultation_id: string;
  optimize_for_network?: boolean;
  tv_mode?: boolean;
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { consultation_id, optimize_for_network = false, tv_mode = false } = await req.json() as RequestData;

    if (!consultation_id) {
      return new Response(
        JSON.stringify({ error: "consultation_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the consultation
    const { data: consultation, error: consultationError } = await supabaseClient
      .from("video_consultations")
      .select("*")
      .eq("id", consultation_id)
      .single();

    if (consultationError || !consultation) {
      return new Response(
        JSON.stringify({ error: "Consultation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a room with Daily.co API
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) {
      return new Response(
        JSON.stringify({ error: "Daily API key not found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Configure room properties based on network optimization and TV mode
    const roomProperties: any = {
      name: `consultation-${consultation_id}`,
      privacy: "private",
      properties: {
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
      },
    };

    // Apply network optimization if requested
    if (optimize_for_network) {
      roomProperties.properties.enable_network_ui = true;
      roomProperties.properties.enable_network_switching = true;
      roomProperties.properties.max_participants = 4; // Limit participants for better performance
      roomProperties.properties.enable_prejoin_ui = true; // Allow checking network before joining
    }

    // Apply TV mode optimizations if requested
    if (tv_mode) {
      roomProperties.properties.enable_d_pad_navigation = true; // Enable remote control navigation
      roomProperties.properties.ui_config = {
        // TV-specific UI configurations
        theme: {
          colors: {
            accent: "#2563EB",
            accentText: "#FFFFFF",
            background: "#111827",
            backgroundAccent: "#1F2937",
            baseText: "#FFFFFF",
          },
          // Larger UI elements for TV viewing
          scale: 1.5
        }
      };
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
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const room = await createRoomResponse.json();

    // Update the consultation with the meeting URL
    const { error: updateError } = await supabaseClient
      .from("video_consultations")
      .update({
        meeting_url: room.url,
        network_optimized: optimize_for_network,
        tv_mode: tv_mode
      })
      .eq("id", consultation_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update consultation" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: room.url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-daily-room function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

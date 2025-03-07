
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { consultation_id, optimize_for_network = false } = await req.json()
    
    if (!consultation_id) {
      throw new Error('Consultation ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create Daily.co room with optimization settings if needed
    const roomProperties = {
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        start_audio_off: false,
        start_video_off: optimize_for_network, // Start with video off for poor connections
        // Set lower video quality for optimized network usage
        ...(optimize_for_network && {
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hour expiration
          enable_network_ui: true,
          enable_network_switching: true,
          enable_people_ui: true,
          max_participants: 2, // Limit participants to save bandwidth
          enable_prejoin_ui: true,
          background_color: "#f8f8f8",
          video_codec: {
            preferred: "vp8", // More compatible with mobile devices
          },
          geo: false, // No geo-location limiting
          video: {
            quality: "low", // Default to low quality for optimized network
            optimization_mode: "bandwidth", // Optimize for bandwidth over quality
            default_hd: false, // No HD by default
          },
        }),
      },
    };

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DAILY_API_KEY')}`,
      },
      body: JSON.stringify(roomProperties),
    })

    if (!response.ok) {
      throw new Error('Failed to create Daily.co room')
    }

    const room = await response.json()

    // Update video consultation with room URL
    const { error: updateError } = await supabase
      .from('video_consultations')
      .update({ 
        meeting_url: room.url,
        status: 'active',
        network_optimized: optimize_for_network
      })
      .eq('id', consultation_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ room, optimized: optimize_for_network }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

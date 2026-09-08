import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { imageBase64, imageUrl } = await req.json();
    if (!imageBase64 && !imageUrl) throw new Error('No image provided');
    if (typeof imageBase64 === 'string' && imageBase64.length > 5_000_000) {
      return new Response(
        JSON.stringify({ error: 'Image exceeds 5MB base64 limit' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (typeof imageUrl === 'string' && imageUrl.length > 2048) {
      return new Response(
        JSON.stringify({ error: 'Image URL too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Card reading needs a vision model, served through the Lovable AI gateway.
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('AI service not configured');

    // Use HuggingFace inference for document understanding
    const prompt = `Extract the following information from this insurance card image. Return ONLY a JSON object with these fields:
    - insurance_provider: company name
    - plan_name: plan/policy name
    - member_id: member/subscriber ID number
    - group_number: group number
    - member_name: name on card
    - effective_date: effective/start date
    - copay_primary: primary care copay amount
    - copay_specialist: specialist copay amount
    - copay_emergency: emergency room copay
    - rx_bin: pharmacy BIN number
    - rx_pcn: pharmacy PCN
    - rx_group: pharmacy group
    - customer_service_phone: phone number
    
    If a field is not visible, set it to null.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You extract structured data from insurance cards. Respond with a single JSON object only, no commentary.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageBase64 || imageUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    let extractedData: any = {};

    if (response.ok) {
      const result = await response.json();
      const text = (result?.choices?.[0]?.message?.content ?? '')
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/, '')
        .trim();
      
      try {
        // Try to parse as JSON if model returned JSON
        extractedData = JSON.parse(text);
      } catch {
        // Fallback: return raw text for manual review
        extractedData = {
          raw_text: text,
          needs_manual_review: true,
          insurance_provider: null,
          plan_name: null,
          member_id: null,
          group_number: null,
          member_name: null,
        };
      }
    } else {
      // Fallback response if model unavailable
      extractedData = {
        needs_manual_review: true,
        message: 'AI extraction temporarily unavailable. Please enter details manually.',
        insurance_provider: null,
        plan_name: null,
        member_id: null,
        group_number: null,
      };
    }

    return new Response(JSON.stringify({
      success: true,
      extracted_data: extractedData,
      confidence: extractedData.needs_manual_review ? 'low' : 'medium',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(JSON.stringify({ success: false, error: 'An internal error occurred' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

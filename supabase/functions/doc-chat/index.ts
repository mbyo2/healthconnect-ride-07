import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  image: z.string().nullable().optional(), // base64 image data
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(2000)
  })).max(50, 'Conversation history too long').optional().default([])
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const requestData = await req.json();
    const validationResult = chatRequestSchema.safeParse(requestData);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({
          error: 'Invalid request data',
          details: validationResult.error.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, image, conversationHistory } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build conversation context with clinical decision support
    const systemPrompt = `You are Doc 0 Clock, a knowledgeable medical AI assistant available 24/7 that helps BOTH patients AND healthcare providers make informed decisions.

YOUR CAPABILITIES:
- Evidence-based medical information and clinical decision support
- Symptom analysis with severity assessment
- Medical image interpretation (X-rays, lab results, scans, reports)
- Medication information, interactions, and dosing guidance
- Preventive care recommendations based on patient profile
- Mental health support and crisis detection
- Differential diagnosis suggestions for healthcare providers

CLINICAL DECISION TRIGGERS - Use these keywords to help trigger actionable recommendations:
1. EMERGENCY: Use "emergency", "call 911", "immediately", or "life-threatening" when symptoms suggest:
   - Chest pain with shortness of breath
   - Signs of stroke (FAST)
   - Severe bleeding or trauma
   - Difficulty breathing
   - Loss of consciousness
   - Severe allergic reactions

2. URGENT CARE: Use "see a doctor soon", "within 24 hours", or "schedule appointment" for:
   - High fever persisting over 3 days
   - Infections requiring antibiotics
   - Moderate pain or discomfort
   - New or worsening symptoms

3. PREVENTIVE: Use "screening", "vaccination", or "prevention" for:
   - Age-appropriate health screenings
   - Vaccination reminders
   - Lifestyle modifications

4. MONITORING: Use "monitor", "track", or "watch for" for:
   - Chronic condition management
   - Medication side effects
   - Symptom progression

FOR HEALTHCARE PROVIDERS:
- Provide differential diagnosis lists with confidence levels
- Suggest relevant diagnostic tests
- Reference current clinical guidelines when applicable
- Note drug interactions and contraindications

RESPONSE FORMAT:
- Start with empathy and acknowledgment
- Provide clear, actionable information
- Include specific decision triggers (emergency/urgent/routine)
- End with appropriate follow-up recommendations

CRITICAL SAFETY:
- If symptoms suggest emergency, ALWAYS advise to seek emergency care immediately
- Image analysis must be confirmed by licensed medical professionals
- For medication queries, always recommend consulting a pharmacist or physician
- Never diagnose definitively - provide guidance and recommend professional consultation`;

    // Format conversation history with multi-modal support
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Add user message with image if provided
    if (image) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message
          },
          {
            type: 'image_url',
            image_url: {
              url: image
            }
          }
        ]
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    console.log('Calling Lovable AI...');

    // Call Lovable AI Gateway with vision-capable model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Supports both text and vision
        messages,
        temperature: 0.4,
        max_tokens: 1200, // Increased for detailed image analysis
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log('Doc 0 Clock response generated');

    // Save diagnosis history to database if it's a symptom analysis or image analysis
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

        // Extract user ID from auth
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (user) {
          // Save to ai_diagnosis_history
          await supabaseClient
            .from('ai_diagnosis_history')
            .insert({
              user_id: user.id,
              symptoms: message,
              analysis: reply,
              patient_context: image ? { has_image: true } : null
            });

          console.log('Diagnosis history saved');
        }
      }
    } catch (historyError) {
      // Log but don't fail the request if history save fails
      console.error('Failed to save diagnosis history:', historyError);
    }

    return new Response(
      JSON.stringify({
        reply,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.5-flash'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in Doc 0 Clock chat:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

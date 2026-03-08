import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  userRole: z.string().optional().default('patient'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
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

    const { message, userRole, conversationHistory } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Role-aware prompt (simplified version for fallback)
    const roleLabel = ['doctor','health_personnel','radiologist'].includes(userRole) ? 'clinical professional'
      : ['nurse'].includes(userRole) ? 'nursing professional'
      : ['pharmacist','pharmacy'].includes(userRole) ? 'pharmacist'
      : ['lab','lab_technician'].includes(userRole) ? 'lab professional'
      : 'patient';

    const systemPrompt = `You are Doc 0 Clock, a medical AI assistant. You are speaking with a ${roleLabel}.
${roleLabel !== 'patient' ? 'Use appropriate clinical terminology and provide evidence-based decision support.' : 'Use simple, clear language and be empathetic.'}

Always recommend seeking professional care when appropriate.
CRITICAL: If symptoms suggest emergency, immediately advise to call emergency services.`;

    // Format conversation for API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Doc O Clock AI chat request received Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log('MedGemma chat AI generated');

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
    console.error('Error in MedGemma chat:', error);

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

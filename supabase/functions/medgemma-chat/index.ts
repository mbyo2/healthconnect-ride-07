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

    console.log('Doc O Clock AI chat request received');
    
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'HF_TOKEN not configured', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use HuggingFace MedGemma2-8B (latest version)
    const response = await fetch('https://api-inference.huggingface.co/models/google/medgemma-2-8b', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\nConversation history:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${message}\n\nAssistant:`,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.4,
          top_p: 0.95,
          return_full_text: false
        }
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
    
    // HuggingFace returns array or object with generated_text
    let reply: string;
    if (Array.isArray(data)) {
      reply = data[0]?.generated_text || 'No response generated';
    } else {
      reply = data.generated_text || data[0]?.generated_text || 'No response generated';
    }

    console.log('AI chat response generated');

    return new Response(
      JSON.stringify({
        reply,
        timestamp: new Date().toISOString(),
        model: 'medgemma-2-8b'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in AI chat:', error);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
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

    const { message, conversationHistory } = validationResult.data;

    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      throw new Error('HF_TOKEN not configured');
    }

    const hf = new HfInference(HF_TOKEN, {
      baseUrl: 'https://router.huggingface.co'
    });

    // Build conversation context
    const systemPrompt = `You are Doc 0 Clock, a knowledgeable medical AI assistant available 24/7. You provide:
- Evidence-based medical information
- Symptom analysis and health guidance
- Medication information
- Preventive care recommendations
- Mental health support

Always:
1. Be empathetic and supportive
2. Provide accurate medical information
3. Recommend seeking professional care when appropriate
4. Include disclaimers about not replacing professional medical advice
5. Ask clarifying questions when needed

CRITICAL: If symptoms suggest emergency (chest pain, difficulty breathing, severe bleeding, loss of consciousness), immediately advise to call emergency services.`;

    // Format conversation history
    let conversationContext = systemPrompt + '\n\n';
    conversationHistory.forEach((msg: any) => {
      conversationContext += `${msg.role === 'user' ? 'Patient' : 'Doc 0 Clock'}: ${msg.content}\n`;
    });
    conversationContext += `Patient: ${message}\nDoc 0 Clock:`;

    console.log('MedGemma chat request received');

    // Call MedGemma
    const response = await hf.textGeneration({
      model: 'google/medgemma-7b',
      inputs: conversationContext,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.4,
        top_p: 0.9,
        return_full_text: false,
        stop: ['\nPatient:', '\nUser:']
      },
    });

    const reply = response.generated_text.trim();

    console.log('MedGemma chat response generated');

    return new Response(
      JSON.stringify({
        reply,
        timestamp: new Date().toISOString(),
        model: 'medgemma-7b'
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { resolveAIProvider, AI_MODEL_LABEL } from '../_shared/ai.ts';

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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const supabaseAuth = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

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

    const aiProvider = resolveAIProvider();
    if (!aiProvider) {
      console.error('No AI provider configured');
      return new Response(
        JSON.stringify({
          error: 'AI service not configured. Please set OPENROUTER_API_KEY in Supabase Edge Function secrets.',
          fallback: true
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

        // Format messages for OpenAI
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: message }
        ];

        console.log(`Calling Doc' O Clock AI (${aiProvider.provider})...`);

        const response = await fetch(aiProvider.endpoint, {
            method: 'POST',
            headers: aiProvider.headers,
            body: JSON.stringify({
                model: aiProvider.model,
                messages,
                temperature: 0.4,
                max_tokens: 800,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI provider error:', response.status, errorText);
            throw new Error(`AI provider error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || 'No response generated';

        console.log('Med AI response generated');

        return new Response(
            JSON.stringify({
                reply,
                timestamp: new Date().toISOString(),
                model: AI_MODEL_LABEL
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error) {
        console.error('Error in Med AI:', error);

        return new Response(
            JSON.stringify({
                error: 'An error occurred processing your request',
                
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});

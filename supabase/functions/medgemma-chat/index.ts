import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      throw new Error('HF_TOKEN not configured');
    }

    const hf = new HfInference(HF_TOKEN);
    
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

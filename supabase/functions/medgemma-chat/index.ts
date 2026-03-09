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
  })).max(50, 'Conversation history too long').optional().default([]),
  // Multimodal support
  images: z.array(z.string()).max(10, 'Maximum 10 images allowed').optional(), // base64 encoded images
  analysisType: z.enum(['general', 'longitudinal', 'document_understanding', 'anatomical_localization']).optional().default('general')
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

    const { message, userRole, conversationHistory, images, analysisType } = validationResult.data;

    // Role-aware prompt with multimodal capabilities
    const roleLabel = ['doctor','health_personnel','radiologist'].includes(userRole) ? 'clinical professional'
      : ['nurse'].includes(userRole) ? 'nursing professional'
      : ['pharmacist','pharmacy'].includes(userRole) ? 'pharmacist'
      : ['lab','lab_technician'].includes(userRole) ? 'lab professional'
      : 'patient';

    let systemPrompt = `You are Doc 0 Clock, a medical AI assistant powered by MedGemma 1.5 4B. You are speaking with a ${roleLabel}.
${roleLabel !== 'patient' ? 'Use appropriate clinical terminology and provide evidence-based decision support.' : 'Use simple, clear language and be empathetic.'}

Always recommend seeking professional care when appropriate.
CRITICAL: If symptoms suggest emergency, immediately advise to call emergency services.`;

    // Enhanced prompts based on analysis type
    if (analysisType === 'longitudinal' && images && images.length > 1) {
      systemPrompt += `\n\nLONGITUDINAL ANALYSIS MODE:
- You are analyzing ${images.length} sequential medical images
- Compare findings across timepoints
- Identify disease progression or treatment response
- Highlight any significant changes`;
    } else if (analysisType === 'document_understanding') {
      systemPrompt += `\n\nDOCUMENT UNDERSTANDING MODE:
- Extract structured data from medical documents/lab reports
- Identify test names, values, units, and reference ranges
- Flag abnormal values
- Organize information clearly`;
    } else if (analysisType === 'anatomical_localization') {
      systemPrompt += `\n\nANATOMICAL LOCALIZATION MODE:
- Identify and describe anatomical structures
- Locate and describe any abnormalities with approximate positions
- Use standard anatomical terminology`;
    }

    console.log('MedGemma 1.5 4B multimodal request received');
    
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'HF_TOKEN not configured', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Format messages for multimodal input
    const formattedMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    conversationHistory.forEach((msg: any) => {
      formattedMessages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current user message with images if provided
    if (images && images.length > 0) {
      const userContent: any[] = [];
      
      // Add images first (for longitudinal analysis, order matters)
      images.forEach((imageBase64, index) => {
        userContent.push({
          type: 'image',
          image: imageBase64 // Base64 encoded image
        });
        
        if (analysisType === 'longitudinal') {
          userContent.push({
            type: 'text',
            text: `[Image ${index + 1} of ${images.length}]`
          });
        }
      });
      
      // Add text prompt
      userContent.push({
        type: 'text',
        text: message
      });

      formattedMessages.push({
        role: 'user',
        content: userContent
      });
    } else {
      // Text-only message
      formattedMessages.push({
        role: 'user',
        content: message
      });
    }
    
    // Call HuggingFace Inference API with chat template
    const response = await fetch('https://api-inference.huggingface.co/models/google/medgemma-1.5-4b-it', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          messages: formattedMessages
        },
        parameters: {
          max_new_tokens: 2000, // Increased for detailed medical analysis
          temperature: 0.3, // Lower for more factual medical responses
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
        model: 'medgemma-1.5-4b-it'
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

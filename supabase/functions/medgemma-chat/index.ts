import { MEDGEMMA_MODEL, MEDGEMMA_MODEL_LABEL } from '../_shared/medgemma.ts';
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
  userRole: z.string().optional().default('patient'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000)
  })).max(50, 'Conversation history too long').optional().default([]),
  // Multimodal support
  images: z.array(z.string().max(5_000_000, 'Image exceeds 5MB base64 limit')).max(5, 'Maximum 5 images allowed').optional(),
  analysisType: z.enum(['general', 'longitudinal', 'document_understanding', 'anatomical_localization']).optional().default('general')
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication before invoking the paid AI API
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

    const { message, userRole: _clientRole, conversationHistory, images, analysisType } = validationResult.data;

    // SECURITY: Verify role server-side. Never trust client-supplied userRole.
    const { data: verifiedRoles } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roleSet = new Set((verifiedRoles || []).map((r: any) => r.role));
    const pickRole = (candidates: string[]) => candidates.find((c) => roleSet.has(c)) || 'patient';
    const userRole = pickRole([
      'super_admin','admin','support','cxo','hr_manager','institution_admin','institution_staff','receptionist','billing_staff','inventory_manager','maintenance_manager',
      'doctor','specialist','health_personnel','nurse','radiologist','pathologist','pharmacist','pharmacy','lab','lab_technician','phlebotomist','triage_staff','ot_staff','ambulance_staff','patient'
    ]);

    // Role-aware prompt with multimodal capabilities
    let roleLabel = 'patient';
    let roleGuidance = 'Use simple, clear language and be empathetic.';
    
    if (['doctor', 'specialist', 'health_personnel'].includes(userRole)) {
      roleLabel = 'clinical professional';
      roleGuidance = 'Use clinical terminology, provide differential diagnoses, evidence-based decision support, and structured reporting. Include ICD codes when relevant.';
    } else if (userRole === 'nurse') {
      roleLabel = 'nursing professional';
      roleGuidance = 'Focus on nursing assessments, care planning, vital sign interpretation, and patient deterioration indicators. Use nursing-appropriate clinical terminology.';
    } else if (userRole === 'radiologist') {
      roleLabel = 'radiologist';
      roleGuidance = 'Provide structured radiology reporting (findings, impression, recommendations). Reference ACR guidelines, BI-RADS/LI-RADS classifications. Flag urgent findings.';
    } else if (userRole === 'pathologist') {
      roleLabel = 'pathologist';
      roleGuidance = 'Focus on histopathology interpretation, WHO grading systems, IHC panel guidance, and synoptic reporting. Use pathology-specific terminology.';
    } else if (['pharmacist', 'pharmacy'].includes(userRole)) {
      roleLabel = 'pharmacist';
      roleGuidance = 'Focus on drug interactions, dosing calculations, therapeutic monitoring, and medication counseling. Reference pharmacokinetic principles and flag black box warnings.';
    } else if (['lab', 'lab_technician', 'phlebotomist'].includes(userRole)) {
      roleLabel = 'lab professional';
      roleGuidance = 'Focus on lab result interpretation, critical values, specimen requirements, and quality control. Use laboratory-specific terminology.';
    } else if (userRole === 'triage_staff') {
      roleLabel = 'triage professional';
      roleGuidance = 'Focus on rapid assessment, ESI/CTAS scoring, red flag symptom identification, and acuity prioritization. Use rapid, decisive language.';
    } else if (userRole === 'ot_staff') {
      roleLabel = 'operating theater staff';
      roleGuidance = 'Focus on surgical protocols, sterile technique, instrument identification, WHO Surgical Safety Checklist, and perioperative safety.';
    } else if (userRole === 'ambulance_staff') {
      roleLabel = 'paramedic/EMT';
      roleGuidance = 'Focus on pre-hospital assessment (ABCDE approach), ACLS/PALS protocols, trauma management, and transport decisions. Emphasize time-critical interventions.';
    } else if (['institution_admin', 'institution_staff', 'receptionist'].includes(userRole)) {
      roleLabel = 'healthcare administrator';
      roleGuidance = 'Focus on workflow optimization, patient flow, scheduling, and operational efficiency. Balance clinical and administrative perspectives.';
    } else if (['hr_manager', 'cxo'].includes(userRole)) {
      roleLabel = 'healthcare executive';
      roleGuidance = 'Provide strategic insights, quality metrics, compliance guidance, and high-level operational recommendations.';
    } else if (userRole === 'billing_staff') {
      roleLabel = 'billing specialist';
      roleGuidance = 'Focus on ICD-10/CPT coding, medical necessity documentation, claim denials, and revenue cycle optimization.';
    } else if (['inventory_manager', 'maintenance_manager'].includes(userRole)) {
      roleLabel = 'operations manager';
      roleGuidance = 'Focus on equipment management, preventive maintenance, supply chain, and facility operations with patient safety considerations.';
    } else if (['admin', 'super_admin', 'support'].includes(userRole)) {
      roleLabel = 'system administrator';
      roleGuidance = 'Provide platform analytics, technical support, and system-wide operational insights.';
    }

    let systemPrompt = `You are Doc 0 Clock, a medical AI assistant. You are speaking with a ${roleLabel}.
${roleGuidance}

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

    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format messages for HuggingFace chat completions API
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

    // Add current user message (text only — medgemma-1.5-4b-it is text-only via HF Inference API)
    formattedMessages.push({
      role: 'user',
      content: images && images.length > 0
        ? `[User has attached ${images.length} medical image(s) for analysis]\n\n${message}`
        : message
    });

    console.log('Calling HuggingFace chat completions API for MedGemma...');

    // Use the HuggingFace OpenAI-compatible chat completions endpoint
    const HF_CHAT_ENDPOINT = `https://api-inference.huggingface.co/v1/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    let response: Response;
    try {
      response = await fetch(HF_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MEDGEMMA_MODEL,
          messages: formattedMessages,
          max_tokens: 2000,
          temperature: 0.3,
          top_p: 0.95,
          stream: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', fallback: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: 'AI model is loading, please try again in a moment.', fallback: true }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Signal to client to try fallback
      return new Response(
        JSON.stringify({ error: `AI gateway error: ${response.status}`, fallback: true }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // HuggingFace OpenAI-compatible API returns choices[0].message.content
    const reply: string = data?.choices?.[0]?.message?.content || 'No response generated.';

    console.log('MedGemma chat response generated successfully');

    // Save to diagnosis history
    try {
      await supabaseAuth
        .from('ai_diagnosis_history')
        .insert({
          user_id: user.id,
          symptoms: message,
          analysis: reply,
          patient_context: images && images.length > 0 ? { has_images: true, image_count: images.length, analysisType } : null
        });
    } catch (historyError) {
      console.error('Failed to save diagnosis history:', historyError);
    }

    return new Response(
      JSON.stringify({
        reply,
        timestamp: new Date().toISOString(),
        model: MEDGEMMA_MODEL_LABEL,
        analysisType,
        imageCount: images?.length || 0,
        capabilities: {
          multimodal: false,
          longitudinal: true,
          document_understanding: true,
          anatomical_localization: true,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in MedGemma chat:', error);

    if (error?.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'AI request timed out. Please try again.', fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 504 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'An internal error occurred', fallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

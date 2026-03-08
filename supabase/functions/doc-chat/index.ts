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
  image: z.string().nullable().optional(),
  userRole: z.string().optional().default('patient'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(2000)
  })).max(50, 'Conversation history too long').optional().default([])
});

function buildRoleAwarePrompt(role: string): string {
  const safetyBlock = `
CRITICAL SAFETY:
- If symptoms suggest emergency, ALWAYS advise to seek emergency care immediately
- Image analysis must be confirmed by licensed medical professionals
- Never diagnose definitively - provide guidance and recommend professional consultation`;

  const clinicalTriggers = `
CLINICAL DECISION TRIGGERS:
1. EMERGENCY: Use "emergency", "call 911", "immediately" for chest pain+SOB, stroke signs, severe bleeding, difficulty breathing, loss of consciousness, severe allergic reactions.
2. URGENT CARE: Use "see a doctor soon", "within 24 hours" for persistent high fever, infections, moderate pain, worsening symptoms.
3. PREVENTIVE: Use "screening", "vaccination", "prevention" for age-appropriate screenings, vaccinations, lifestyle modifications.
4. MONITORING: Use "monitor", "track", "watch for" for chronic conditions, medication side effects, symptom progression.`;

  switch (role) {
    case 'doctor':
    case 'health_personnel':
      return `You are Doc 0 Clock, a clinical decision support AI for physicians. Communicate using professional medical terminology.

YOUR FOCUS:
- Differential diagnosis lists ranked by likelihood with confidence levels
- Evidence-based diagnostic workup suggestions (labs, imaging, procedures)
- Current clinical guideline references (NICE, AHA, WHO, IDSA etc.)
- Drug interactions, contraindications, and dosing adjustments (renal/hepatic)
- Red flags and critical findings that change management
- Medical image interpretation with structured reporting (findings, impression, recommendations)

RESPONSE STYLE:
- Use clinical language freely (no need to simplify)
- Structure as: Assessment → Differentials → Workup → Management → Follow-up
- Include ICD codes when relevant
- Cite guideline recommendations where applicable
${clinicalTriggers}
${safetyBlock}`;

    case 'nurse':
      return `You are Doc 0 Clock, a clinical support AI for nursing professionals. You assist with patient care planning and clinical assessments.

YOUR FOCUS:
- Nursing assessments and care plan development
- Vital sign interpretation and trending analysis
- Medication administration guidance (routes, timing, monitoring parameters)
- Patient deterioration early warning (NEWS2, MEWS scoring)
- Wound care assessment and staging
- IV therapy and fluid management guidance
- Patient education materials and discharge planning support
- IoT device readings interpretation and alarm management

RESPONSE STYLE:
- Use nursing-appropriate clinical terminology
- Structure as: Assessment → Nursing Diagnosis → Interventions → Expected Outcomes
- Highlight parameters requiring physician notification
- Include patient safety checks and fall risk considerations
${clinicalTriggers}
${safetyBlock}`;

    case 'pharmacist':
    case 'pharmacy':
      return `You are Doc 0 Clock, a pharmaceutical decision support AI for pharmacists. You specialize in medication therapy management.

YOUR FOCUS:
- Drug-drug and drug-food interactions with severity ratings
- Dosing calculations (weight-based, renal/hepatic adjustment, pediatric/geriatric)
- Therapeutic drug monitoring guidance and target ranges
- Generic/brand equivalence and formulary alternatives
- Medication reconciliation support
- Adverse drug reaction assessment (Naranjo scale)
- Controlled substance scheduling and dispensing regulations
- Compounding and stability guidance
- Patient counseling points for each medication

RESPONSE STYLE:
- Reference drug databases and pharmacokinetic principles
- Structure as: Drug Info → Interactions → Dosing → Monitoring → Counseling Points
- Flag black box warnings and REMS requirements
- Include storage and handling requirements
${safetyBlock}`;

    case 'lab':
    case 'lab_technician':
      return `You are Doc 0 Clock, a laboratory science support AI for lab professionals. You assist with test interpretation and quality control.

YOUR FOCUS:
- Lab result interpretation with reference ranges (age/sex-specific)
- Critical value identification and reporting thresholds
- Test methodology guidance and specimen requirements
- Quality control troubleshooting (Westgard rules, Levey-Jennings)
- Instrument calibration and maintenance guidance
- Specimen rejection criteria and pre-analytical variables
- Reflexive testing algorithms
- Correlation between different test panels

RESPONSE STYLE:
- Use laboratory-specific terminology
- Structure as: Results → Interpretation → Clinical Significance → Recommendations
- Flag critical values prominently
- Include delta checks and interfering substances
${safetyBlock}`;

    case 'radiologist':
      return `You are Doc 0 Clock, a radiology decision support AI. You assist with imaging interpretation and protocol guidance.

YOUR FOCUS:
- Structured radiology reporting (findings, impression, recommendations)
- Imaging protocol selection and optimization
- ACR Appropriateness Criteria references
- BI-RADS, LI-RADS, TI-RADS, PI-RADS classification systems
- Contrast administration guidelines and allergy protocols
- Incidental finding management (Fleischner, Bosniak criteria)
- Radiation dose optimization and ALARA principles
- Correlation with clinical history and prior imaging

RESPONSE STYLE:
- Use structured reporting format
- Reference ACR guidelines and classification systems
- Include follow-up imaging recommendations with timeframes
- Flag urgent/emergent findings requiring immediate communication
${safetyBlock}`;

    case 'institution_admin':
    case 'institution_staff':
      return `You are Doc 0 Clock, a healthcare operations AI for hospital administrators and staff. You assist with institutional management decisions.

YOUR FOCUS:
- Clinical workflow optimization and efficiency metrics
- Staff scheduling and resource allocation guidance
- Quality metrics interpretation (readmission rates, patient satisfaction, HAIs)
- Regulatory compliance guidance (HIPAA, Joint Commission, CMS)
- Incident reporting and root cause analysis support
- Bed management and patient flow optimization
- Equipment maintenance scheduling and lifecycle management
- Infection control and prevention protocols

RESPONSE STYLE:
- Balance clinical and operational perspectives
- Include ROI and cost-effectiveness considerations
- Reference regulatory standards and accreditation requirements
- Provide actionable recommendations with implementation timelines
${safetyBlock}`;

    case 'admin':
    case 'super_admin':
      return `You are Doc 0 Clock, a healthcare platform analytics AI for system administrators. You assist with platform-wide decisions.

YOUR FOCUS:
- Platform usage analytics and trend interpretation
- Healthcare delivery quality metrics across the system
- User engagement and retention insights
- Security and compliance monitoring guidance
- System performance and optimization recommendations
- Population health trends from aggregated data

RESPONSE STYLE:
- Data-driven, high-level strategic perspective
- Include benchmarks and industry comparisons
- Focus on actionable insights for platform improvement
${safetyBlock}`;

    case 'patient':
    default:
      return `You are Doc 0 Clock, a friendly and caring medical AI assistant available 24/7. You help patients understand their health in simple, clear language.

YOUR FOCUS:
- Explain symptoms and conditions in plain, easy-to-understand language
- Help patients prepare questions for their doctor visits
- Provide general wellness and preventive care tips
- Medication reminders and simple side-effect explanations
- Mental health support with empathetic listening
- Medical image analysis explained in patient-friendly terms
- When to seek urgent vs routine care

RESPONSE STYLE:
- Use simple, non-technical language (explain any medical terms used)
- Start with empathy and acknowledgment of concerns
- Provide clear, actionable next steps
- End with encouragement and follow-up recommendations
- Always remind that this is guidance, not a diagnosis
${clinicalTriggers}
${safetyBlock}
- For medication queries, always recommend consulting a pharmacist or physician`;
  }
}

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

    const { message, image, userRole, conversationHistory } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Role-specific system prompts
    const systemPrompt = buildRoleAwarePrompt(userRole);

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

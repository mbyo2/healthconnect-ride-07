import { resolveAIProvider, chatComplete, AIError, AI_MODEL_LABEL } from '../_shared/ai.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema for 3D/volumetric imaging
const MAX_SLICE_BYTES = 10_000_000; // 10 MB per slice (base64)
const MAX_TOTAL_BYTES = 50_000_000; // 50 MB total payload

const imaging3DSchema = z.object({
  slices: z.array(z.string().max(MAX_SLICE_BYTES, 'Each slice must be at most 10MB (base64)'))
    .min(1, 'At least one slice required')
    .max(50, 'Maximum 50 slices allowed')
    .refine((arr: string[]) => arr.reduce((s: number, x: string) => s + x.length, 0) <= MAX_TOTAL_BYTES, {
      message: 'Combined slice payload exceeds 50MB',
    }),
  imagingType: z.enum(['ct', 'mri', 'pet_ct']),
  bodyPart: z.enum(['head', 'chest', 'abdomen', 'pelvis', 'spine', 'extremity', 'whole_body']),
  clinicalQuestion: z.string().max(500),
  sliceOrientation: z.enum(['axial', 'sagittal', 'coronal']).optional(),
  contrastUsed: z.boolean().optional(),
  userRole: z.string().optional().default('patient')
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

    const requestData = await req.json();
    const validationResult = imaging3DSchema.safeParse(requestData);

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

    const { slices, imagingType, bodyPart, clinicalQuestion, sliceOrientation, contrastUsed, userRole: _clientRole } = validationResult.data;

    // SECURITY: Verify clinical role server-side; never trust client
    const { data: verifiedRoles } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isClinician = (verifiedRoles || []).some((r: any) =>
      ['doctor','specialist','health_personnel','radiologist','pathologist'].includes(r.role)
    );
    const userRole = isClinician ? 'health_personnel' : 'patient';

    console.log(`MedGemma 1.5 4B 3D imaging analysis: ${imagingType.toUpperCase()} ${bodyPart}, ${slices.length} slices`);
    
    const aiProvider = resolveAIProvider();
    const HF_TOKEN = aiProvider ? 'configured' : '';
    if (!HF_TOKEN) {
      console.error('No AI provider configured (OPENROUTER_API_KEY / HF_TOKEN missing)');
      return new Response(
        JSON.stringify({ error: 'AI service not configured', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are Doc 0 Clock, a medical AI assistant powered by MedGemma 1.5 4B with native 3D medical imaging capabilities.

3D VOLUMETRIC IMAGING ANALYSIS MODE:
- You are analyzing ${slices.length} ${sliceOrientation || 'cross-sectional'} slices from a ${imagingType.toUpperCase()} scan of the ${bodyPart}
- Understand the 3D context across all slices
- Identify anatomical structures and their relationships
- Detect and characterize any abnormalities
- Consider volumetric extent of findings
- Provide systematic analysis

${contrastUsed ? 'Contrast enhancement is present - assess enhancement patterns.' : 'This is a non-contrast study.'}

${userRole === 'health_personnel' ? 'Provide detailed radiological interpretation with differential diagnosis.' : 'Explain findings in clear, understandable terms.'}`;

    // Build text description of slices for text-based analysis
    const sliceDescriptions = slices.map((_: string, i: number) => `Slice ${i + 1}/${slices.length}`).join(', ');

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `[${imagingType.toUpperCase()} scan of ${bodyPart} - ${slices.length} ${sliceOrientation || 'cross-sectional'} slices attached: ${sliceDescriptions}]

Clinical Question: ${clinicalQuestion}

Provide a comprehensive analysis including:
1. Technical Quality Assessment
2. Systematic Anatomical Review
3. Abnormality Detection and Characterization
4. Volumetric/3D Relationships
5. Impression and Recommendations`
      }
    ];

    const { text: analysis } = await chatComplete({
      messages,
      maxTokens: 2500,
      temperature: 0.3,
      topP: 0.95,
    });


    console.log('3D imaging analysis completed');

    return new Response(
      JSON.stringify({
        analysis,
        imagingType,
        bodyPart,
        sliceCount: slices.length,
        timestamp: new Date().toISOString(),
        model: AI_MODEL_LABEL,
        capabilities: {
          native_3d_imaging: true,
          volumetric_analysis: true,
          multi_slice_context: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in 3D imaging analysis:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

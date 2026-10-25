import { AI_MODEL_LABEL, extractAIText, LOVABLE_ENDPOINT, LOVABLE_TEXT_MODEL } from '../_shared/ai.ts';
import { aiRateLimitResponse } from '../_shared/rate-limit.ts';
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

    const rateLimited = await aiRateLimitResponse(user.id, 'medgemma-3d-imaging', 10, corsHeaders);
    if (rateLimited) return rateLimited;

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
    
    // Honest scope (completeness pass 2026-10-25): this function reviews
    // individual 2D slices with a vision model. It is NOT a volumetric/3D
    // reconstruction - the pre-fix code discarded the slice bytes, sent a
    // text placeholder to a text model, and still claimed 'native 3D
    // imaging' in its response. Without the vision gateway we decline
    // plainly instead of fabricating a reading.
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('Vision gateway not configured (LOVABLE_API_KEY missing)');
      return new Response(
        JSON.stringify({ error: 'Scan review is not available - the vision service is not configured.', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Review a representative sample: first, last and evenly spaced
    // slices between, at most 6 images per request.
    const MAX_REVIEW = 6;
    const pickedIdx: number[] = [];
    if (slices.length <= MAX_REVIEW) {
      slices.forEach((_: string, i: number) => pickedIdx.push(i));
    } else {
      for (let k = 0; k < MAX_REVIEW; k++) pickedIdx.push(Math.round((k * (slices.length - 1)) / (MAX_REVIEW - 1)));
    }
    const reviewedSlices = pickedIdx.map((i) => slices[i]);

    const systemPrompt = `You are Doc' O Clock AI, assisting with a PRELIMINARY review of individual scan slices. You are shown ${reviewedSlices.length} of ${slices.length} ${sliceOrientation || 'cross-sectional'} slices from a ${imagingType.toUpperCase()} scan of the ${bodyPart}, in order.

HARD LIMITS - follow exactly:
- Describe only what is visible in the slices you were given.
- This is NOT a volumetric or 3D reconstruction. Do not invent measurements, volumes, or findings on slices you were not shown.
- Always state that this is a preliminary AI slice review, not a radiologist's report.

${contrastUsed ? 'Contrast enhancement is present - assess enhancement patterns.' : 'This is a non-contrast study.'}

${userRole === 'health_personnel' ? 'Provide a structured radiology-style review (per-slice findings, impression, recommendations).' : 'Explain findings in clear, understandable terms.'}`;

    const visionRes = await fetch(LOVABLE_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LOVABLE_TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Clinical Question: ${clinicalQuestion}\n\nReview the attached slices (they are slices ${pickedIdx.map((i) => i + 1).join(', ')} of ${slices.length}) and provide:\n1. Technical Quality Assessment\n2. Per-Slice Findings\n3. Overall Impression and Recommendations` },
              ...reviewedSlices.map((sl: string) => ({
                type: 'image_url',
                image_url: { url: sl.startsWith('data:') || sl.startsWith('http') ? sl : `data:image/jpeg;base64,${sl}` },
              })),
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });
    if (!visionRes.ok) {
      console.error('Vision gateway error:', visionRes.status);
      return new Response(
        JSON.stringify({ error: 'Scan review is temporarily unavailable. Please try again.', fallback: true }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const analysis = extractAIText(await visionRes.json()) || '';


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
          native_3d_imaging: false,
          volumetric_analysis: false,
          multi_slice_context: true,
          slice_review: true,
          slices_reviewed: reviewedSlices.length,
          slices_received: slices.length
        },
        method: 'Preliminary AI review of individual 2D slices - not a volumetric reconstruction and not a radiologist report.'
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

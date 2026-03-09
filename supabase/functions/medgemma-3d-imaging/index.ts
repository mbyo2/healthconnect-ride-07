import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema for 3D/volumetric imaging
const imaging3DSchema = z.object({
  slices: z.array(z.string()).min(1, 'At least one slice required').max(50, 'Maximum 50 slices allowed'), // base64 encoded images
  imagingType: z.enum(['ct', 'mri', 'pet_ct']),
  bodyPart: z.enum(['head', 'chest', 'abdomen', 'pelvis', 'spine', 'extremity', 'whole_body']),
  clinicalQuestion: z.string().max(500),
  sliceOrientation: z.enum(['axial', 'sagittal', 'coronal']).optional(),
  contrastUsed: z.boolean().optional(),
  userRole: z.string().optional().default('patient')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { slices, imagingType, bodyPart, clinicalQuestion, sliceOrientation, contrastUsed, userRole } = validationResult.data;

    console.log(`MedGemma 1.5 4B 3D imaging analysis: ${imagingType.toUpperCase()} ${bodyPart}, ${slices.length} slices`);
    
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'HF_TOKEN not configured', fallback: true }),
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

    // Build user content with all slices
    const userContent: any[] = [];
    
    // Add all slices with labels
    slices.forEach((slice, index) => {
      userContent.push({
        type: 'image',
        image: slice
      });
      userContent.push({
        type: 'text',
        text: `[Slice ${index + 1}/${slices.length}]`
      });
    });

    // Add clinical question
    userContent.push({
      type: 'text',
      text: `\nClinical Question: ${clinicalQuestion}\n\nProvide a comprehensive analysis including:
1. Technical Quality Assessment
2. Systematic Anatomical Review
3. Abnormality Detection and Characterization
4. Volumetric/3D Relationships
5. Impression and Recommendations`
    });

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ];

    const response = await fetch('https://api-inference.huggingface.co/models/google/medgemma-1.5-4b-it', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { messages },
        parameters: {
          max_new_tokens: 2500,
          temperature: 0.3,
          top_p: 0.95,
          return_full_text: false
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    let analysis: string;
    if (Array.isArray(data)) {
      analysis = data[0]?.generated_text || 'No analysis generated';
    } else {
      analysis = data.generated_text || data[0]?.generated_text || 'No analysis generated';
    }

    console.log('3D imaging analysis completed');

    return new Response(
      JSON.stringify({
        analysis,
        imagingType,
        bodyPart,
        sliceCount: slices.length,
        timestamp: new Date().toISOString(),
        model: 'medgemma-1.5-4b-it',
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

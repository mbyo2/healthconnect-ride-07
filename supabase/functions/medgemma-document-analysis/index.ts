import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema for lab report/document analysis
const documentAnalysisSchema = z.object({
  document: z.string().min(1, 'Document image required'), // base64 encoded image
  documentType: z.enum(['lab_report', 'prescription', 'radiology_report', 'pathology_report', 'discharge_summary']).optional().default('lab_report'),
  extractFields: z.array(z.string()).optional(), // Specific fields to extract
  userRole: z.string().optional().default('patient')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const validationResult = documentAnalysisSchema.safeParse(requestData);

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

    const { document, documentType, extractFields, userRole } = validationResult.data;

    console.log('MedGemma 1.5 4B document analysis request received');
    
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'HF_TOKEN not configured', fallback: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build extraction prompt based on document type
    let extractionPrompt = '';
    
    switch (documentType) {
      case 'lab_report':
        extractionPrompt = `Analyze this laboratory report and extract all test results in structured format.

For each test, provide:
- Test Name
- Result Value
- Unit of Measurement
- Reference Range (if available)
- Status (Normal/Abnormal/Critical)

${extractFields ? `Focus on these specific tests: ${extractFields.join(', ')}` : ''}

Format the response as a structured list.`;
        break;
        
      case 'prescription':
        extractionPrompt = `Extract all medication information from this prescription:

For each medication:
- Medication Name
- Dosage
- Frequency
- Duration
- Special Instructions
- Prescriber Information (if visible)`;
        break;
        
      case 'radiology_report':
        extractionPrompt = `Extract key findings from this radiology report:

1. Examination Type
2. Clinical History/Indication
3. Technique Used
4. Key Findings
5. Impression/Conclusion
6. Recommendations`;
        break;
        
      case 'pathology_report':
        extractionPrompt = `Extract pathology findings:

1. Specimen Type
2. Clinical Diagnosis
3. Gross Description
4. Microscopic Findings
5. Final Diagnosis
6. Additional Comments`;
        break;
        
      case 'discharge_summary':
        extractionPrompt = `Extract key information from this discharge summary:

1. Admission Date & Reason
2. Principal Diagnosis
3. Procedures Performed
4. Hospital Course Summary
5. Discharge Medications
6. Follow-up Instructions`;
        break;
    }

    const systemPrompt = `You are Doc 0 Clock, a medical AI assistant powered by MedGemma 1.5 4B with advanced document understanding capabilities.

DOCUMENT UNDERSTANDING MODE:
- Extract structured data accurately from medical documents
- Preserve medical terminology and units
- Flag any abnormal or critical values
- Organize information clearly
- If text is unclear, indicate uncertainty

${userRole === 'health_personnel' ? 'Provide clinical-grade extraction suitable for EHR integration.' : 'Present findings in clear, patient-friendly language while maintaining accuracy.'}`;

    // Format messages for API
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: document
          },
          {
            type: 'text',
            text: extractionPrompt
          }
        ]
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
          max_new_tokens: 2000,
          temperature: 0.2, // Very low for accurate extraction
          top_p: 0.9,
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
    
    let extractedData: string;
    if (Array.isArray(data)) {
      extractedData = data[0]?.generated_text || 'No data extracted';
    } else {
      extractedData = data.generated_text || data[0]?.generated_text || 'No data extracted';
    }

    console.log('Document analysis completed');

    return new Response(
      JSON.stringify({
        extractedData,
        documentType,
        timestamp: new Date().toISOString(),
        model: 'medgemma-1.5-4b-it',
        capabilities: {
          document_understanding: true,
          structured_extraction: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in document analysis:', error);

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

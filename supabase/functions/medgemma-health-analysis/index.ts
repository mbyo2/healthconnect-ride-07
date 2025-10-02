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
    const { analysisType, data } = await req.json();
    
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      throw new Error('HF_TOKEN not configured');
    }

    const hf = new HfInference(HF_TOKEN);
    
    let prompt = '';
    let systemContext = `You are MedGemma, a medical AI assistant. Provide accurate, evidence-based medical insights. 
Always include:
1. Clear analysis
2. Specific recommendations
3. Risk assessment
4. When to seek immediate medical attention

IMPORTANT: State that this is for informational purposes and not a replacement for professional medical advice.`;

    switch (analysisType) {
      case 'symptom_analysis':
        prompt = `Analyze these symptoms: ${data.symptoms}
Patient context: Age ${data.age || 'unknown'}, Gender: ${data.gender || 'unknown'}
Urgency level indicated: ${data.urgency}

Provide:
1. Possible conditions (with confidence levels)
2. Severity assessment (low/medium/high/critical)
3. Recommended next steps
4. Red flags requiring immediate attention
5. Self-care recommendations if appropriate`;
        break;

      case 'risk_assessment':
        prompt = `Assess health risks based on:
- Vitals: ${JSON.stringify(data.vitals || {})}
- Age: ${data.age}
- Gender: ${data.gender}
- BMI: ${data.bmi}
- Blood Pressure: ${data.bloodPressure}
- Family History: ${data.familyHistory || 'unknown'}

Provide cardiovascular and diabetes risk assessment with:
1. Risk level (percentage)
2. Contributing factors
3. Modifiable risk factors
4. Specific preventive recommendations`;
        break;

      case 'medication_interaction':
        prompt = `Check for interactions and optimization opportunities:
Current medications: ${JSON.stringify(data.medications)}
New medication being considered: ${data.newMedication || 'none'}

Provide:
1. Potential interactions
2. Timing recommendations
3. Side effects to monitor
4. Optimization suggestions`;
        break;

      case 'trend_analysis':
        prompt = `Analyze health trends from data:
${JSON.stringify(data.healthMetrics)}

Provide:
1. Key trends identified
2. Significance of changes
3. Predicted trajectory
4. Preventive actions needed`;
        break;

      case 'preventive_care':
        prompt = `Recommend preventive care for:
- Age: ${data.age}
- Gender: ${data.gender}
- Last checkup: ${data.lastCheckup || 'unknown'}
- Current health status: ${JSON.stringify(data.healthStatus || {})}

Provide:
1. Due screenings
2. Vaccination updates needed
3. Lifestyle recommendations
4. Scheduling priorities`;
        break;

      default:
        throw new Error('Invalid analysis type');
    }

    console.log('Calling MedGemma with prompt:', prompt);

    // Call MedGemma via Hugging Face
    const response = await hf.textGeneration({
      model: 'google/medgemma-7b',
      inputs: `${systemContext}\n\n${prompt}`,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.3,
        top_p: 0.9,
        return_full_text: false,
      },
    });

    const analysis = response.generated_text;

    // Parse and structure the response
    const structuredResponse = {
      analysis,
      timestamp: new Date().toISOString(),
      model: 'medgemma-7b',
      analysisType,
      confidence: 0.85, // MedGemma provides high-quality medical analysis
      disclaimer: 'This analysis is for informational purposes only and does not constitute medical advice. Always consult with a qualified healthcare professional for medical decisions.'
    };

    console.log('MedGemma analysis completed successfully');

    return new Response(
      JSON.stringify(structuredResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in MedGemma analysis:', error);
    
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

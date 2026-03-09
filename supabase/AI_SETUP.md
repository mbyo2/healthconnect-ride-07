# AI Diagnostic Assistant Setup Guide

## Overview

The Doc 0 Clock AI Diagnostic Assistant leverages **MedGemma 1.5 4B** - Google DeepMind's state-of-the-art multimodal medical AI model with advanced 3D imaging and longitudinal analysis capabilities.

### MedGemma 1.5 4B Capabilities

- ✅ **Native 3D Medical Imaging**: CT and MRI volumetric analysis
- ✅ **Longitudinal Tracking**: Compare sequential scans to track disease progression
- ✅ **Multimodal Input**: Text + Images (up to 10 images simultaneously)
- ✅ **Medical Document Understanding**: Extract structured data from lab reports
- ✅ **Anatomical Localization**: Bounding box detection on chest X-rays
- ✅ **Specialized Modalities**: Chest X-rays, dermatology, ophthalmology, histopathology
- ✅ **Long Context**: Up to 128K tokens
- ✅ **Privacy-First**: Can run offline on consumer hardware

### Edge Functions Architecture

The system provides specialized edge functions for different medical AI use cases:

1. **`medgemma-chat`** - Primary multimodal conversational AI with image support
2. **`medgemma-document-analysis`** - Lab report and medical document extraction
3. **`medgemma-3d-imaging`** - 3D CT/MRI volumetric analysis
4. **`doc-chat`** - Fallback using Lovable AI with Gemini 2.5 Flash
5. **`med-ai`** - Final fallback using OpenAI GPT-3.5-turbo

## Architecture

```mermaid
graph TD
    A[User Message] --> B{Try medgemma-chat}
    B -->|Success| C[Return Response]
    B -->|Fail| D{Try doc-chat}
    D -->|Success| C
    D -->|Fail| E{Try med-ai}
    E -->|Success| C
    E -->|Fail| F[Error to User]
```

## Edge Functions

### 1. medgemma-chat (Primary - Multimodal)

**Purpose**: Advanced multimodal medical AI with image understanding
**Model**: `google/medgemma-1.5-4b-it` via Hugging Face
**Capabilities**:
- 🖼️ **Multimodal Input**: Text + up to 10 images simultaneously
- 📊 **Longitudinal Analysis**: Compare multiple scans over time
- 🔍 **Image Analysis**: Chest X-rays, dermatology, ophthalmology, histopathology
- 💊 **Medical Guidance**: Symptom analysis, medication info, emergency detection
- 🏥 **Role-Aware**: Adapts responses for doctors, nurses, pharmacists, and patients

**Required Environment Variable**:
```
HF_TOKEN=your_hugging_face_token
```

**How to get HF_TOKEN**:
1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in
3. Go to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Request access to `google/medgemma-1.5-4b-it` model (if gated)
6. Copy the token

**Usage Example**:
```typescript
const { data, error } = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: 'Analyze these chest X-rays',
    images: [base64Image1, base64Image2], // Sequential scans
    analysisType: 'longitudinal', // 'general' | 'longitudinal' | 'anatomical_localization'
    userRole: 'doctor',
    conversationHistory: []
  }
});
```

### 2. medgemma-document-analysis (Document Understanding)

**Purpose**: Extract structured data from medical documents and lab reports
**Model**: `google/medgemma-1.5-4b-it` via Hugging Face
**Capabilities**:
- 📄 **Lab Report Parsing**: Extract test names, values, units, reference ranges
- 💊 **Prescription Reading**: Medication names, dosages, instructions
- 🏥 **Report Analysis**: Radiology, pathology, discharge summaries
- ✅ **Abnormality Flagging**: Identify critical or abnormal values
- 📊 **Structured Output**: Organized, EHR-ready data

**Required Environment Variable**:
```
HF_TOKEN=your_hugging_face_token
```

**Usage Example**:
```typescript
const { data, error } = await supabase.functions.invoke('medgemma-document-analysis', {
  body: {
    document: base64ImageOfLabReport,
    documentType: 'lab_report', // 'lab_report' | 'prescription' | 'radiology_report' | 'pathology_report' | 'discharge_summary'
    extractFields: ['CBC', 'Liver Function'], // Optional: specific tests to focus on
    userRole: 'doctor'
  }
});
```

### 3. medgemma-3d-imaging (3D Volumetric Analysis)

**Purpose**: Native 3D CT/MRI analysis with volumetric understanding
**Model**: `google/medgemma-1.5-4b-it` via Hugging Face
**Capabilities**:
- 🧠 **3D Context Understanding**: Analyzes multiple slices together
- 🔬 **Volumetric Analysis**: Organ segmentation, lesion detection
- 📐 **Spatial Relationships**: Understanding anatomical context
- 🎯 **Clinical Questions**: Targeted analysis based on clinical indication
- 📋 **Systematic Reporting**: Structured radiology-style reports

**Required Environment Variable**:
```
HF_TOKEN=your_hugging_face_token
```

**Usage Example**:
```typescript
const { data, error } = await supabase.functions.invoke('medgemma-3d-imaging', {
  body: {
    slices: [base64Slice1, base64Slice2, base64Slice3], // Up to 50 slices
    imagingType: 'ct', // 'ct' | 'mri' | 'pet_ct'
    bodyPart: 'chest', // 'head' | 'chest' | 'abdomen' | 'pelvis' | 'spine' | 'extremity' | 'whole_body'
    clinicalQuestion: 'Rule out pulmonary embolism',
    sliceOrientation: 'axial', // 'axial' | 'sagittal' | 'coronal'
    contrastUsed: true,
    userRole: 'radiologist'
  }
});
```

### 4. doc-chat (Fallback - Lovable AI)

**Purpose**: Vision-capable AI for medical image analysis
**Model**: `google/gemini-2.5-flash` via Lovable AI Gateway
**Capabilities**:
- All medgemma-chat capabilities
- Medical image analysis (X-rays, lab results, scans)
- Multi-modal conversations
- Diagnosis history tracking

**Required Environment Variable**:
```
LOVABLE_API_KEY=your_lovable_api_key
```

**How to get LOVABLE_API_KEY**:
1. Contact Lovable support or check your Lovable project dashboard
2. Navigate to API settings
3. Generate or copy your API key

### 5. med-ai (Final Fallback - OpenAI)

**Purpose**: Reliable fallback using OpenAI
**Model**: `gpt-3.5-turbo`
**Capabilities**:
- General medical information
- Symptom analysis
- Health guidance
- Emergency detection

**Required Environment Variable**:
```
OPENAI_API_KEY=your_openai_api_key
```

**How to get OPENAI_API_KEY**:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (you won't be able to see it again)

## Deployment Steps

### Step 1: Configure Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add the following environment variables:

```env
# Primary AI (Hugging Face MedGemma)
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Secondary AI (Lovable AI Gateway)
LOVABLE_API_KEY=lovable_xxxxxxxxxxxxxxxxxxxxx

# Final Fallback (OpenAI)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Note**: You can configure just one or all three. The system will automatically fall back to the next available service.

### Step 2: Deploy Edge Functions

Deploy all Edge Functions to Supabase:

```bash
# Deploy MedGemma 1.5 4B functions
supabase functions deploy medgemma-chat
supabase functions deploy medgemma-document-analysis
supabase functions deploy medgemma-3d-imaging

# Deploy fallback functions
supabase functions deploy doc-chat
supabase functions deploy med-ai
```

### Step 3: Verify Deployment

Test each function individually:

```bash
# Test text-only chat
supabase functions invoke medgemma-chat --body '{"message":"What are the symptoms of pneumonia?","userRole":"patient"}'

# Test multimodal analysis (with base64 image)
supabase functions invoke medgemma-chat --body '{"message":"Analyze this chest X-ray","images":["data:image/jpeg;base64,..."],"analysisType":"general"}'

# Test document analysis
supabase functions invoke medgemma-document-analysis --body '{"document":"data:image/jpeg;base64,...","documentType":"lab_report"}'

# Test 3D imaging
supabase functions invoke medgemma-3d-imaging --body '{"slices":["data:image/jpeg;base64,..."],"imagingType":"ct","bodyPart":"chest","clinicalQuestion":"Assess for pneumonia"}'

# Test fallback functions
supabase functions invoke doc-chat --body '{"message":"Hello, I have a headache"}'
supabase functions invoke med-ai --body '{"message":"Hello, I have a headache"}'
```

## Testing the Fallback System

### Scenario 1: All Services Available
- User sends message
- `medgemma-chat` responds successfully
- Response time: ~2-3 seconds

### Scenario 2: Primary Fails
- User sends message
- `medgemma-chat` fails (HF_TOKEN missing or quota exceeded)
- System automatically tries `doc-chat`
- `doc-chat` responds successfully
- Response time: ~3-4 seconds

### Scenario 3: Primary and Secondary Fail
- User sends message
- `medgemma-chat` fails
- `doc-chat` fails (LOVABLE_API_KEY missing)
- System automatically tries `med-ai`
- `med-ai` responds successfully
- Response time: ~4-5 seconds

### Scenario 4: All Services Fail
- User receives error message
- Error is logged to console
- User can retry

## Cost Considerations

### Hugging Face (medgemma-chat)
- **Free Tier**: 1,000 requests/month
- **Pro**: $9/month for 10,000 requests
- **Enterprise**: Custom pricing

### Lovable AI (doc-chat)
- Check your Lovable project pricing
- Typically included in Lovable subscription

### OpenAI (med-ai)
- **GPT-3.5-turbo**: $0.0015 per 1K input tokens, $0.002 per 1K output tokens
- Approximately $0.002 per conversation turn
- Very cost-effective for fallback usage

## Recommended Configuration

### For Development
Configure only `LOVABLE_API_KEY` or `OPENAI_API_KEY` for simplicity.

### For Production
Configure all three for maximum reliability:
1. **HF_TOKEN** - Best for medical accuracy
2. **LOVABLE_API_KEY** - Best for image analysis
3. **OPENAI_API_KEY** - Most reliable fallback

## Monitoring

### Check Function Logs

In Supabase:
1. Go to **Edge Functions**
2. Select a function
3. View **Logs** tab

Look for:
- `"Trying medgemma-chat..."` - Primary attempt
- `"medgemma-chat failed, trying doc-chat..."` - Fallback to secondary
- `"doc-chat failed, trying med-ai..."` - Fallback to final
- `"All AI functions failed"` - Complete failure

### Analytics

The `doc-chat` function automatically saves diagnosis history to the `ai_diagnosis_history` table for authenticated users.

Query diagnosis history:
```sql
SELECT * FROM ai_diagnosis_history
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

## Troubleshooting

### Error: "HF_TOKEN not configured"
- Add `HF_TOKEN` to Supabase Edge Functions environment variables
- Or remove the try-catch for medgemma-chat if you don't want to use it

### Error: "LOVABLE_API_KEY not configured"
- Add `LOVABLE_API_KEY` to Supabase Edge Functions environment variables
- Or ensure the fallback to med-ai is working

### Error: "OPENAI_API_KEY not configured"
- Add `OPENAI_API_KEY` to Supabase Edge Functions environment variables
- This is the final fallback, so all services will fail without it

### Error: "Rate limit exceeded"
- Hugging Face free tier has limits
- Upgrade to Pro or configure other fallbacks
- OpenAI has generous rate limits

### Error: "Invalid response from AI"
- Check function logs for detailed error
- Verify API keys are correct
- Check API service status

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** (every 90 days)
4. **Monitor usage** to detect unauthorized access
5. **Set up billing alerts** to avoid unexpected charges

## Feature Enhancements

### Medical Image Analysis (doc-chat only)

The `doc-chat` function supports medical image analysis:

```typescript
// Frontend code
const response = await supabase.functions.invoke('doc-chat', {
  body: {
    message: 'Please analyze this X-ray',
    image: base64ImageData, // base64 encoded image
    conversationHistory: []
  }
});
```

### Conversation History

All functions support conversation history for context:

```typescript
const response = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: 'What about fever?',
    conversationHistory: [
      { role: 'user', content: 'I have a headache' },
      { role: 'assistant', content: 'I understand you have a headache...' }
    ]
  }
});
```

## Next Steps

1. ✅ Deploy all three Edge Functions
2. ✅ Configure environment variables
3. ✅ Test each function individually
4. ✅ Test the fallback chain
5. ✅ Monitor logs and usage
6. ✅ Set up billing alerts
7. ✅ Enable diagnosis history tracking

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify environment variables are set
3. Test API keys independently
4. Review this documentation
5. Check API service status pages

---

**Last Updated**: 2025-11-23
**Version**: 1.0

# MedGemma 1.5 4B Integration - Quick Start

## 🚀 What's New

Your Doc 0 Clock application now features **MedGemma 1.5 4B** - Google DeepMind's state-of-the-art multimodal medical AI with advanced capabilities:

- ✅ **Multiple Image Analysis** - Upload up to 10 medical images simultaneously
- ✅ **Longitudinal Tracking** - Compare scans over time to track disease progression
- ✅ **Document Extraction** - Extract structured data from lab reports and prescriptions
- ✅ **3D Imaging** - Native CT/MRI volumetric analysis (up to 50 slices)
- ✅ **Anatomical Localization** - Identify and locate features on chest X-rays

## 🎯 Quick Access

### AI Chat (Enhanced)
Navigate to: **AI Diagnostics → AI Chat**

**New Features:**
- Upload multiple images (max 10) by clicking the paperclip icon
- Select multiple files at once
- Choose analysis type when you have multiple images:
  - **General Analysis** - Standard interpretation
  - **Longitudinal Comparison** - Track changes over time
  - **Anatomical Localization** - Identify and locate findings
  - **Document Extraction** - Extract structured data

### Document Analysis (New)
Navigate to: **AI Diagnostics → Documents**

**Upload lab reports, prescriptions, or medical documents for automatic data extraction:**
- Test names, values, units, reference ranges
- Medication names, dosages, instructions
- Report findings and impressions

## 💡 Usage Examples

### 1. Compare Two Chest X-Rays
1. Go to **AI Diagnostics → AI Chat**
2. Click the paperclip icon and select 2 X-rays (baseline and follow-up)
3. Analysis type will show "Longitudinal Comparison"
4. Type: "Compare these two chest X-rays taken 6 weeks apart. Has the condition improved?"
5. Send and receive AI analysis

### 2. Extract Lab Report Data
1. Go to **AI Diagnostics → Documents**
2. Select document type: "Lab Report"
3. Upload a photo of your lab report
4. Click "Extract Data"
5. View structured results (test names, values, units, status)

### 3. Single Image Analysis
1. Go to **AI Diagnostics → AI Chat**
2. Upload one medical image
3. Ask: "What abnormalities do you see in this X-ray?"
4. Get detailed AI analysis

## 🔧 For Developers

### Easy-to-Use Functions
Import and use MedGemma functions anywhere in your app:

```typescript
import { callMedGemmaChat, analyzeMedicalDocument, fileToBase64 } from '@/utils/medgemma';

// Example 1: Analyze chest X-ray
const imageBase64 = await fileToBase64(imageFile);
const response = await callMedGemmaChat({
  message: 'Analyze this chest X-ray',
  images: [imageBase64],
  analysisType: 'general',
  userRole: 'doctor'
});
console.log(response.reply);

// Example 2: Extract lab report data
const documentBase64 = await fileToBase64(labReportImage);
const result = await analyzeMedicalDocument({
  document: documentBase64,
  documentType: 'lab_report',
  userRole: 'doctor'
});
console.log(result.extractedData);
```

### Available Edge Functions
- `medgemma-chat` - Multimodal chat with image support
- `medgemma-document-analysis` - Document extraction
- `medgemma-3d-imaging` - 3D CT/MRI analysis

### Configuration
All edge functions require the `HF_TOKEN` environment variable to be set in Supabase:
```bash
supabase secrets set HF_TOKEN=hf_xxxxxxxxxxxxx
```

## 📚 Full Documentation
- [Complete Integration Guide](../docs/MEDGEMMA_INTEGRATION_GUIDE.md)
- [AI Setup Guide](../supabase/AI_SETUP.md)
- [MedGemma 1.5 Model Card](https://huggingface.co/google/medgemma-1.5-4b-it)

## ⚠️ Important Notes

1. **Image Limits**: Max 10 images per request, 5MB each
2. **HuggingFace Rate Limits**: Free tier has limits, consider upgrading for production
3. **Privacy**: Images are processed in-request only, no data retention
4. **Medical Disclaimer**: Always for informational purposes, not a replacement for professional advice

## 🎉 Key Improvements Over Previous Version

- **10x More Images**: Was 1 image, now 10 images
- **Longitudinal Analysis**: Compare scans over time (NEW)
- **Document Understanding**: Extract structured data (NEW)
- **3D Imaging Support**: Native CT/MRI analysis (NEW)
- **Better UI**: Grid preview, analysis type selector, improved UX

## 🚀 Coming Soon
- 3D Imaging UI component (upload multiple CT/MRI slices)
- Batch document processing
- Export extracted data to CSV/JSON
- Integration with medical records

---

**Powered by MedGemma 1.5 4B** | [View Edge Function Logs](https://supabase.com/dashboard/project/tthzcijscedgxjfnfnky/functions)
